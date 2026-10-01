import mongoose from "mongoose";

import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

import { Booking } from "../models/booking.model.js";
import { BookingStatusHistory } from "../models/bookingStatusHistory.model.js";
import { Service } from "../models/service.model.js";
import { Provider } from "../models/provider.model.js";
import { Address } from "../models/address.model.js";
import { Notification } from "../models/notification.model.js";
import { Payment } from "../models/payment.model.js";
import { Refund } from "../models/refund.model.js";
import { Transaction } from "../models/transaction.model.js";
import getRazorpay from "../utils/razorpay.js";
import { emitToUser } from "../socket.js";


// ============================================================
// CONSTANTS
// ============================================================

const BOOKING_STATUSES = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  ON_THE_WAY: "ON_THE_WAY",
  STARTED: "STARTED",
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
};


// Allowed status transitions
const ALLOWED_TRANSITIONS = {
  PENDING: [
    "ACCEPTED",
    "REJECTED",
    "CANCELLED",
  ],

  ACCEPTED: [
    "ON_THE_WAY",
    "CANCELLED",
  ],

  ON_THE_WAY: [
    "STARTED",
    "CANCELLED",
  ],

  STARTED: [
    "COMPLETED",
    "CANCELLED",
  ],

  COMPLETED: [],

  REJECTED: [],

  CANCELLED: [],
};


// ============================================================
// HELPER FUNCTIONS
// ============================================================

const validateObjectId = (
  id,
  fieldName = "ID"
) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(
      400,
      `Invalid ${fieldName}`
    );
  }
};


// ------------------------------------------------------------
// Generate Booking Number
// ------------------------------------------------------------

const generateBookingNumber = () => {
  const timestamp = Date.now();

  const random = Math.floor(
    1000 + Math.random() * 9000
  );

  return `BK${timestamp}${random}`;
};


// ------------------------------------------------------------
// Validate Date
// ------------------------------------------------------------

const validateScheduledDate = (
  scheduledDate
) => {
  if (!scheduledDate) {
    throw new ApiError(
      400,
      "Scheduled date is required"
    );
  }

  const date = new Date(scheduledDate);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(
      400,
      "Invalid scheduled date"
    );
  }

  return date;
};


// ------------------------------------------------------------
// Validate Time
// ------------------------------------------------------------

const validateTime = (
  time,
  fieldName
) => {
  if (!time) {
    throw new ApiError(
      400,
      `${fieldName} is required`
    );
  }

  if (
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)
  ) {
    throw new ApiError(
      400,
      `${fieldName} must be in HH:mm format`
    );
  }
};


// ------------------------------------------------------------
// Convert HH:mm to minutes
// ------------------------------------------------------------

const timeToMinutes = (time) => {
  const [hours, minutes] =
    time.split(":").map(Number);

  return hours * 60 + minutes;
};


// ------------------------------------------------------------
// Check time range
// ------------------------------------------------------------

const validateTimeRange = (
  startTime,
  endTime
) => {
  validateTime(
    startTime,
    "scheduledStartTime"
  );

  validateTime(
    endTime,
    "scheduledEndTime"
  );

  const start =
    timeToMinutes(startTime);

  const end =
    timeToMinutes(endTime);

  if (end <= start) {
    throw new ApiError(
      400,
      "scheduledEndTime must be after scheduledStartTime"
    );
  }
};


// ------------------------------------------------------------
// Check status transition
// ------------------------------------------------------------

const validateStatusTransition = (
  currentStatus,
  nextStatus
) => {
  const allowed =
    ALLOWED_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(nextStatus)) {
    throw new ApiError(
      400,
      `Invalid booking status transition: ${currentStatus} → ${nextStatus}`
    );
  }
};


// ------------------------------------------------------------
// Get provider owned by logged-in provider
// ------------------------------------------------------------

const getMyProvider = async (
  userId
) => {
  const provider =
    await Provider.findOne({
      user: userId,
    });

  if (!provider) {
    throw new ApiError(
      404,
      "Provider profile not found"
    );
  }

  if (
    provider.status === "suspended"
  ) {
    throw new ApiError(
      403,
      "Provider account is suspended"
    );
  }

  if (
    provider.verificationStatus !==
    "approved"
  ) {
    throw new ApiError(
      403,
      "Provider verification is not approved"
    );
  }

  return provider;
};


// ------------------------------------------------------------
// Create Status History
// ------------------------------------------------------------

const createStatusHistory = async ({
  bookingId,
  status,
  changedBy,
  note = "",
}) => {
  await BookingStatusHistory.create({
    booking: bookingId,
    status,
    changedBy,
    note,
  });
};


