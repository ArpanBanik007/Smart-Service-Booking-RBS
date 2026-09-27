import mongoose from "mongoose";

import { User } from "../models/user.models.js";
import { Provider } from "../models/provider.model.js";
import { ProviderVerification } from "../models/providerVerification.model.js";
import { Booking } from "../models/booking.model.js";
import { Payment } from "../models/payment.model.js";
import { Refund } from "../models/refund.model.js";
import { Review } from "../models/review.model.js";
import { Transaction } from "../models/transaction.model.js";

import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import getRazorpay from "../utils/razorpay.js";


const getPagination = (req) => {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(
        Math.max(Number(req.query.limit) || 20, 1),
        50
    );

    return {
        page,
        limit,
        skip: (page - 1) * limit,
    };
};


const getDashboardStats = asyncHandler(async (req, res) => {
    const [
        totalUsers,
        totalProviders,
        totalBookings,
        completedBookings,
        pendingVerifications,
        pendingRefunds,
        revenueResult,
    ] = await Promise.all([
        User.countDocuments({
            role: "user",
        }),

        Provider.countDocuments(),

        Booking.countDocuments(),

        Booking.countDocuments({
            bookingStatus: "COMPLETED",
        }),

        ProviderVerification.countDocuments({
            status: "PENDING",
        }),

        Refund.countDocuments({
            status: {
                $in: ["REQUESTED", "PROCESSING"],
            },
        }),

        Transaction.aggregate([
            {
                $match: {
                    type: "PAYMENT",
                    status: "COMPLETED",
                },
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: "$amount",
                    },
                },
            },
        ]),
    ]);

    const revenue = Number(
        revenueResult[0]?.totalRevenue || 0
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalUsers,
                totalProviders,
                totalBookings,
                completedBookings,
                revenue,
                pendingVerifications,
                refunds: pendingRefunds,
            },
            "Dashboard statistics fetched successfully"
        )
    );
});


const getAllUsers = asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const filter = {
        role: "user",
    };

    if (req.query.isSuspended !== undefined) {
        filter.isSuspended = req.query.isSuspended === "true";
    }

    if (req.query.isActive !== undefined) {
        filter.isActive = req.query.isActive === "true";
    }

    if (req.query.search) {
        const search = req.query.search.trim();

        filter.$or = [
            {
                username: {
                    $regex: search,
                    $options: "i",
                },
            },
            {
                fullName: {
                    $regex: search,
                    $options: "i",
                },
            },
            {
                email: {
                    $regex: search,
                    $options: "i",
                },
            },
        ];
    }

    const [users, totalUsers] = await Promise.all([
        User.find(filter)
            .select(
                "-password -refreshToken -passwordResetToken -emailVerificationToken"
            )
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),

        User.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                users,
                pagination: {
                    page,
                    limit,
                    totalUsers,
                    totalPages: Math.ceil(
                        totalUsers / limit
                    ),
                },
            },
            "Users fetched successfully"
        )
    );
});


const getUserById = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const user = await User.findById(userId)
        .select(
            "-password -refreshToken -passwordResetToken -emailVerificationToken"
        );

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            user,
            "User fetched successfully"
        )
    );
});


const suspendUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    if (req.user._id.toString() === userId) {
        throw new ApiError(
            400,
            "Admin cannot suspend their own account"
        );
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.role === "admin") {
        throw new ApiError(
            403,
            "Admin accounts cannot be suspended from this endpoint"
        );
    }

    user.isSuspended = true;
    user.isActive = false;

    await user.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "User suspended successfully"
        )
    );
});


const activateUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    user.isSuspended = false;
    user.isActive = true;

    await user.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "User activated successfully"
        )
    );
});


const getAllProviders = asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const filter = {};

    if (req.query.verificationStatus) {
        filter.verificationStatus =
            req.query.verificationStatus;
    }

    if (req.query.status) {
        filter.status = req.query.status;
    }

    if (req.query.search) {
        filter.businessName = {
            $regex: req.query.search.trim(),
            $options: "i",
        };
    }

    const [providers, totalProviders] = await Promise.all([
        Provider.find(filter)
            .populate(
                "user",
                "username fullName email phone avatar isActive isSuspended"
            )
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),

        Provider.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                providers,
                pagination: {
                    page,
                    limit,
                    totalProviders,
                    totalPages: Math.ceil(
                        totalProviders / limit
                    ),
                },
            },
            "Providers fetched successfully"
        )
    );
});


