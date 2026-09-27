import mongoose, { Schema } from "mongoose";

const bookingStatusHistorySchema = new Schema(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      immutable: true,
      index: true,
    },

    status: {
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
      required: true,
    },

    changedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
      index: true,
    },

    note: {
      type: String,
      trim: true,
      maxlength: [500, "Note cannot exceed 500 characters"],
      default: "",
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

bookingStatusHistorySchema.index({
  booking: 1,
  createdAt: 1,
});

bookingStatusHistorySchema.index({
  changedBy: 1,
  createdAt: -1,
});

export const BookingStatusHistory = mongoose.model(
  "BookingStatusHistory",
  bookingStatusHistorySchema
);