// ------------------------------------------------------------
// Process Automatic Refund for Paid Bookings
// ------------------------------------------------------------

const processAutoRefundForBooking = async (booking, reason, cancelledByUser) => {
  if (booking.paymentStatus !== "PAID") {
    return { refunded: false, message: "Booking was not paid; no refund required." };
  }

  const payment = await Payment.findOne({
    booking: booking._id,
    status: "PAID",
  });

  if (!payment) {
    return { refunded: false, message: "No successful payment found to refund." };
  }

  let razorpayRefundId = null;
  let refundStatus = "COMPLETED";
  let failureReason = "";

  const razorpay = getRazorpay();
  if (razorpay && payment.razorpayPaymentId) {
    try {
      const rzpRefund = await razorpay.payments.refund(payment.razorpayPaymentId, {
        amount: Math.round(payment.amount * 100),
        notes: {
          bookingId: booking._id.toString(),
          reason: reason || "Booking cancelled",
        },
      });
      razorpayRefundId = rzpRefund?.id || null;
    } catch (rzpErr) {
      console.error("Razorpay auto-refund API error:", rzpErr?.error || rzpErr?.message || rzpErr);
      refundStatus = "REQUESTED";
      failureReason = rzpErr?.error?.description || rzpErr?.message || "Razorpay API refund pending";
    }
  }

  // Create Refund record
  const refund = await Refund.create({
    payment: payment._id,
    booking: booking._id,
    requestedBy: cancelledByUser,
    amount: payment.amount,
    reason: reason || "Booking cancelled",
    razorpayRefundId: razorpayRefundId || undefined,
    status: refundStatus,
    processedAt: refundStatus === "COMPLETED" ? new Date() : undefined,
    failureReason: failureReason || undefined,
  });

  // Update payment status
  payment.status = "REFUNDED";
  await payment.save();

  // Update booking paymentStatus
  booking.paymentStatus = "REFUNDED";
  await booking.save();

  // Create transaction record
  try {
    await Transaction.create({
      user: booking.user,
      provider: booking.provider,
      booking: booking._id,
      payment: payment._id,
      type: "REFUND",
      amount: payment.amount,
      status: refundStatus === "COMPLETED" ? "COMPLETED" : "PENDING",
      referenceId: razorpayRefundId || `ref_${refund._id}`,
      description: `Refund for cancelled booking #${booking.bookingNumber}`,
    });
  } catch (txErr) {
    console.error("Transaction record creation error:", txErr);
  }

  return {
    refunded: true,
    refundId: refund._id,
    amount: payment.amount,
    razorpayRefundId,
  };
};


// ============================================================
// CUSTOMER
// ============================================================


// ============================================================
// 1. CREATE BOOKING
// ============================================================

