import crypto from "crypto";

import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

import { Payment } from "../models/payment.model.js";
import { Booking } from "../models/booking.model.js";
import { Refund } from "../models/refund.model.js";
import { Transaction } from "../models/transaction.model.js";
import { PaymentWebhookEvent } from "../models/paymentWebhookEvent.model.js";


const verifyWebhookSignature = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    throw new ApiError(
      500,
      "Razorpay webhook secret is not configured"
    );
  }

  if (!signature) {
    throw new ApiError(
      400,
      "Razorpay webhook signature is missing"
    );
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    throw new ApiError(
      400,
      "Invalid Razorpay webhook signature"
    );
  }

  const isValid = crypto.timingSafeEqual(
    expectedBuffer,
    receivedBuffer
  );

  if (!isValid) {
    throw new ApiError(
      400,
      "Invalid Razorpay webhook signature"
    );
  }

  return true;
};


const handlePaymentCaptured = async (payload) => {
  const paymentEntity =
    payload?.payment?.entity;

  if (!paymentEntity) {
    return;
  }

  const razorpayOrderId =
    paymentEntity.order_id;

  const razorpayPaymentId =
    paymentEntity.id;

  if (!razorpayOrderId || !razorpayPaymentId) {
    return;
  }

  const payment = await Payment.findOne({
    razorpayOrderId,
  });

  if (!payment) {
    return;
  }

  if (payment.status === "PAID") {
    return;
  }

  payment.razorpayPaymentId = razorpayPaymentId;

  payment.status = "PAID";

  payment.paidAt = new Date();

  payment.method =
    paymentEntity.method || payment.method;

  await payment.save();

  const booking = await Booking.findById(
    payment.booking
  );

  if (!booking) {
    return;
  }

  if (
    booking.paymentStatus !== "REFUNDED" &&
    booking.paymentStatus !== "PARTIALLY_REFUNDED"
  ) {
    booking.paymentStatus = "PAID";

    await booking.save();
  }

  const existingTransaction =
    await Transaction.findOne({
      payment: payment._id,
      type: "PAYMENT",
    });

  if (!existingTransaction) {
    await Transaction.create({
      user: payment.user,
      provider: payment.provider,
      booking: payment.booking,
      payment: payment._id,
      type: "PAYMENT",
      amount: payment.amount,
      status: "COMPLETED",
      description: "Payment captured through Razorpay",
      referenceId: razorpayPaymentId,
    });
  }
};


const handlePaymentFailed = async (payload) => {
  const paymentEntity =
    payload?.payment?.entity;

  if (!paymentEntity) {
    return;
  }

  const razorpayOrderId =
    paymentEntity.order_id;

  if (!razorpayOrderId) {
    return;
  }

  const payment = await Payment.findOne({
    razorpayOrderId,
  });

  if (!payment) {
    return;
  }

  if (
    payment.status === "PAID" ||
    payment.status === "REFUNDED" ||
    payment.status === "PARTIALLY_REFUNDED"
  ) {
    return;
  }

  payment.status = "FAILED";

  payment.failureReason =
    paymentEntity.error_description ||
    paymentEntity.error_reason ||
    "Payment failed";

  await payment.save();

  const booking = await Booking.findById(
    payment.booking
  );

  if (!booking) {
    return;
  }

  if (booking.paymentStatus !== "PAID") {
    booking.paymentStatus = "FAILED";

    await booking.save();
  }

  await Transaction.findOneAndUpdate(
    {
      payment: payment._id,
      type: "PAYMENT",
    },
    {
      user: payment.user,
      provider: payment.provider,
      booking: payment.booking,
      payment: payment._id,
      type: "PAYMENT",
      amount: payment.amount,
      status: "FAILED",
      description: "Payment failed through Razorpay",
      referenceId: paymentEntity.id,
    },
    {
      upsert: true,
      new: true,
    }
  );
};


