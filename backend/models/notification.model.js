import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
      index: true,
    },

    type: {
      type: String,
      enum: {
        values: [
          "BOOKING_CREATED",
          "BOOKING_ACCEPTED",
          "BOOKING_REJECTED",
          "PROVIDER_ON_THE_WAY",
          "SERVICE_STARTED",
          "SERVICE_COMPLETED",
          "PAYMENT_SUCCESS",
          "REFUND_PROCESSED",
          "SYSTEM",
        ],
        message: "Invalid notification type",
      },
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [150, "Notification title cannot exceed 150 characters"],
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, "Notification message cannot exceed 500 characters"],
    },

    data: {
      type: Schema.Types.Mixed,
      default: {},
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

notificationSchema.index({
  recipient: 1,
  isRead: 1,
  createdAt: -1,
});

notificationSchema.index({
  recipient: 1,
  createdAt: -1,
});

export const Notification = mongoose.model(
  "Notification",
  notificationSchema
);