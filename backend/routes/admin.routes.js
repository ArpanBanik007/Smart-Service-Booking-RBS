import { Router } from "express";

import { verifyJWT } from "../middlewire/auth.middlewire.js";
import { authorizeRole } from "../middlewire/role.middlewire.js";

import {
    getDashboardStats,

    getAllUsers,
    getUserById,
    suspendUser,
    activateUser,

    getAllProviders,
    getProviderById,
    suspendProvider,
    activateProvider,
    approveProvider,

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
} from "../controller/admin.controller.js";

const router = Router();

router.use(verifyJWT, authorizeRole("admin"));

router.get("/dashboard", getDashboardStats);

router.get("/users", getAllUsers);
router.get("/users/:userId", getUserById);
router.patch("/users/:userId/suspend", suspendUser);
router.patch("/users/:userId/activate", activateUser);

router.get("/providers", getAllProviders);
router.get("/providers/:providerId", getProviderById);
router.patch("/providers/:providerId/suspend", suspendProvider);
router.patch("/providers/:providerId/activate", activateProvider);
router.patch("/providers/:providerId/approve", approveProvider);

router.get(
    "/verifications/pending",
    getPendingVerifications
);

router.patch(
    "/verifications/:verificationId/approve",
    approveVerification
);

router.patch(
    "/verifications/:verificationId/reject",
    rejectVerification
);

router.get("/bookings", getAllBookings);
router.get("/bookings/:bookingId", getBookingById);

router.get("/payments", getAllPayments);

router.get("/refunds", getAllRefunds);
router.patch(
    "/refunds/:refundId/process",
    processRefund
);

router.get("/reviews", getAllReviews);
router.patch(
    "/reviews/:reviewId/hide",
    hideReview
);
router.patch(
    "/reviews/:reviewId/show",
    showReview
);

export default router;