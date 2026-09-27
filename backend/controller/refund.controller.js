import mongoose from "mongoose";

import { Refund } from "../models/refund.model.js";
import { Payment } from "../models/payment.model.js";
import { Booking } from "../models/booking.model.js";
import { Transaction } from "../models/transaction.model.js";

import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import getRazorpay from "../utils/razorpay.js";

const requestRefund = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const {
        bookingId,
        amount,
        reason,
    } = req.body;

    if (!mongoose.isValidObjectId(bookingId)) {
        throw new ApiError(
            400,
            "Invalid booking ID"
        );
    }

    if (
        !reason ||
        reason.trim().length < 3
    ) {
        throw new ApiError(
            400,
            "Refund reason is required"
        );
    }

    const booking =
        await Booking.findOne({
            _id: bookingId,
            user: userId,
        });

    if (!booking) {
        throw new ApiError(
            404,
            "Booking not found"
        );
    }

    if (
        booking.paymentStatus !== "PAID"
    ) {
        throw new ApiError(
            400,
            "Only paid bookings can be refunded"
        );
    }

    if (
        booking.bookingStatus !==
            "CANCELLED" &&
        booking.bookingStatus !==
            "REJECTED"
    ) {
        throw new ApiError(
            400,
            "Refund can only be requested for cancelled or rejected bookings"
        );
    }

    const payment =
        await Payment.findOne({
            booking: booking._id,
            user: userId,
            status: "PAID",
        });

    if (!payment) {
        throw new ApiError(
            404,
            "Successful payment not found"
        );
    }

    const existingRefund =
        await Refund.findOne({
            payment: payment._id,
            status: {
                $in: [
                    "REQUESTED",
                    "PROCESSING",
                    "COMPLETED",
                ],
            },
        });

    if (existingRefund) {
        throw new ApiError(
            400,
            "Refund request already exists"
        );
    }

    const refundAmount =
        amount === undefined
            ? payment.amount
            : Number(amount);

    if (
        !Number.isFinite(
            refundAmount
        ) ||
        refundAmount <= 0
    ) {
        throw new ApiError(
            400,
            "Invalid refund amount"
        );
    }

    if (
        refundAmount > payment.amount
    ) {
        throw new ApiError(
            400,
            "Refund amount cannot exceed payment amount"
        );
    }

    const refund =
        await Refund.create({
            payment: payment._id,
            booking: booking._id,
            requestedBy: userId,
            amount: refundAmount,
            reason: reason.trim(),
            status: "REQUESTED",
        });

    return res.status(201).json(
        new ApiResponse(
            201,
            refund,
            "Refund request submitted successfully"
        )
    );
});

const getMyRefunds =
    asyncHandler(async (req, res) => {
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
            requestedBy: req.user._id,
        };

        const allowedStatuses = [
            "REQUESTED",
            "PROCESSING",
            "COMPLETED",
            "FAILED",
            "CANCELLED",
        ];

        if (req.query.status) {
            if (
                !allowedStatuses.includes(
                    req.query.status
                )
            ) {
                throw new ApiError(
                    400,
                    "Invalid refund status"
                );
            }

            filter.status =
                req.query.status;
        }

        const [
            refunds,
            total,
        ] = await Promise.all([
            Refund.find(filter)
                .populate({
                    path: "booking",
                    select:
                        "bookingNumber scheduledDate totalAmount bookingStatus paymentStatus",
                })
                .populate({
                    path: "payment",
                    select:
                        "amount currency status razorpayPaymentId razorpayOrderId",
                })
                .sort({
                    createdAt: -1,
                })
                .skip(skip)
                .limit(limit),

            Refund.countDocuments(
                filter
            ),
        ]);

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    refunds,
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
                "Refunds fetched successfully"
            )
        );
    });

const getRefundById =
    asyncHandler(async (req, res) => {
        const { refundId } =
            req.params;

        if (
            !mongoose.isValidObjectId(
                refundId
            )
        ) {
            throw new ApiError(
                400,
                "Invalid refund ID"
            );
        }

        const refund =
            await Refund.findOne({
                _id: refundId,
                requestedBy:
                    req.user._id,
            })
                .populate({
                    path: "booking",
                    select:
                        "bookingNumber scheduledDate totalAmount bookingStatus paymentStatus",
                })
                .populate({
                    path: "payment",
                    select:
                        "amount currency status razorpayPaymentId razorpayOrderId",
                });

        if (!refund) {
            throw new ApiError(
                404,
                "Refund not found"
            );
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                refund,
                "Refund fetched successfully"
            )
        );
    });

const getRefundRequests =
    asyncHandler(async (req, res) => {
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

        const filter = {};

        const allowedStatuses = [
            "REQUESTED",
            "PROCESSING",
            "COMPLETED",
            "FAILED",
            "CANCELLED",
        ];

        if (req.query.status) {
            if (
                !allowedStatuses.includes(
                    req.query.status
                )
            ) {
                throw new ApiError(
                    400,
                    "Invalid refund status"
                );
            }

            filter.status =
                req.query.status;
        }

        const [
            refunds,
            total,
        ] = await Promise.all([
            Refund.find(filter)
                .populate({
                    path: "requestedBy",
                    select:
                        "fullName username email phone",
                })
                .populate({
                    path: "booking",
                    select:
                        "bookingNumber scheduledDate totalAmount bookingStatus paymentStatus",
                })
                .populate({
                    path: "payment",
                    select:
                        "amount currency status razorpayPaymentId razorpayOrderId",
                })
                .sort({
                    createdAt: -1,
                })
                .skip(skip)
                .limit(limit),

            Refund.countDocuments(
                filter
            ),
        ]);

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    refunds,
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
                "Refund requests fetched successfully"
            )
        );
    });