const createBooking = asyncHandler(
  async (req, res) => {
    const {
      serviceId,
      addressId,
      scheduledDate,
      scheduledStartTime,
      scheduledEndTime,
    } = req.body;


    // --------------------------------------------------------
    // Validate IDs
    // --------------------------------------------------------

    validateObjectId(
      serviceId,
      "service ID"
    );

    validateObjectId(
      addressId,
      "address ID"
    );


    // --------------------------------------------------------
    // Validate schedule
    // --------------------------------------------------------

    const bookingDate =
      validateScheduledDate(
        scheduledDate
      );

    validateTimeRange(
      scheduledStartTime,
      scheduledEndTime
    );


    // Prevent booking in the past (compare day only)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDay = new Date(bookingDate);
    bookingDay.setHours(0, 0, 0, 0);

    if (bookingDay < today) {
      throw new ApiError(
        400,
        "Scheduled date cannot be in the past"
      );
    }


    // --------------------------------------------------------
    // Get service
    // --------------------------------------------------------

    const service =
      await Service.findOne({
        _id: serviceId,
        isActive: true,
      }).populate(
        "provider"
      );


    if (!service) {
      throw new ApiError(
        404,
        "Service not found or inactive"
      );
    }


    // --------------------------------------------------------
    // Provider validation
    // --------------------------------------------------------

    const provider =
      await Provider.findOne({
        _id: service.provider._id,
        status: "active",
        verificationStatus: "approved",
      });


    if (!provider) {
      throw new ApiError(
        404,
        "Provider is not available"
      );
    }


    // --------------------------------------------------------
    // Address ownership
    // --------------------------------------------------------

    const address =
      await Address.findOne({
        _id: addressId,
        user: req.user._id,
      });


    if (!address) {
      throw new ApiError(
        404,
        "Address not found"
      );
    }


    // --------------------------------------------------------
    // Check booking conflict
    // --------------------------------------------------------
    //
    // Same provider + same calendar date + overlapping time
    // Only accepted/active bookings reserve time slots
    // --------------------------------------------------------

    const startOfDay = new Date(bookingDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(bookingDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const conflictingBooking =
      await Booking.findOne({
        provider: provider._id,

        scheduledDate: {
          $gte: startOfDay,
          $lte: endOfDay,
        },

        bookingStatus: {
          $in: [
            BOOKING_STATUSES.ACCEPTED,
            BOOKING_STATUSES.ON_THE_WAY,
            BOOKING_STATUSES.STARTED,
          ],
        },

        scheduledStartTime: {
          $lt: scheduledEndTime,
        },

        scheduledEndTime: {
          $gt: scheduledStartTime,
        },
      });


    if (conflictingBooking) {
      throw new ApiError(
        409,
        `Time slot (${scheduledStartTime} - ${scheduledEndTime}) is already reserved by another confirmed appointment.`
      );
    }


    // --------------------------------------------------------
    // SERVER-SIDE PRICE CALCULATION
    // --------------------------------------------------------
    //
    // Never trust totalAmount from frontend.
    // --------------------------------------------------------

    const servicePrice =
      Number(service.price);

    if (
      !Number.isFinite(servicePrice) ||
      servicePrice < 0
    ) {
      throw new ApiError(
        500,
        "Invalid service price"
      );
    }


    // Temporary calculation.
    // Payment module can later replace these values
    // according to business rules.
    const platformFee = 0;

    const tax = 0;

    const discount = 0;

    const totalAmount =
      servicePrice +
      platformFee +
      tax -
      discount;


    // --------------------------------------------------------
    // Create booking
    // --------------------------------------------------------

    const booking =
      await Booking.create({
        bookingNumber:
          generateBookingNumber(),

        user: req.user._id,

        provider: provider._id,

        service: service._id,

        address: address._id,

        scheduledDate: bookingDate,

        scheduledStartTime,

        scheduledEndTime,

        price: servicePrice,

        platformFee,

        tax,

        discount,

        totalAmount,

        paymentStatus: "PENDING",

        bookingStatus:
          BOOKING_STATUSES.PENDING,
      });


    // --------------------------------------------------------
    // Create initial history
    // --------------------------------------------------------

    await createStatusHistory({
      bookingId: booking._id,
      status: BOOKING_STATUSES.PENDING,
      changedBy: req.user._id,
      note: "Booking created",
    });


    // --------------------------------------------------------
    // Populate response
    // --------------------------------------------------------

    const populatedBooking =
      await Booking.findById(
        booking._id
      )
        .populate(
          "service",
          "title description price duration images"
        )
        .populate(
          "provider",
          "businessName rating totalReviews"
        )
        .populate(
          "address",
          "label addressLine city state pincode coordinates landmark"
        );

    try {
      if (provider.user) {
        await Notification.create({
          recipient: provider.user,
          type: "BOOKING_CREATED",
          title: "New Service Request",
          message: `New booking request #${booking.bookingNumber} received for ${service.title}.`,
          data: {
            bookingId: booking._id,
            bookingNumber: booking.bookingNumber,
          },
        });

        emitToUser(provider.user, "notification", {
          type: "BOOKING_CREATED",
          title: "New Service Request",
          message: `New booking request #${booking.bookingNumber} received for ${service.title}.`,
          data: {
            bookingId: booking._id,
            bookingNumber: booking.bookingNumber,
          },
        });

        emitToUser(provider.user, "booking_update", {
          bookingId: booking._id,
          status: "PENDING",
          type: "NEW_REQUEST",
        });
      }
    } catch (notifErr) {
      console.error("Failed to send booking created notification:", notifErr);
    }

    return res.status(201).json(
      new ApiResponse(
        201,
        populatedBooking,
        "Booking created successfully"
      )
    );
  }
);


// ============================================================
// 2. GET MY BOOKINGS
// ============================================================

const getMyBookings = asyncHandler(
  async (req, res) => {
    const page = Math.max(
      parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        parseInt(req.query.limit, 10) || 10,
        1
      ),
      50
    );

    const skip =
      (page - 1) * limit;


    const filter = {
      user: req.user._id,
    };


    // Optional status filter
    if (req.query.status) {
      const allowedStatuses =
        Object.values(
          BOOKING_STATUSES
        );

      if (
        !allowedStatuses.includes(
          req.query.status
        )
      ) {
        throw new ApiError(
          400,
          "Invalid booking status"
        );
      }

      filter.bookingStatus =
        req.query.status;
    }


    const [
      bookings,
      total,
    ] = await Promise.all([
      Booking.find(filter)
        .populate(
          "service",
          "title description price duration images"
        )
        .populate(
          "provider",
          "businessName rating totalReviews"
        )
        .populate(
          "address",
          "label addressLine city state pincode coordinates landmark"
        )
        .sort({
          scheduledDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit),

      Booking.countDocuments(
        filter
      ),
    ]);


    const totalPages =
      Math.ceil(total / limit);


    return res.status(200).json(
      new ApiResponse(
        200,
        {
          bookings,

          pagination: {
            page,
            limit,
            total,
            totalPages,

            hasNextPage:
              page < totalPages,

            hasPreviousPage:
              page > 1,
          },
        },
        "Bookings fetched successfully"
      )
    );
  }
);


// ============================================================
// 3. GET MY BOOKING BY ID
// ============================================================

const getMyBookingById =
  asyncHandler(
    async (req, res) => {
      const {
        bookingId,
      } = req.params;


      validateObjectId(
        bookingId,
        "booking ID"
      );


      // IMPORTANT:
      // Ownership check
      const booking =
        await Booking.findOne({
          _id: bookingId,
          user: req.user._id,
        })
          .populate(
            "service",
            "title description price duration images"
          )
          .populate(
            "provider",
            "businessName description rating totalReviews serviceArea"
          )
          .populate(
            "address",
            "label addressLine city state pincode coordinates landmark"
          );


      if (!booking) {
        throw new ApiError(
          404,
          "Booking not found"
        );
      }


      return res.status(200).json(
        new ApiResponse(
          200,
          booking,
          "Booking fetched successfully"
        )
      );
    }
  );


// ============================================================
// 4. CANCEL BOOKING
// ============================================================

const cancelBooking =
  asyncHandler(
    async (req, res) => {
      const {
        bookingId,
      } = req.params;

      const {
        reason,
      } = req.body;


      validateObjectId(
        bookingId,
        "booking ID"
      );


      // Customer ownership
      const booking =
        await Booking.findOne({
          _id: bookingId,
          user: req.user._id,
        });


      if (!booking) {
        throw new ApiError(
          404,
          "Booking not found"
        );
      }


      // ------------------------------------------------------
      // Strict transition
      // ------------------------------------------------------

      validateStatusTransition(
        booking.bookingStatus,
        BOOKING_STATUSES.CANCELLED
      );


      // ------------------------------------------------------
      // Cancellation reason
      // ------------------------------------------------------

      const cancellationReason =
        reason?.trim() ||
        "Cancelled by customer";


      if (
        cancellationReason.length >
        500
      ) {
        throw new ApiError(
          400,
          "Cancellation reason cannot exceed 500 characters"
        );
      }


      booking.bookingStatus =
        BOOKING_STATUSES.CANCELLED;


      booking.cancellation = {
        cancelledBy:
          req.user._id,

        cancelledAt:
          new Date(),

        reason:
          cancellationReason,
      };


      await booking.save();


      // ------------------------------------------------------
      // Auto-Refund if Paid
      // ------------------------------------------------------

      let refundInfo = null;
      if (booking.paymentStatus === "PAID") {
        refundInfo = await processAutoRefundForBooking(
          booking,
          cancellationReason,
          req.user._id
        );
      }


      await createStatusHistory({
        bookingId: booking._id,
        status:
          BOOKING_STATUSES.CANCELLED,
        changedBy:
          req.user._id,
        note:
          `${cancellationReason}${
            refundInfo?.refunded
              ? ` (Refund of ₹${refundInfo.amount} initiated)`
              : ""
          }`,
      });

      // Real-time notifications and socket emit
      try {
        emitToUser(req.user._id, "booking_update", {
          bookingId: booking._id,
          status: BOOKING_STATUSES.CANCELLED,
          paymentStatus: booking.paymentStatus,
          refund: refundInfo,
        });

        // Populate provider user if needed
        const populated = await Booking.findById(booking._id).populate("provider", "user businessName");
        if (populated?.provider?.user) {
          emitToUser(populated.provider.user, "booking_update", {
            bookingId: booking._id,
            status: BOOKING_STATUSES.CANCELLED,
            paymentStatus: booking.paymentStatus,
          });

          await Notification.create({
            recipient: populated.provider.user,
            type: "BOOKING_CANCELLED",
            title: "Booking Cancelled by Customer",
            message: `Booking #${booking.bookingNumber} was cancelled by the customer.`,
            data: {
              bookingId: booking._id,
              bookingNumber: booking.bookingNumber,
            },
          });
        }
      } catch (notifErr) {
        console.error("Failed to emit socket on customer cancel:", notifErr);
      }


      return res.status(200).json(
        new ApiResponse(
          200,
          {
            booking,
            refund: refundInfo,
          },
          `Booking cancelled successfully.${
            refundInfo?.refunded
              ? ` Full refund of ₹${refundInfo.amount} initiated.`
              : ""
          }`
        )
      );
    }
  );


// ============================================================
// PROVIDER
// ============================================================


// ============================================================
// 5. GET PROVIDER BOOKINGS
// ============================================================

const getProviderBookings =
  asyncHandler(
    async (req, res) => {
      const provider =
        await getMyProvider(
          req.user._id
        );


      const page = Math.max(
        parseInt(
          req.query.page,
          10
        ) || 1,
        1
      );

      const limit = Math.min(
        Math.max(
          parseInt(
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
        provider:
          provider._id,
      };


      if (req.query.status) {
        const allowedStatuses =
          Object.values(
            BOOKING_STATUSES
          );

        if (
          !allowedStatuses.includes(
            req.query.status
          )
        ) {
          throw new ApiError(
            400,
            "Invalid booking status"
          );
        }

        filter.bookingStatus =
          req.query.status;
      }


      const [
        bookings,
        total,
      ] = await Promise.all([
        Booking.find(filter)
          .populate(
            "user",
            "username fullName avatar phone"
          )
          .populate(
            "service",
            "title description price duration images"
          )
          .populate(
            "address",
            "label addressLine city state pincode coordinates landmark"
          )
          .sort({
            scheduledDate: 1,
            scheduledStartTime: 1,
          })
          .skip(skip)
          .limit(limit),

        Booking.countDocuments(
          filter
        ),
      ]);


      const totalPages =
        Math.ceil(
          total / limit
        );


      return res.status(200).json(
        new ApiResponse(
          200,
          {
            bookings,

            pagination: {
              page,
              limit,
              total,
              totalPages,

              hasNextPage:
                page < totalPages,

              hasPreviousPage:
                page > 1,
            },
          },
          "Provider bookings fetched successfully"
        )
      );
    }
  );


// ============================================================
// 6. GET PROVIDER BOOKING BY ID
// ============================================================

const getProviderBookingById =
  asyncHandler(
    async (req, res) => {
      const {
        bookingId,
      } = req.params;


      validateObjectId(
        bookingId,
        "booking ID"
      );


      const provider =
        await getMyProvider(
          req.user._id
        );


      // IMPORTANT:
      // Provider ownership check
      const booking =
        await Booking.findOne({
          _id: bookingId,
          provider:
            provider._id,
        })
          .populate(
            "user",
            "username fullName avatar phone"
          )
          .populate(
            "service",
            "title description price duration images"
          )
          .populate(
            "address",
            "label addressLine city state pincode coordinates landmark"
          );


      if (!booking) {
        throw new ApiError(
          404,
          "Booking not found"
        );
      }


      return res.status(200).json(
        new ApiResponse(
          200,
          booking,
          "Booking fetched successfully"
        )
      );
    }
  );


// ============================================================
// 7. ACCEPT BOOKING
// ============================================================

const acceptBooking =
  asyncHandler(
    async (req, res) => {
      const {
        bookingId,
      } = req.params;


      validateObjectId(
        bookingId,
        "booking ID"
      );


      const provider =
        await getMyProvider(
          req.user._id
        );

      const booking =
        await Booking.findOne({
          _id: bookingId,
          provider: provider._id,
        })
          .populate("service", "title price duration")
          .populate("user", "_id fullName email phone");

      if (!booking) {
        throw new ApiError(
          404,
          "Booking not found"
        );
      }

      if (booking.bookingStatus !== BOOKING_STATUSES.PENDING) {
        throw new ApiError(
          400,
          `Only pending bookings can be accepted. Current status: ${booking.bookingStatus}`
        );
      }

      // --------------------------------------------------------
      // Double Booking Slot Protection
      // Check if provider already has an accepted/active booking for this exact date & overlapping time
      // --------------------------------------------------------
      const conflictingBooking = await Booking.findOne({
        _id: { $ne: booking._id },
        provider: provider._id,
        scheduledDate: booking.scheduledDate,
        bookingStatus: {
          $in: [
            BOOKING_STATUSES.ACCEPTED,
            BOOKING_STATUSES.ON_THE_WAY,
            BOOKING_STATUSES.STARTED,
          ],
        },
        scheduledStartTime: {
          $lt: booking.scheduledEndTime,
        },
        scheduledEndTime: {
          $gt: booking.scheduledStartTime,
        },
      });

      if (conflictingBooking) {
        throw new ApiError(
          409,
          `Time slot (${booking.scheduledStartTime} - ${booking.scheduledEndTime}) is already reserved by another accepted booking (#${conflictingBooking.bookingNumber}).`
        );
      }

      booking.bookingStatus = BOOKING_STATUSES.ACCEPTED;
      await booking.save();

      await createStatusHistory({
        bookingId: booking._id,
        status: BOOKING_STATUSES.ACCEPTED,
        changedBy: req.user._id,
        note: "Booking accepted by provider. Awaiting customer payment.",
      });

      // Notify customer
      try {
        const customerId = booking.user?._id || booking.user;
        await Notification.create({
          recipient: customerId,
          type: "BOOKING_ACCEPTED",
          title: "Booking Request Accepted!",
          message: `Your booking #${booking.bookingNumber} for ${booking.service?.title || "service"} has been accepted by ${provider.businessName}. Please complete your payment to confirm your appointment.`,
          data: {
            bookingId: booking._id,
            bookingNumber: booking.bookingNumber,
          },
        });

        emitToUser(customerId, "notification", {
          type: "BOOKING_ACCEPTED",
          title: "Booking Request Accepted!",
          message: `Your booking #${booking.bookingNumber} was accepted by ${provider.businessName}. Please pay now to confirm.`,
          data: {
            bookingId: booking._id,
            bookingNumber: booking.bookingNumber,
          },
        });

        emitToUser(customerId, "booking_update", {
          bookingId: booking._id,
          status: BOOKING_STATUSES.ACCEPTED,
        });
      } catch (notifErr) {
        console.error("Failed to notify user on accept:", notifErr);
      }

      return res.status(200).json(
        new ApiResponse(
          200,
          booking,
          "Booking accepted successfully. Customer notified for payment."
        )
      );
    }
  );


// ============================================================
// 8. REJECT BOOKING
// ============================================================

const rejectBooking =
  asyncHandler(
    async (req, res) => {
      const {
        bookingId,
      } = req.params;

      const {
        reason,
      } = req.body;

      validateObjectId(
        bookingId,
        "booking ID"
      );

      const provider =
        await getMyProvider(
          req.user._id
        );

      const booking =
        await Booking.findOne({
          _id: bookingId,
          provider: provider._id,
        })
          .populate("service", "title price")
          .populate("user", "_id fullName email phone");

      if (!booking) {
        throw new ApiError(
          404,
          "Booking not found"
        );
      }

      if (booking.bookingStatus !== BOOKING_STATUSES.PENDING) {
        throw new ApiError(
          400,
          `Only pending bookings can be declined. Current status: ${booking.bookingStatus}`
        );
      }

      const rejectionReason =
        reason?.trim() || "Declined by service provider";

      if (rejectionReason.length > 500) {
        throw new ApiError(
          400,
          "Rejection reason cannot exceed 500 characters"
        );
      }

      booking.bookingStatus = BOOKING_STATUSES.REJECTED;
      booking.cancellation = {
        cancelledBy: req.user._id,
        reason: rejectionReason,
        cancelledAt: new Date(),
      };

      await booking.save();

      await createStatusHistory({
        bookingId: booking._id,
        status: BOOKING_STATUSES.REJECTED,
        changedBy: req.user._id,
        note: `Booking rejected by provider: ${rejectionReason}`,
      });

      // Notify customer
      try {
        const customerId = booking.user?._id || booking.user;
        await Notification.create({
          recipient: customerId,
          type: "BOOKING_REJECTED",
          title: "Booking Request Declined",
          message: `Your booking #${booking.bookingNumber} was declined by ${provider.businessName}. Reason: ${rejectionReason}`,
          data: {
            bookingId: booking._id,
            bookingNumber: booking.bookingNumber,
          },
        });

        emitToUser(customerId, "notification", {
          type: "BOOKING_REJECTED",
          title: "Booking Request Declined",
          message: `Your booking #${booking.bookingNumber} was declined by ${provider.businessName}.`,
          data: {
            bookingId: booking._id,
            bookingNumber: booking.bookingNumber,
          },
        });

        emitToUser(customerId, "booking_update", {
          bookingId: booking._id,
          status: BOOKING_STATUSES.REJECTED,
        });
      } catch (notifErr) {
        console.error("Failed to notify user on reject:", notifErr);
      }

      return res.status(200).json(
        new ApiResponse(
          200,
          booking,
          "Booking rejected successfully"
        )
      );
    }
  );


// ============================================================
// 8B. PROVIDER CANCEL BOOKING (ANYTIME BEFORE COMPLETION WITH AUTO-REFUND)
// ============================================================

const providerCancelBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { reason } = req.body;

  validateObjectId(bookingId, "booking ID");

  const provider = await getMyProvider(req.user._id);

  const booking = await Booking.findOne({
    _id: bookingId,
    provider: provider._id,
  })
    .populate("service", "title price")
    .populate("user", "_id fullName email phone");

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (
    booking.bookingStatus === BOOKING_STATUSES.COMPLETED ||
    booking.bookingStatus === BOOKING_STATUSES.CANCELLED ||
    booking.bookingStatus === BOOKING_STATUSES.REJECTED
  ) {
    throw new ApiError(
      400,
      `Cannot cancel booking with current status: ${booking.bookingStatus}`
    );
  }

  const cancellationReason =
    reason?.trim() || "Service appointment cancelled by provider";

  if (cancellationReason.length > 500) {
    throw new ApiError(400, "Cancellation reason cannot exceed 500 characters");
  }

  // Update status
  booking.bookingStatus = BOOKING_STATUSES.CANCELLED;
  booking.cancellation = {
    cancelledBy: req.user._id,
    cancelledAt: new Date(),
    reason: cancellationReason,
  };
  await booking.save();

  // Automatic refund if user has paid
  let refundInfo = null;
  if (booking.paymentStatus === "PAID") {
    refundInfo = await processAutoRefundForBooking(
      booking,
      cancellationReason,
      req.user._id
    );
  }

  await createStatusHistory({
    bookingId: booking._id,
    status: BOOKING_STATUSES.CANCELLED,
    changedBy: req.user._id,
    note: `Provider cancelled: ${cancellationReason}${
      refundInfo?.refunded
        ? ` (Automatic refund of ₹${refundInfo.amount} initiated)`
        : ""
    }`,
  });

  // Real-time notifications and socket events
  try {
    const customerId = booking.user?._id || booking.user;
    const notifMsg = `Your booking #${booking.bookingNumber} was cancelled by ${
      provider.businessName
    }.${
      refundInfo?.refunded
        ? ` A full refund of ₹${refundInfo.amount} has been initiated.`
        : " No payment was deducted."
    }`;

    await Notification.create({
      recipient: customerId,
      type: "BOOKING_CANCELLED",
      title: "Booking Cancelled by Provider",
      message: notifMsg,
      data: {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        refundInitiated: Boolean(refundInfo?.refunded),
      },
    });

    emitToUser(customerId, "notification", {
      type: "BOOKING_CANCELLED",
      title: "Booking Cancelled by Provider",
      message: notifMsg,
      data: {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
      },
    });

    emitToUser(customerId, "booking_update", {
      bookingId: booking._id,
      status: BOOKING_STATUSES.CANCELLED,
      paymentStatus: booking.paymentStatus,
      refund: refundInfo,
    });

    emitToUser(provider.user, "booking_update", {
      bookingId: booking._id,
      status: BOOKING_STATUSES.CANCELLED,
      paymentStatus: booking.paymentStatus,
      refund: refundInfo,
    });
  } catch (notifErr) {
    console.error("Failed to notify user on provider cancel:", notifErr);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        booking,
        refund: refundInfo,
      },
      `Booking cancelled successfully.${
        refundInfo?.refunded
          ? ` Full refund of ₹${refundInfo.amount} has been processed.`
          : ""
      }`
    )
  );
});