const getProviderById = asyncHandler(async (req, res) => {
    const { providerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
        throw new ApiError(400, "Invalid provider ID");
    }

    const provider = await Provider.findById(providerId)
        .populate(
            "user",
            "username fullName email phone avatar isActive isSuspended"
        );

    if (!provider) {
        throw new ApiError(404, "Provider not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            provider,
            "Provider fetched successfully"
        )
    );
});


const suspendProvider = asyncHandler(async (req, res) => {
    const { providerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
        throw new ApiError(400, "Invalid provider ID");
    }

    const provider = await Provider.findById(providerId);

    if (!provider) {
        throw new ApiError(404, "Provider not found");
    }

    provider.status = "suspended";

    await provider.save();

    await User.findByIdAndUpdate(
        provider.user,
        {
            $set: {
                isSuspended: true,
                isActive: false,
            },
        }
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Provider suspended successfully"
        )
    );
});


const activateProvider = asyncHandler(async (req, res) => {
    const { providerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
        throw new ApiError(400, "Invalid provider ID");
    }

    const provider = await Provider.findById(providerId);

    if (!provider) {
        throw new ApiError(404, "Provider not found");
    }

    if (provider.verificationStatus !== "approved") {
        throw new ApiError(
            400,
            "Only approved providers can be activated"
        );
    }

    provider.status = "active";

    await provider.save();

    await User.findByIdAndUpdate(
        provider.user,
        {
            $set: {
                isSuspended: false,
                isActive: true,
                role: "provider",
            },
        }
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Provider activated successfully"
        )
    );
});


const getPendingVerifications = asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const filter = {
        status: "PENDING",
    };

    const [verifications, totalVerifications] =
        await Promise.all([
            ProviderVerification.find(filter)
                .populate({
                    path: "provider",
                    populate: {
                        path: "user",
                        select: "username fullName email phone avatar",
                    },
                })
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(limit),

            ProviderVerification.countDocuments(filter),
        ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                verifications,
                pagination: {
                    page,
                    limit,
                    totalVerifications,
                    totalPages: Math.ceil(
                        totalVerifications / limit
                    ),
                },
            },
            "Pending verifications fetched successfully"
        )
    );
});


const approveVerification = asyncHandler(async (req, res) => {
    const { verificationId } = req.params;
    const adminId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(verificationId)) {
        throw new ApiError(
            400,
            "Invalid verification ID"
        );
    }

    const session = await mongoose.startSession();

    try {
        let verification;

        await session.withTransaction(async () => {
            verification = await ProviderVerification.findById(
                verificationId
            ).session(session);

            if (!verification) {
                throw new ApiError(
                    404,
                    "Verification request not found"
                );
            }

            if (verification.status !== "PENDING") {
                throw new ApiError(
                    400,
                    "Verification has already been processed"
                );
            }

            const provider = await Provider.findById(
                verification.provider
            ).session(session);

            if (!provider) {
                throw new ApiError(
                    404,
                    "Provider not found"
                );
            }

            const user = await User.findById(
                provider.user
            ).session(session);

            if (!user) {
                throw new ApiError(
                    404,
                    "Provider user not found"
                );
            }

            verification.status = "APPROVED";
            verification.reviewedAt = new Date();
            verification.reviewedBy = adminId;

            await verification.save({ session });

            provider.verificationStatus = "approved";
            provider.status = "active";

            await provider.save({ session });

            user.role = "provider";
            user.isSuspended = false;
            user.isActive = true;

            await user.save({ session });
        });

        return res.status(200).json(
            new ApiResponse(
                200,
                null,
                "Provider verification approved successfully"
            )
        );
    } finally {
        await session.endSession();
    }
});


const rejectVerification = asyncHandler(async (req, res) => {
    const { verificationId } = req.params;
    const { reason } = req.body;
    const adminId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(verificationId)) {
        throw new ApiError(
            400,
            "Invalid verification ID"
        );
    }

    if (!reason || reason.trim().length < 3) {
        throw new ApiError(
            400,
            "Rejection reason is required"
        );
    }

    const verification = await ProviderVerification.findById(
        verificationId
    );

    if (!verification) {
        throw new ApiError(
            404,
            "Verification request not found"
        );
    }

    if (verification.status !== "PENDING") {
        throw new ApiError(
            400,
            "Verification has already been processed"
        );
    }

    verification.status = "REJECTED";
    verification.reviewedAt = new Date();
    verification.reviewedBy = adminId;

    await verification.save();

    await Provider.findByIdAndUpdate(
        verification.provider,
        {
            $set: {
                verificationStatus: "rejected",
            },
        }
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Provider verification rejected"
        )
    );
});