const processRefund =
    asyncHandler(async (req, res) => {
        const razorpay =
            getRazorpay();

        if (!razorpay) {
            throw new ApiError(
                503,
                "Payment service is currently unavailable"
            );
        }

        const { refundId } =
            req.params;

        if (
            !mongoose.isValidObjectId(
                refundId
            )
        ) {
            throw new ApiError(
                400,
                "Invalid refund ID"
            );
        }

        const refund =
            await Refund.findOne({
                _id: refundId,
                status: "REQUESTED",
            });

        if (!refund) {
            throw new ApiError(
                404,
                "Refund request not found or already processed"
            );
        }

        const payment =
            await Payment.findById(
                refund.payment
            );

        if (!payment) {
            throw new ApiError(
                404,
                "Payment not found"
            );
        }

        if (
            payment.status !== "PAID"
        ) {
            throw new ApiError(
                400,
                "Payment is not eligible for refund"
            );
        }

        if (
            !payment.razorpayPaymentId
        ) {
            throw new ApiError(
                400,
                "Razorpay payment ID not found"
            );
        }

        refund.status =
            "PROCESSING";

        await refund.save();

        try {
            const razorpayRefund =
                await razorpay.payments.refund(
                    payment.razorpayPaymentId,
                    {
                        amount:
                            Math.round(
                                refund.amount *
                                    100
                            ),
                        notes: {
                            bookingId:
                                refund.booking.toString(),
                            refundId:
                                refund._id.toString(),
                        },
                    }
                );

            if (
                !razorpayRefund?.id
            ) {
                throw new Error(
                    "Razorpay refund ID was not returned"
                );
            }

            const session =
                await mongoose.startSession();

            try {
                session.startTransaction();

                const updatedRefund =
                    await Refund.findOneAndUpdate(
                        {
                            _id: refund._id,
                            status:
                                "PROCESSING",
                        },
                        {
                            $set: {
                                status:
                                    "COMPLETED",
                                razorpayRefundId:
                                    razorpayRefund.id,
                                processedAt:
                                    new Date(),
                                failureReason:
                                    undefined,
                            },
                        },
                        {
                            new: true,
                            session,
                        }
                    );

                if (!updatedRefund) {
                    throw new ApiError(
                        409,
                        "Refund is already being processed"
                    );
                }

                const isFullRefund =
                    Math.round(
                        refund.amount *
                            100
                    ) ===
                    Math.round(
                        payment.amount *
                            100
                    );

                payment.status =
                    isFullRefund
                        ? "REFUNDED"
                        : "PARTIALLY_REFUNDED";

                await payment.save({
                    session,
                });

                const booking =
                    await Booking.findById(
                        refund.booking
                    ).session(session);

                if (!booking) {
                    throw new ApiError(
                        404,
                        "Booking not found"
                    );
                }

                booking.paymentStatus =
                    isFullRefund
                        ? "REFUNDED"
                        : "PARTIALLY_REFUNDED";

                await booking.save({
                    session,
                });

                await Transaction.create(
                    [
                        {
                            user:
                                payment.user,
                            provider:
                                payment.provider,
                            booking:
                                payment.booking,
                            payment:
                                payment._id,
                            type: "REFUND",
                            amount:
                                refund.amount,
                            status:
                                "COMPLETED",
                            description:
                                `Refund for booking ${booking.bookingNumber}`,
                            referenceId:
                                razorpayRefund.id,
                        },
                    ],
                    {
                        session,
                    }
                );

                await session.commitTransaction();

                return res.status(200).json(
                    new ApiResponse(
                        200,
                        {
                            refundId:
                                updatedRefund._id,
                            razorpayRefundId:
                                razorpayRefund.id,
                            status:
                                updatedRefund.status,
                            amount:
                                updatedRefund.amount,
                        },
                        "Refund processed successfully"
                    )
                );
            } catch (error) {
                await session.abortTransaction();
                throw error;
            } finally {
                session.endSession();
            }
        } catch (error) {
            refund.status =
                "FAILED";

            refund.failureReason =
                error?.error
                    ?.description ||
                error?.message ||
                "Razorpay refund failed";

            await refund.save();

            throw new ApiError(
                502,
                error?.error
                    ?.description ||
                    "Unable to process refund"
            );
        }
    });

const rejectRefund =
    asyncHandler(async (req, res) => {
        const { refundId } =
            req.params;

        const { reason } = req.body;

        if (
            !mongoose.isValidObjectId(
                refundId
            )
        ) {
            throw new ApiError(
                400,
                "Invalid refund ID"
            );
        }

        if (
            !reason ||
            reason.trim().length < 3
        ) {
            throw new ApiError(
                400,
                "Refund rejection reason is required"
            );
        }

        const refund =
            await Refund.findOne({
                _id: refundId,
                status: "REQUESTED",
            });

        if (!refund) {
            throw new ApiError(
                404,
                "Refund request not found or already processed"
            );
        }

        refund.status =
            "CANCELLED";

        refund.failureReason =
            reason.trim();

        refund.processedAt =
            new Date();

        await refund.save();

        return res.status(200).json(
            new ApiResponse(
                200,
                refund,
                "Refund request rejected successfully"
            )
        );
    });

export {
    requestRefund,
    getMyRefunds,
    getRefundById,
    getRefundRequests,
    processRefund,
    rejectRefund,
};