// ============================================================
// PROVIDER STATUS
// ============================================================


// ============================================================
// 9. MARK ON THE WAY
// ============================================================

const markOnTheWay =
  asyncHandler(
    async (req, res) => {
      const {
        bookingId,
      } = req.params;


      validateObjectId(
        bookingId,
        "booking ID"
      );


      const provider =
        await getMyProvider(
          req.user._id
        );


      const booking =
        await Booking.findOne({
          _id: bookingId,
          provider:
            provider._id,
        });


      if (!booking) {
        throw new ApiError(
          404,
          "Booking not found"
        );
      }


      validateStatusTransition(
        booking.bookingStatus,
        BOOKING_STATUSES.ON_THE_WAY
      );


      booking.bookingStatus =
        BOOKING_STATUSES.ON_THE_WAY;


      await booking.save();


      await createStatusHistory({
        bookingId:
          booking._id,

        status:
          BOOKING_STATUSES.ON_THE_WAY,

        changedBy:
          req.user._id,

        note:
          "Provider is on the way",
      });


      return res.status(200).json(
        new ApiResponse(
          200,
          booking,
          "Booking marked as on the way"
        )
      );
    }
  );


// ============================================================
// 10. START SERVICE
// ============================================================

const startService =
  asyncHandler(
    async (req, res) => {
      const {
        bookingId,
      } = req.params;


      validateObjectId(
        bookingId,
        "booking ID"
      );


      const provider =
        await getMyProvider(
          req.user._id
        );


      const booking =
        await Booking.findOne({
          _id: bookingId,
          provider:
            provider._id,
        });


      if (!booking) {
        throw new ApiError(
          404,
          "Booking not found"
        );
      }


      validateStatusTransition(
        booking.bookingStatus,
        BOOKING_STATUSES.STARTED
      );


      booking.bookingStatus =
        BOOKING_STATUSES.STARTED;

      booking.startedAt =
        new Date();


      await booking.save();


      await createStatusHistory({
        bookingId:
          booking._id,

        status:
          BOOKING_STATUSES.STARTED,

        changedBy:
          req.user._id,

        note:
          "Service started",
      });


      return res.status(200).json(
        new ApiResponse(
          200,
          booking,
          "Service started successfully"
        )
      );
    }
  );