const getAllBookings = asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const filter = {};

    if (req.query.bookingStatus) {
        filter.bookingStatus = req.query.bookingStatus;
    }

    if (req.query.paymentStatus) {
        filter.paymentStatus = req.query.paymentStatus;
    }

    const [bookings, totalBookings] = await Promise.all([
        Booking.find(filter)
            .populate(
                "user",
                "username fullName email phone"
            )
            .populate(
                "provider",
                "businessName rating"
            )
            .populate(
                "service",
                "title price duration"
            )
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),

        Booking.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                bookings,
                pagination: {
                    page,
                    limit,
                    totalBookings,
                    totalPages: Math.ceil(
                        totalBookings / limit
                    ),
                },
            },
            "Bookings fetched successfully"
        )
    );
});


const getBookingById = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        throw new ApiError(400, "Invalid booking ID");
    }

    const booking = await Booking.findById(bookingId)
        .populate(
            "user",
            "username fullName email phone"
        )
        .populate(
            "provider",
            "businessName rating totalReviews"
        )
        .populate(
            "service",
            "title description price duration"
        )
        .populate(
            "address",
            "label addressLine city state pincode landmark coordinates"
        );

    if (!booking) {
        throw new ApiError(404, "Booking not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            booking,
            "Booking fetched successfully"
        )
    );
});


const getAllPayments = asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const filter = {};

    if (req.query.status) {
        filter.status = req.query.status;
    }

    if (req.query.method) {
        filter.method = req.query.method;
    }

    const [payments, totalPayments] = await Promise.all([
        Payment.find(filter)
            .populate(
                "user",
                "username fullName email"
            )
            .populate(
                "provider",
                "businessName"
            )
            .populate(
                "booking",
                "bookingNumber bookingStatus paymentStatus"
            )
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),

        Payment.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                payments,
                pagination: {
                    page,
                    limit,
                    totalPayments,
                    totalPages: Math.ceil(
                        totalPayments / limit
                    ),
                },
            },
            "Payments fetched successfully"
        )
    );
});


const getAllRefunds = asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const filter = {};

    if (req.query.status) {
        filter.status = req.query.status;
    }

    const [refunds, totalRefunds] = await Promise.all([
        Refund.find(filter)
            .populate(
                "requestedBy",
                "username fullName email"
            )
            .populate(
                "booking",
                "bookingNumber bookingStatus paymentStatus"
            )
            .populate(
                "payment",
                "razorpayPaymentId amount currency status"
            )
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),

        Refund.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                refunds,
                pagination: {
                    page,
                    limit,
                    totalRefunds,
                    totalPages: Math.ceil(
                        totalRefunds / limit
                    ),
                },
            },
            "Refunds fetched successfully"
        )
    );
});


const processRefund = asyncHandler(async (req, res) => {
    const { refundId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(refundId)) {
        throw new ApiError(400, "Invalid refund ID");
    }

    const razorpay = getRazorpay();

    if (!razorpay) {
        throw new ApiError(
            503,
            "Payment service is currently unavailable"
        );
    }

    const refund = await Refund.findById(refundId);

    if (!refund) {
        throw new ApiError(404, "Refund request not found");
    }

    if (refund.status !== "REQUESTED") {
        throw new ApiError(
            400,
            "Only requested refunds can be processed"
        );
    }

    const payment = await Payment.findById(refund.payment);

    if (!payment) {
        throw new ApiError(404, "Payment not found");
    }

    if (payment.status !== "PAID") {
        throw new ApiError(
            400,
            "Only paid payments can be refunded"
        );
    }

    if (!payment.razorpayPaymentId) {
        throw new ApiError(
            400,
            "Razorpay payment ID is missing"
        );
    }

    refund.status = "PROCESSING";

    await refund.save();

    try {
        const razorpayRefund = await razorpay.payments.refund(
            payment.razorpayPaymentId,
            {
                amount: Math.round(refund.amount * 100),
                notes: {
                    bookingId: refund.booking.toString(),
                    refundId: refund._id.toString(),
                },
            }
        );

        const session = await mongoose.startSession();

        try {
            await session.withTransaction(async () => {
                const refundAmount = Number(refund.amount);
                const paymentAmount = Number(payment.amount);

                refund.status = "COMPLETED";
                refund.razorpayRefundId =
                    razorpayRefund.id;
                refund.processedAt = new Date();

                await refund.save({ session });

                const newPaymentStatus =
                    refundAmount >= paymentAmount
                        ? "REFUNDED"
                        : "PARTIALLY_REFUNDED";

                await Payment.findByIdAndUpdate(
                    payment._id,
                    {
                        $set: {
                            status: newPaymentStatus,
                        },
                    },
                    { session }
                );

                await Booking.findByIdAndUpdate(
                    refund.booking,
                    {
                        $set: {
                            paymentStatus: newPaymentStatus,
                        },
                    },
                    { session }
                );

                await Transaction.create(
                    [
                        {
                            user: refund.requestedBy,
                            provider: payment.provider,
                            booking: refund.booking,
                            payment: payment._id,
                            type: "REFUND",
                            amount: refundAmount,
                            status: "COMPLETED",
                            description:
                                "Booking payment refund",
                            referenceId:
                                razorpayRefund.id,
                        },
                    ],
                    { session }
                );
            });
        } finally {
            await session.endSession();
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    refundId: refund._id,
                    razorpayRefundId:
                        razorpayRefund.id,
                    status: "COMPLETED",
                },
                "Refund processed successfully"
            )
        );
    } catch (error) {
        await Refund.findByIdAndUpdate(
            refund._id,
            {
                $set: {
                    status: "FAILED",
                    failureReason:
                        error?.message ||
                        "Refund processing failed",
                    processedAt: new Date(),
                },
            }
        );

        throw new ApiError(
            500,
            "Refund processing failed"
        );
    }
});


