import crypto from "crypto";
import mongoose from "mongoose";

import { Payment } from "../models/payment.model.js";
import { Booking } from "../models/booking.model.js";
import { Transaction } from "../models/transaction.model.js";
import { Provider } from "../models/provider.model.js";
import { Notification } from "../models/notification.model.js";
import { emitToUser } from "../socket.js";

import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import getRazorpay from "../utils/razorpay.js";

const createPaymentOrder = asyncHandler(async (req, res) => {
    const razorpay = getRazorpay();

    if (!razorpay) {
        throw new ApiError(
            503,
            "Payment service is currently unavailable"
        );
    }

    const userId = req.user._id;
    const { bookingId } = req.body;

    if (!mongoose.isValidObjectId(bookingId)) {
        throw new ApiError(
            400,
            "Invalid booking ID"
        );
    }

    const booking = await Booking.findOne({
        _id: bookingId,
        user: userId,
    });

    if (!booking) {
        throw new ApiError(
            404,
            "Booking not found"
        );
    }

    if (booking.bookingStatus === "PENDING") {
        throw new ApiError(
            400,
            "Please wait for the service provider to accept your booking request before making payment."
        );
    }

    if (booking.bookingStatus !== "ACCEPTED") {
        throw new ApiError(
            400,
            `Payment is only allowed for accepted bookings. Current status: ${booking.bookingStatus}`
        );
    }

    if (
        booking.paymentStatus === "PAID"
    ) {
        throw new ApiError(
            400,
            "Booking is already paid"
        );
    }

    if (
        booking.paymentStatus === "REFUNDED" ||
        booking.paymentStatus === "PARTIALLY_REFUNDED"
    ) {
        throw new ApiError(
            400,
            "Booking has already been refunded"
        );
    }

    const amount = Number(
        booking.totalAmount
    );

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        throw new ApiError(
            400,
            "Invalid booking amount"
        );
    }

    const amountInPaise = Math.round(
        amount * 100
    );

    let payment = await Payment.findOne({
        booking: booking._id,
        user: userId,
    });

    if (
        payment &&
        payment.status === "PAID"
    ) {
        throw new ApiError(
            400,
            "Booking is already paid"
        );
    }

    if (
        payment &&
        payment.status === "PENDING" &&
        payment.razorpayOrderId
    ) {
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    paymentId: payment._id,
                    razorpayOrderId:
                        payment.razorpayOrderId,
                    amount: amountInPaise,
                    currency: payment.currency,
                    key:
                        process.env
                            .RAZORPAY_KEY_ID,
                },
                "Payment order already exists"
            )
        );
    }

    let order;
    try {
        order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: "INR",
            receipt:
                booking.bookingNumber ||
                `booking_${booking._id}`,
            notes: {
                bookingId:
                    booking._id.toString(),
                userId:
                    userId.toString(),
            },
        });
    } catch (razorpayErr) {
        console.error("Razorpay order creation failed:", razorpayErr?.error || razorpayErr?.message || razorpayErr);
        throw new ApiError(
            502,
            `Payment gateway error: ${razorpayErr?.error?.description || razorpayErr?.message || "Unable to create payment order. Please try again."}`
        );
    }

    if (!order?.id) {
        throw new ApiError(
            502,
            "Unable to create Razorpay order — no order ID returned"
        );
    }

    const updatedPayment = await Payment.findOneAndUpdate(
        { booking: booking._id },
        {
            $set: {
                user: userId,
                provider: booking.provider,
                razorpayOrderId: order.id,
                amount,
                currency: "INR",
                status: "PENDING",
                paidAt: null,
                failureReason: "",
            },
            $unset: {
                razorpayPaymentId: 1,
                razorpaySignature: 1,
            },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                paymentId: updatedPayment._id,
                razorpayOrderId: order.id,
                amount: order.amount,
                currency: order.currency || "INR",
                key:
                    process.env
                        .RAZORPAY_KEY_ID,
            },
            "Payment order created successfully"
        )
    );
});