// ============================================================
// 11. COMPLETE SERVICE
// ============================================================

const completeService =
  asyncHandler(
    async (req, res) => {
      const {
        bookingId,
      } = req.params;


      validateObjectId(
        bookingId,
        "booking ID"
      );


      const provider =
        await getMyProvider(
          req.user._id
        );


      const booking =
        await Booking.findOne({
          _id: bookingId,
          provider:
            provider._id,
        });


      if (!booking) {
        throw new ApiError(
          404,
          "Booking not found"
        );
      }


      validateStatusTransition(
        booking.bookingStatus,
        BOOKING_STATUSES.COMPLETED
      );


      booking.bookingStatus =
        BOOKING_STATUSES.COMPLETED;

      booking.completedAt =
        new Date();


      await booking.save();


      // Update provider completed booking count
      await Provider.updateOne(
        {
          _id: provider._id,
        },
        {
          $inc: {
            completedBookings: 1,
          },
        }
      );


      await createStatusHistory({
        bookingId:
          booking._id,

        status:
          BOOKING_STATUSES.COMPLETED,

        changedBy:
          req.user._id,

        note:
          "Service completed",
      });


      return res.status(200).json(
        new ApiResponse(
          200,
          booking,
          "Service completed successfully"
        )
      );
    }
  );


