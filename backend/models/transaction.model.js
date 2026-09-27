import mongoose from "mongoose";

const transactionSchema =
    new mongoose.Schema(
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
                index: true,
            },

            provider: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Provider",
                index: true,
            },

            booking: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Booking",
                index: true,
            },

            payment: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Payment",
                index: true,
            },

            type: {
                type: String,
                enum: [
                    "PAYMENT",
                    "REFUND",
                    "PROVIDER_EARNING",
                    "PLATFORM_FEE",
                    "PAYOUT",
                ],
                required: true,
                index: true,
            },

            amount: {
                type: Number,
                required: true,
                min: 0,
            },

            status: {
                type: String,
                enum: [
                    "PENDING",
                    "COMPLETED",
                    "FAILED",
                    "REVERSED",
                ],
                default: "PENDING",
                index: true,
            },

            description: {
                type: String,
                trim: true,
                maxlength: 500,
            },

            referenceId: {
                type: String,
                trim: true,
                index: true,
            },
        },
        {
            timestamps: true,
        }
    );

transactionSchema.index({
    user: 1,
    createdAt: -1,
});

transactionSchema.index({
    provider: 1,
    createdAt: -1,
});

export const Transaction =
    mongoose.model(
        "Transaction",
        transactionSchema
    );