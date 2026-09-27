import mongoose, { Schema } from "mongoose";

const cancellationSchema = new Schema(
  {
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reason: {
      type: String,
      trim: true,
      maxlength: [500, "Cancellation reason cannot exceed 500 characters"],
      default: "",
    },

    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
    strict: true,
  }
);

const bookingSchema = new Schema(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      trim: true,
      uppercase: true,
      maxlength: [30, "Booking number cannot exceed 30 characters"],
      index: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
      index: true,
    },

    provider: {
      type: Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
      immutable: true,
      index: true,
    },

    service: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      immutable: true,
      index: true,
    },

    address: {
      type: Schema.Types.ObjectId,
      ref: "Address",
      required: true,
      immutable: true,
      index: true,
    },

    scheduledDate: {
      type: Date,
      required: true,
      index: true,
    },

    scheduledStartTime: {
      type: String,
      required: true,
      trim: true,
      match: [
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "Scheduled start time must be in HH:mm format",
      ],
    },

    scheduledEndTime: {
      type: String,
      required: true,
      trim: true,
      match: [
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "Scheduled end time must be in HH:mm format",
      ],
    },

    price: {
      type: Number,
      required: true,
      min: [0, "Price cannot be negative"],
      max: [10000000, "Price is too high"],
    },

    platformFee: {
      type: Number,
      required: true,
      min: [0, "Platform fee cannot be negative"],
      max: [1000000, "Platform fee is too high"],
      default: 0,
    },

    tax: {
      type: Number,
      required: true,
      min: [0, "Tax cannot be negative"],
      max: [1000000, "Tax is too high"],
      default: 0,
    },

    discount: {
      type: Number,
      required: true,
      min: [0, "Discount cannot be negative"],
      max: [10000000, "Discount is too high"],
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Total amount cannot be negative"],
      max: [10000000, "Total amount is too high"],
    },

    paymentStatus: {
      type: String,
      enum: {
        values: [
          "CREATED",
          "PENDING",
          "PAID",
          "FAILED",
          "REFUNDED",
          "PARTIALLY_REFUNDED",
        ],
        message: "Invalid payment status",
      },
      default: "CREATED",
      index: true,
    },

    bookingStatus: {
      type: String,
      enum: {
        values: [
          "PENDING",
          "ACCEPTED",
          "ON_THE_WAY",
          "STARTED",
          "COMPLETED",
          "REJECTED",
          "CANCELLED",
        ],
        message: "Invalid booking status",
      },
      default: "PENDING",
      index: true,
    },

    cancellation: {
      type: cancellationSchema,
      default: () => ({}),
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

/*
  Common dashboard query:
  provider + status + scheduled date
*/
bookingSchema.index({
  provider: 1,
  bookingStatus: 1,
  scheduledDate: 1,
});

/*
  User booking history
*/
bookingSchema.index({
  user: 1,
  createdAt: -1,
});

/*
  Provider upcoming bookings
*/
bookingSchema.index({
  provider: 1,
  scheduledDate: 1,
});

/*
  Service booking lookup
*/
bookingSchema.index({
  service: 1,
  createdAt: -1,
});

export const Booking = mongoose.model("Booking", bookingSchema);