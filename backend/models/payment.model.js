import mongoose, { Schema } from "mongoose";

const paymentSchema = new Schema(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
      immutable: true,
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

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      trim: true,
      maxlength: [100, "Razorpay order ID is too long"],
      index: true,
    },

    razorpayPaymentId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      trim: true,
      maxlength: [100, "Razorpay payment ID is too long"],
      index: true,
    },

    razorpaySignature: {
      type: String,
      default: null,
      select: false,
      trim: true,
      maxlength: [500, "Payment signature is too long"],
    },

    amount: {
      type: Number,
      required: true,
      min: [0, "Payment amount cannot be negative"],
      max: [10000000, "Payment amount is too high"],
    },

    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: "INR",
      enum: ["INR"],
    },

    status: {
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

    method: {
      type: String,
      enum: {
        values: [
          "card",
          "upi",
          "netbanking",
          "wallet",
          "emi",
          "other",
        ],
        message: "Invalid payment method",
      },
      default: "other",
    },

    paidAt: {
      type: Date,
      default: null,
    },

    failureReason: {
      type: String,
      trim: true,
      maxlength: [500, "Failure reason cannot exceed 500 characters"],
      default: "",
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

paymentSchema.index({
  user: 1,
  createdAt: -1,
});

paymentSchema.index({
  provider: 1,
  createdAt: -1,
});

export const Payment = mongoose.model("Payment", paymentSchema);