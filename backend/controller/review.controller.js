import mongoose from "mongoose";

import { Review } from "../models/review.model.js";
import { Booking } from "../models/booking.model.js";
import { Provider } from "../models/provider.model.js";

import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";


const createReview = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const {
        bookingId,
        rating,
        comment,
        images,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        throw new ApiError(400, "Invalid booking ID");
    }

    if (!rating || !Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
        throw new ApiError(400, "Rating must be an integer between 1 and 5");
    }

    if (comment && comment.trim().length > 1000) {
        throw new ApiError(400, "Comment cannot exceed 1000 characters");
    }

    const booking = await Booking.findOne({
        _id: bookingId,
        user: userId,
    }).select(
        "user provider bookingStatus"
    );

    if (!booking) {
        throw new ApiError(404, "Booking not found");
    }

    if (booking.bookingStatus !== "COMPLETED") {
        throw new ApiError(
            400,
            "You can review only after the service is completed"
        );
    }

    if (!booking.provider) {
        throw new ApiError(400, "Provider not found for this booking");
    }

    const existingReview = await Review.findOne({
        booking: booking._id,
        user: userId,
    });

    if (existingReview) {
        throw new ApiError(409, "You have already reviewed this booking");
    }

    const provider = await Provider.findById(booking.provider);

    if (!provider) {
        throw new ApiError(404, "Provider not found");
    }

    const review = await Review.create({
        booking: booking._id,
        user: userId,
        provider: booking.provider,
        rating: Number(rating),
        comment: comment?.trim(),
        images: Array.isArray(images) ? images : [],
    });

    const ratingStats = await Review.aggregate([
        {
            $match: {
                provider: booking.provider,
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

    const stats = ratingStats[0];

    await Provider.findByIdAndUpdate(
        booking.provider,
        {
            $set: {
                rating: Number(stats?.averageRating || 0),
                totalReviews: Number(stats?.totalReviews || 0),
            },
        }
    );

    const createdReview = await Review.findById(review._id)
        .populate("provider", "businessName rating totalReviews")
        .populate("booking", "bookingNumber scheduledDate")
        .populate("user", "username fullName avatar");

    return res.status(201).json(
        new ApiResponse(
            201,
            createdReview,
            "Review created successfully"
        )
    );
});


const getMyReviews = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const [reviews, totalReviews] = await Promise.all([
        Review.find({
            user: userId,
        })
            .populate(
                "provider",
                "businessName rating totalReviews"
            )
            .populate(
                "booking",
                "bookingNumber scheduledDate bookingStatus"
            )
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),

        Review.countDocuments({
            user: userId,
        }),
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
                    totalPages: Math.ceil(totalReviews / limit),
                },
            },
            "My reviews fetched successfully"
        )
    );
});


const updateReview = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { reviewId } = req.params;
    const {
        rating,
        comment,
        images,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        throw new ApiError(400, "Invalid review ID");
    }

    if (
        rating !== undefined &&
        (
            !Number.isInteger(Number(rating)) ||
            Number(rating) < 1 ||
            Number(rating) > 5
        )
    ) {
        throw new ApiError(400, "Rating must be an integer between 1 and 5");
    }

    if (comment !== undefined && comment.trim().length > 1000) {
        throw new ApiError(400, "Comment cannot exceed 1000 characters");
    }

    const review = await Review.findOne({
        _id: reviewId,
        user: userId,
    });

    if (!review) {
        throw new ApiError(404, "Review not found");
    }

    if (rating !== undefined) {
        review.rating = Number(rating);
    }

    if (comment !== undefined) {
        review.comment = comment.trim();
    }

    if (images !== undefined) {
        if (!Array.isArray(images)) {
            throw new ApiError(400, "Images must be an array");
        }

        if (images.length > 5) {
            throw new ApiError(400, "Maximum 5 images are allowed");
        }

        review.images = images;
    }

    await review.save();

    const ratingStats = await Review.aggregate([
        {
            $match: {
                provider: review.provider,
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

    const stats = ratingStats[0];

    await Provider.findByIdAndUpdate(
        review.provider,
        {
            $set: {
                rating: Number(stats?.averageRating || 0),
                totalReviews: Number(stats?.totalReviews || 0),
            },
        }
    );

    const updatedReview = await Review.findById(review._id)
        .populate(
            "provider",
            "businessName rating totalReviews"
        )
        .populate(
            "booking",
            "bookingNumber scheduledDate"
        )
        .populate(
            "user",
            "username fullName avatar"
        );

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedReview,
            "Review updated successfully"
        )
    );
});


const deleteReview = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { reviewId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        throw new ApiError(400, "Invalid review ID");
    }

    const review = await Review.findOne({
        _id: reviewId,
        user: userId,
    });

    if (!review) {
        throw new ApiError(404, "Review not found");
    }

    const providerId = review.provider;

    await Review.findByIdAndDelete(review._id);

    const ratingStats = await Review.aggregate([
        {
            $match: {
                provider: providerId,
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

    const stats = ratingStats[0];

    await Provider.findByIdAndUpdate(
        providerId,
        {
            $set: {
                rating: Number(stats?.averageRating || 0),
                totalReviews: Number(stats?.totalReviews || 0),
            },
        }
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Review deleted successfully"
        )
    );
});


const getProviderReviews = asyncHandler(async (req, res) => {
    const { providerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
        throw new ApiError(400, "Invalid provider ID");
    }

    const provider = await Provider.findById(providerId)
        .select("_id businessName rating totalReviews");

    if (!provider) {
        throw new ApiError(404, "Provider not found");
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const filter = {
        provider: providerId,
        isVisible: true,
    };

    const [reviews, totalReviews] = await Promise.all([
        Review.find(filter)
            .populate(
                "user",
                "username fullName avatar"
            )
            .populate(
                "booking",
                "bookingNumber scheduledDate"
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
                provider,
                reviews,
                pagination: {
                    page,
                    limit,
                    totalReviews,
                    totalPages: Math.ceil(totalReviews / limit),
                },
            },
            "Provider reviews fetched successfully"
        )
    );
});


export {
    createReview,
    getMyReviews,
    updateReview,
    deleteReview,
    getProviderReviews,
};