const verifyPayment = asyncHandler(async (req, res) => {
    const razorpay = getRazorpay();

    if (!razorpay) {
        throw new ApiError(
            503,
            "Payment service is currently unavailable"
        );
    }

    const userId = req.user._id;

    const {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
    } = req.body;

    if (
        !razorpayOrderId ||
        !razorpayPaymentId ||
        !razorpaySignature
    ) {
        throw new ApiError(
            400,
            "Payment verification details are required"
        );
    }

    const payment =
        await Payment.findOne({
            razorpayOrderId,
            user: userId,
        }).select(
            "+razorpaySignature"
        );

    if (!payment) {
        throw new ApiError(
            404,
            "Payment record not found"
        );
    }

    if (payment.status === "PAID") {
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    paymentId:
                        payment._id,
                    bookingId:
                        payment.booking,
                    paymentStatus:
                        payment.status,
                },
                "Payment already verified"
            )
        );
    }

    const signaturePayload =
        `${razorpayOrderId}|${razorpayPaymentId}`;

    const expectedSignature =
        crypto
            .createHmac(
                "sha256",
                process.env
                    .RAZORPAY_KEY_SECRET
            )
            .update(signaturePayload)
            .digest("hex");

    const expectedBuffer =
        Buffer.from(
            expectedSignature,
            "utf8"
        );

    const receivedBuffer =
        Buffer.from(
            razorpaySignature,
            "utf8"
        );

    const isSignatureValid =
        expectedBuffer.length ===
            receivedBuffer.length &&
        crypto.timingSafeEqual(
            expectedBuffer,
            receivedBuffer
        );

    if (!isSignatureValid) {
        payment.status = "FAILED";
        payment.failureReason =
            "Invalid payment signature";

        await payment.save();

        throw new ApiError(
            400,
            "Invalid payment signature"
        );
    }

    const razorpayPayment =
        await razorpay.payments.fetch(
            razorpayPaymentId
        );

    if (!razorpayPayment) {
        throw new ApiError(
            400,
            "Unable to verify payment with Razorpay"
        );
    }

    if (
        razorpayPayment.order_id !==
        razorpayOrderId
    ) {
        throw new ApiError(
            400,
            "Payment does not belong to this order"
        );
    }

    const expectedAmount =
        Math.round(
            payment.amount * 100
        );

    if (
        Number(razorpayPayment.amount) !==
        expectedAmount
    ) {
        payment.status = "FAILED";
        payment.failureReason =
            "Payment amount mismatch";

        await payment.save();

        throw new ApiError(
            400,
            "Payment amount mismatch"
        );
    }

    if (
        razorpayPayment.currency !==
        payment.currency
    ) {
        payment.status = "FAILED";
        payment.failureReason =
            "Payment currency mismatch";

        await payment.save();

        throw new ApiError(
            400,
            "Payment currency mismatch"
        );
    }

    if (
        razorpayPayment.status !==
        "captured"
    ) {
        payment.status = "FAILED";
        payment.failureReason =
            `Payment status: ${razorpayPayment.status}`;

        await payment.save();

        throw new ApiError(
            400,
            `Payment is not captured. Current status: ${razorpayPayment.status}`
        );
    }

    const session =
        await mongoose.startSession();

    try {
        session.startTransaction();

        const updatedPayment =
            await Payment.findOneAndUpdate(
                {
                    _id: payment._id,
                    status: {
                        $ne: "PAID",
                    },
                },
                {
                    $set: {
                        razorpayPaymentId,
                        razorpaySignature,
                        status: "PAID",
                        method:
                            razorpayPayment.method,
                        paidAt: new Date(),
                        failureReason:
                            undefined,
                    },
                },
                {
                    new: true,
                    session,
                }
            );

        if (!updatedPayment) {
            await session.abortTransaction();

            const existingPayment =
                await Payment.findById(
                    payment._id
                );

            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        paymentId:
                            existingPayment._id,
                        bookingId:
                            existingPayment.booking,
                        paymentStatus:
                            existingPayment.status,
                    },
                    "Payment already verified"
                )
            );
        }

        const booking =
            await Booking.findOneAndUpdate(
                {
                    _id: payment.booking,
                    user: userId,
                    paymentStatus: {
                        $ne: "PAID",
                    },
                },
                {
                    $set: {
                        paymentStatus: "PAID",
                    },
                },
                {
                    new: true,
                    session,
                }
            );

        if (!booking) {
            throw new ApiError(
                404,
                "Booking not found"
            );
        }

        const existingTransaction =
            await Transaction.findOne({
                payment: payment._id,
                type: "PAYMENT",
                status: "COMPLETED",
            }).session(session);

        if (!existingTransaction) {
            await Transaction.create(
                [
                    {
                        user: userId,
                        provider:
                            payment.provider,
                        booking:
                            payment.booking,
                        payment:
                            payment._id,
                        type: "PAYMENT",
                        amount:
                            payment.amount,
                        status: "COMPLETED",
                        description:
                            `Payment for booking ${booking.bookingNumber}`,
                        referenceId:
                            razorpayPaymentId,
                    },
                ],
                {
                    session,
                }
            );
        }

        await session.commitTransaction();

        // Notify customer and provider of successful payment
        try {
            const providerRecord = await Provider.findById(payment.provider);
            const providerUserId = providerRecord?.user;

            await Notification.create({
                recipient: userId,
                type: "PAYMENT_SUCCESS",
                title: "Payment Confirmed!",
                message: `Your payment of ₹${payment.amount} for booking #${booking.bookingNumber} was successful. Service is confirmed.`,
                data: {
                    bookingId: booking._id,
                    bookingNumber: booking.bookingNumber,
                    paymentId: updatedPayment._id,
                },
            });

            emitToUser(userId, "notification", {
                type: "PAYMENT_SUCCESS",
                title: "Payment Confirmed!",
                message: `Your payment of ₹${payment.amount} for booking #${booking.bookingNumber} was successful.`,
                data: {
                    bookingId: booking._id,
                    bookingNumber: booking.bookingNumber,
                },
            });

            emitToUser(userId, "booking_update", {
                bookingId: booking._id,
                paymentStatus: "PAID",
                status: booking.bookingStatus,
            });

            if (providerUserId) {
                await Notification.create({
                    recipient: providerUserId,
                    type: "PAYMENT_SUCCESS",
                    title: "Customer Completed Payment",
                    message: `Customer completed payment of ₹${payment.amount} for booking #${booking.bookingNumber}.`,
                    data: {
                        bookingId: booking._id,
                        bookingNumber: booking.bookingNumber,
                        paymentId: updatedPayment._id,
                    },
                });

                emitToUser(providerUserId, "notification", {
                    type: "PAYMENT_SUCCESS",
                    title: "Customer Completed Payment",
                    message: `Customer completed payment of ₹${payment.amount} for booking #${booking.bookingNumber}.`,
                    data: {
                        bookingId: booking._id,
                        bookingNumber: booking.bookingNumber,
                    },
                });

                emitToUser(providerUserId, "booking_update", {
                    bookingId: booking._id,
                    paymentStatus: "PAID",
                    status: booking.bookingStatus,
                });
            }
        } catch (notifErr) {
            console.error("Failed to send payment notifications:", notifErr);
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    paymentId:
                        updatedPayment._id,
                    bookingId:
                        booking._id,
                    paymentStatus:
                        booking.paymentStatus,
                    bookingStatus:
                        booking.bookingStatus,
                },
                "Payment verified successfully"
            )
        );
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

