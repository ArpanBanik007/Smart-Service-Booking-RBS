import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
    {
        payment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment",
            required: true,
            immutable: true,
            index: true,
        },

        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
            required: true,
            immutable: true,
            index: true,
        },

        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            immutable: true,
            index: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        reason: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 500,
        },

        razorpayRefundId: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
        },

        status: {
            type: String,
            enum: [
                "REQUESTED",
                "PROCESSING",
                "COMPLETED",
                "FAILED",
                "CANCELLED",
            ],
            default: "REQUESTED",
            index: true,
        },

        processedAt: {
            type: Date,
        },

        failureReason: {
            type: String,
            trim: true,
            maxlength: 500,
        },
    },
    {
        timestamps: true,
    }
);

refundSchema.index({
    requestedBy: 1,
    createdAt: -1,
});

refundSchema.index({
    status: 1,
    createdAt: -1,
});

export const Refund = mongoose.model(
    "Refund",
    refundSchema
);