const getAllReviews = asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const filter = {};

    if (req.query.isVisible !== undefined) {
        filter.isVisible =
            req.query.isVisible === "true";
    }

    if (req.query.providerId) {
        if (
            !mongoose.Types.ObjectId.isValid(
                req.query.providerId
            )
        ) {
            throw new ApiError(
                400,
                "Invalid provider ID"
            );
        }

        filter.provider = req.query.providerId;
    }

    const [reviews, totalReviews] = await Promise.all([
        Review.find(filter)
            .populate(
                "user",
                "username fullName email avatar"
            )
            .populate(
                "provider",
                "businessName rating totalReviews"
            )
            .populate(
                "booking",
                "bookingNumber bookingStatus"
            )
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),

        Review.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                reviews,
                pagination: {
                    page,
                    limit,
                    totalReviews,
                    totalPages: Math.ceil(
                        totalReviews / limit
                    ),
                },
            },
            "Reviews fetched successfully"
        )
    );
});


const updateProviderReviewStats = async (providerId) => {
    const stats = await Review.aggregate([
        {
            $match: {
                provider: new mongoose.Types.ObjectId(
                    providerId
                ),
                isVisible: true,
            },
        },
        {
            $group: {
                _id: "$provider",
                averageRating: {
                    $avg: "$rating",
                },
                totalReviews: {
                    $sum: 1,
                },
            },
        },
    ]);

    await Provider.findByIdAndUpdate(
        providerId,
        {
            $set: {
                rating: Number(
                    stats[0]?.averageRating || 0
                ),
                totalReviews: Number(
                    stats[0]?.totalReviews || 0
                ),
            },
        }
    );
};


const hideReview = asyncHandler(async (req, res) => {
    const { reviewId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        throw new ApiError(400, "Invalid review ID");
    }

    const review = await Review.findById(reviewId);

    if (!review) {
        throw new ApiError(404, "Review not found");
    }

    if (!review.isVisible) {
        throw new ApiError(
            400,
            "Review is already hidden"
        );
    }

    review.isVisible = false;

    await review.save();

    await updateProviderReviewStats(review.provider);

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Review hidden successfully"
        )
    );
});


const showReview = asyncHandler(async (req, res) => {
    const { reviewId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        throw new ApiError(400, "Invalid review ID");
    }

    const review = await Review.findById(reviewId);

    if (!review) {
        throw new ApiError(404, "Review not found");
    }

    if (review.isVisible) {
        throw new ApiError(
            400,
            "Review is already visible"
        );
    }

    review.isVisible = true;

    await review.save();

    await updateProviderReviewStats(review.provider);

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Review shown successfully"
        )
    );
});


export {
    getDashboardStats,

    getAllUsers,
    getUserById,
    suspendUser,
    activateUser,

    getAllProviders,
    getProviderById,
    suspendProvider,
    activateProvider,

    getPendingVerifications,
    approveVerification,
    rejectVerification,

    getAllBookings,
    getBookingById,

    getAllPayments,

    getAllRefunds,
    processRefund,

    getAllReviews,
    hideReview,
    showReview,
};