const getPaymentByBooking =
    asyncHandler(async (req, res) => {
        const userId = req.user._id;
        const { bookingId } = req.params;

        if (
            !mongoose.isValidObjectId(
                bookingId
            )
        ) {
            throw new ApiError(
                400,
                "Invalid booking ID"
            );
        }

        const payment =
            await Payment.findOne({
                booking: bookingId,
                user: userId,
            })
                .select(
                    "-razorpaySignature"
                )
                .populate({
                    path: "booking",
                    select:
                        "bookingNumber scheduledDate scheduledStartTime scheduledEndTime totalAmount bookingStatus paymentStatus",
                });

        if (!payment) {
            throw new ApiError(
                404,
                "Payment not found"
            );
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                payment,
                "Payment fetched successfully"
            )
        );
    });

const getMyPayments =
    asyncHandler(async (req, res) => {
        const userId = req.user._id;

        const page = Math.max(
            Number.parseInt(
                req.query.page,
                10
            ) || 1,
            1
        );

        const limit = Math.min(
            Math.max(
                Number.parseInt(
                    req.query.limit,
                    10
                ) || 10,
                1
            ),
            50
        );

        const skip =
            (page - 1) * limit;

        const filter = {
            user: userId,
        };

        const allowedStatuses = [
            "CREATED",
            "PENDING",
            "PAID",
            "FAILED",
            "REFUNDED",
            "PARTIALLY_REFUNDED",
        ];

        if (req.query.status) {
            if (
                !allowedStatuses.includes(
                    req.query.status
                )
            ) {
                throw new ApiError(
                    400,
                    "Invalid payment status"
                );
            }

            filter.status =
                req.query.status;
        }

        const [
            payments,
            total,
        ] = await Promise.all([
            Payment.find(filter)
                .select(
                    "-razorpaySignature"
                )
                .populate({
                    path: "booking",
                    select:
                        "bookingNumber scheduledDate scheduledStartTime totalAmount bookingStatus paymentStatus",
                })
                .sort({
                    createdAt: -1,
                })
                .skip(skip)
                .limit(limit),

            Payment.countDocuments(
                filter
            ),
        ]);

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    payments,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages:
                            Math.ceil(
                                total / limit
                            ),
                    },
                },
                "Payments fetched successfully"
            )
        );
    });

export {
    createPaymentOrder,
    verifyPayment,
    getPaymentByBooking,
    getMyPayments,
};