const handleRefundProcessed = async (payload) => {
  const refundEntity =
    payload?.refund?.entity;

  if (!refundEntity) {
    return;
  }

  const razorpayRefundId =
    refundEntity.id;

  const razorpayPaymentId =
    refundEntity.payment_id;

  if (!razorpayRefundId || !razorpayPaymentId) {
    return;
  }

  const refund = await Refund.findOne({
    $or: [
      {
        razorpayRefundId,
      },
      {
        payment: {
          $in: await Payment.find({
            razorpayPaymentId,
          }).distinct("_id"),
        },
      },
    ],
  });

  if (!refund) {
    return;
  }

  const payment = await Payment.findById(
    refund.payment
  );

  if (!payment) {
    return;
  }

  refund.razorpayRefundId =
    razorpayRefundId;

  refund.status = "COMPLETED";

  refund.processedAt = new Date();

  refund.failureReason = "";

  await refund.save();

  const refundAmount =
    Number(refund.amount);

  const paymentAmount =
    Number(payment.amount);

  if (refundAmount >= paymentAmount) {
    payment.status = "REFUNDED";
  } else {
    payment.status = "PARTIALLY_REFUNDED";
  }

  await payment.save();

  const booking = await Booking.findById(
    refund.booking
  );

  if (booking) {
    booking.paymentStatus =
      payment.status;

    await booking.save();
  }

  await Transaction.findOneAndUpdate(
    {
      payment: payment._id,
      type: "REFUND",
      referenceId: razorpayRefundId,
    },
    {
      user: payment.user,
      provider: payment.provider,
      booking: payment.booking,
      payment: payment._id,
      type: "REFUND",
      amount: refundAmount,
      status: "COMPLETED",
      description: "Refund processed through Razorpay",
      referenceId: razorpayRefundId,
    },
    {
      upsert: true,
      new: true,
    }
  );
};


const handleRefundFailed = async (payload) => {
  const refundEntity =
    payload?.refund?.entity;

  if (!refundEntity) {
    return;
  }

  const razorpayRefundId =
    refundEntity.id;

  const razorpayPaymentId =
    refundEntity.payment_id;

  if (!razorpayRefundId || !razorpayPaymentId) {
    return;
  }

  const payment = await Payment.findOne({
    razorpayPaymentId,
  });

  if (!payment) {
    return;
  }

  const refund = await Refund.findOne({
    payment: payment._id,
    status: {
      $in: ["REQUESTED", "PROCESSING"],
    },
  });

  if (!refund) {
    return;
  }

  refund.status = "FAILED";

  refund.failureReason =
    refundEntity.error_description ||
    refundEntity.error_reason ||
    "Razorpay refund failed";

  await refund.save();

  await Transaction.findOneAndUpdate(
    {
      payment: payment._id,
      type: "REFUND",
      referenceId: razorpayRefundId,
    },
    {
      user: payment.user,
      provider: payment.provider,
      booking: payment.booking,
      payment: payment._id,
      type: "REFUND",
      amount: refund.amount,
      status: "FAILED",
      description: "Refund failed through Razorpay",
      referenceId: razorpayRefundId,
    },
    {
      upsert: true,
      new: true,
    }
  );
};


export const paymentWebhook = asyncHandler(
  async (req, res) => {
    if (!Buffer.isBuffer(req.body)) {
      throw new ApiError(
        400,
        "Webhook body must be a raw Buffer"
      );
    }

    const signature =
      req.headers["x-razorpay-signature"];

    const eventId =
      req.headers["x-razorpay-event-id"];

    if (!eventId) {
      throw new ApiError(
        400,
        "Razorpay webhook event ID is missing"
      );
    }

    verifyWebhookSignature(
      req.body,
      signature
    );

    let webhookData;

    try {
      webhookData = JSON.parse(
        req.body.toString("utf8")
      );
    } catch (error) {
      throw new ApiError(
        400,
        "Invalid webhook JSON payload"
      );
    }

    const eventName =
      webhookData?.event;

    if (!eventName) {
      throw new ApiError(
        400,
        "Webhook event is missing"
      );
    }

    const existingEvent =
      await PaymentWebhookEvent.findOne({
        eventId,
      });

    if (existingEvent) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            duplicate: true,
          },
          "Webhook already processed"
        )
      );
    }

    try {
      await PaymentWebhookEvent.create({
        eventId,
        event: eventName,
      });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(200).json(
          new ApiResponse(
            200,
            {
              duplicate: true,
            },
            "Webhook already processed"
          )
        );
      }

      throw error;
    }

    switch (eventName) {
      case "payment.captured":
        await handlePaymentCaptured(
          webhookData.payload
        );
        break;

      case "payment.failed":
        await handlePaymentFailed(
          webhookData.payload
        );
        break;

      case "refund.processed":
        await handleRefundProcessed(
          webhookData.payload
        );
        break;

      case "refund.failed":
        await handleRefundFailed(
          webhookData.payload
        );
        break;

      default:
        break;
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          event: eventName,
          eventId,
        },
        "Webhook processed successfully"
      )
    );
  }
);