import { Router } from "express";

import { verifyJWT } from "../middlewire/auth.middlewire.js";

import {
    createReview,
    getMyReviews,
    updateReview,
    deleteReview,
    getProviderReviews,
} from "../controller/review.controller.js";

const router = Router();

router.post("/", verifyJWT, createReview);

router.get("/my-reviews", verifyJWT, getMyReviews);

router.patch("/:reviewId", verifyJWT, updateReview);

router.delete("/:reviewId", verifyJWT, deleteReview);

router.get("/provider/:providerId", getProviderReviews);

export default router;