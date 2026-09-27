import mongoose from "mongoose";

import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

import { Booking } from "../models/booking.model.js";
import { BookingStatusHistory } from "../models/bookingStatusHistory.model.js";
import { Service } from "../models/service.model.js";
import { Provider } from "../models/provider.model.js";
import { Address } from "../models/address.model.js";


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
  ],

  STARTED: [
    "COMPLETED",
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


    // Prevent booking in the past
    if (bookingDate < new Date()) {
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
    // Same provider + same date + overlapping time
    //
    // Existing:
    //       |---------|
    //
    // New:
    //             |---------|
    //
    // overlap condition:
    // existing.start < new.end
    // AND
    // existing.end > new.start
    // --------------------------------------------------------

    const conflictingBooking =
      await Booking.findOne({
        provider: provider._id,

        scheduledDate: {
          $eq: bookingDate,
        },

        bookingStatus: {
          $in: [
            BOOKING_STATUSES.PENDING,
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
        "Provider is already booked for this time slot"
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


      await createStatusHistory({
        bookingId: booking._id,
        status:
          BOOKING_STATUSES.CANCELLED,
        changedBy:
          req.user._id,
        note:
          cancellationReason,
      });


      return res.status(200).json(
        new ApiResponse(
          200,
          booking,
          "Booking cancelled successfully"
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
        BOOKING_STATUSES.ACCEPTED
      );


      booking.bookingStatus =
        BOOKING_STATUSES.ACCEPTED;


      await booking.save();


      await createStatusHistory({
        bookingId:
          booking._id,

        status:
          BOOKING_STATUSES.ACCEPTED,

        changedBy:
          req.user._id,

        note:
          "Booking accepted by provider",
      });


      return res.status(200).json(
        new ApiResponse(
          200,
          booking,
          "Booking accepted successfully"
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
        BOOKING_STATUSES.REJECTED
      );


      const rejectionReason =
        reason?.trim() ||
        "Rejected by provider";


      if (
        rejectionReason.length >
        500
      ) {
        throw new ApiError(
          400,
          "Rejection reason cannot exceed 500 characters"
        );
      }


      booking.bookingStatus =
        BOOKING_STATUSES.REJECTED;


      booking.cancellation = undefined;


      await booking.save();


      await createStatusHistory({
        bookingId:
          booking._id,

        status:
          BOOKING_STATUSES.REJECTED,

        changedBy:
          req.user._id,

        note:
          rejectionReason,
      });


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

  markOnTheWay,
  startService,
  completeService,

  getBookingStatusHistory,
};