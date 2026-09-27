import { Router } from "express";

import { verifyJWT } from "../middlewire/auth.middlewire.js";
import { upload } from "../middlewire/multer.middlewire.js";

import {
  submitVerification,
  getMyVerification,
  resubmitVerification,
  getPendingVerifications,
  getVerificationById,
  approveProviderVerification,
  rejectProviderVerification,
} from "../controller/providerVerification.controller.js";

import {authorizeRole} from "../middlewire/role.middlewire.js"

const router = Router();


// ============================================================
// PROVIDER SIDE
// ============================================================

// Submit verification
router.post(
  "/submit",
  verifyJWT,
  authorizeRole("user", "provider"),
  upload.array("documents", 10),
  submitVerification
);


// Get my latest verification
router.get(
  "/me",
  verifyJWT,
  authorizeRole("user", "provider"),
  getMyVerification
);


// Resubmit after rejection
router.post(
  "/resubmit",
  verifyJWT,
  authorizeRole("user", "provider"),
  upload.array("documents", 10),
  resubmitVerification
);


// ============================================================
// ADMIN SIDE
// ============================================================

// Get pending verifications
router.get(
  "/pending",
  verifyJWT,
  authorizeRole("admin"),
  getPendingVerifications
);


// Get specific verification
router.get(
  "/:verificationId",
  verifyJWT,
  authorizeRole("admin"),
  getVerificationById
);


// Approve verification
router.patch(
  "/:verificationId/approve",
  verifyJWT,
  authorizeRole("admin"),
  approveProviderVerification
);


// Reject verification
router.patch(
  "/:verificationId/reject",
  verifyJWT,
  authorizeRole("admin"),
  rejectProviderVerification
);


export default router;