// ============================================================
// HISTORY
// ============================================================


// ============================================================
// 12. GET BOOKING STATUS HISTORY
// ============================================================

const getBookingStatusHistory =
  asyncHandler(
    async (req, res) => {
      const {
        bookingId,
      } = req.params;


      validateObjectId(
        bookingId,
        "booking ID"
      );


      let booking;


      // --------------------------------------------------------
      // Customer can see own booking
      // --------------------------------------------------------

      if (
        req.user.role === "user"
      ) {
        booking =
          await Booking.findOne({
            _id: bookingId,
            user: req.user._id,
          }).select("_id");
      }


      // --------------------------------------------------------
      // Provider can see own provider booking
      // --------------------------------------------------------

      if (
        req.user.role === "provider"
      ) {
        const provider =
          await Provider.findOne({
            user: req.user._id,
          }).select("_id");


        if (provider) {
          booking =
            await Booking.findOne({
              _id: bookingId,
              provider:
                provider._id,
            }).select("_id");
        }
      }


      // --------------------------------------------------------
      // Admin can see any booking
      // --------------------------------------------------------

      if (
        req.user.role === "admin"
      ) {
        booking =
          await Booking.findById(
            bookingId
          ).select("_id");
      }


      if (!booking) {
        throw new ApiError(
          404,
          "Booking not found"
        );
      }


      const history =
        await BookingStatusHistory.find({
          booking: booking._id,
        })
          .populate(
            "changedBy",
            "username fullName avatar role"
          )
          .sort({
            createdAt: 1,
          });


      return res.status(200).json(
        new ApiResponse(
          200,
          history,
          "Booking status history fetched successfully"
        )
      );
    }
  );


// ============================================================
// EXPORTS
// ============================================================

export {
  createBooking,
  getMyBookings,
  getMyBookingById,
  cancelBooking,

  getProviderBookings,
  getProviderBookingById,
  acceptBooking,
  rejectBooking,
  providerCancelBooking,

  markOnTheWay,
  startService,
  completeService,

  getBookingStatusHistory,
};