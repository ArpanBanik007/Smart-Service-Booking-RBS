import { Router } from "express";

import { verifyJWT } from "../middlewire/auth.middlewire.js";
import { authorizeRole } from "../middlewire/role.middlewire.js";

import {
  createBooking,
  getMyBookings,
  getMyBookingById,
  cancelBooking,

  getProviderBookings,
  getProviderBookingById,
  acceptBooking,
  rejectBooking,

  markOnTheWay,
  startService,
  completeService,

  getBookingStatusHistory,
} from "../controller/booking.controller.js";

const router = Router();


// ============================================================
// PROVIDER ROUTES
// ============================================================

router.get(
  "/provider",
  verifyJWT,
  authorizeRole("provider"),
  getProviderBookings
);

router.get(
  "/provider/:bookingId",
  verifyJWT,
  authorizeRole("provider"),
  getProviderBookingById
);

router.patch(
  "/provider/:bookingId/accept",
  verifyJWT,
  authorizeRole("provider"),
  acceptBooking
);

router.patch(
  "/provider/:bookingId/reject",
  verifyJWT,
  authorizeRole("provider"),
  rejectBooking
);

router.patch(
  "/provider/:bookingId/on-the-way",
  verifyJWT,
  authorizeRole("provider"),
  markOnTheWay
);

router.patch(
  "/provider/:bookingId/start",
  verifyJWT,
  authorizeRole("provider"),
  startService
);

router.patch(
  "/provider/:bookingId/complete",
  verifyJWT,
  authorizeRole("provider"),
  completeService
);


// ============================================================
// CUSTOMER ROUTES
// ============================================================

router.post(
  "/",
  verifyJWT,
  authorizeRole("user"),
  createBooking
);

router.get(
  "/",
  verifyJWT,
  authorizeRole("user"),
  getMyBookings
);

router.get(
  "/:bookingId/history",
  verifyJWT,
  authorizeRole(
    "user",
    "provider",
    "admin"
  ),
  getBookingStatusHistory
);

router.get(
  "/:bookingId",
  verifyJWT,
  authorizeRole("user"),
  getMyBookingById
);

router.patch(
  "/:bookingId/cancel",
  verifyJWT,
  authorizeRole("user"),
  cancelBooking
);


export default router;