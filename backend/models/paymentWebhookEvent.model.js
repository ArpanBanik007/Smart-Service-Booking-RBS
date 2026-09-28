import mongoose from "mongoose";

const paymentWebhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    event: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    processedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const PaymentWebhookEvent = mongoose.model(
  "PaymentWebhookEvent",
  paymentWebhookEventSchema
);