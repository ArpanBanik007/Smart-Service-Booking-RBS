import { Router } from "express";

import { verifyJWT } from "../middlewire/auth.middlewire.js";

import {
  becomeProvider,
  getMyProviderProfile,
  updateProviderProfile,
  updateServiceArea,
  updateAvailability,
  getProviderProfile,
  getNearbyProviders,
} from "../controller/provider.controller.js";

const router = Router();


// ============================================================
// PROVIDER APPLICATION
// ============================================================

router.post(
  "/become",
  verifyJWT,
  becomeProvider
);


// ============================================================
// MY PROVIDER PROFILE
// ============================================================

router.get(
  "/me",
  verifyJWT,
  getMyProviderProfile
);


// ============================================================
// PROVIDER PROFILE UPDATE
// ============================================================

router.patch(
  "/profile",
  verifyJWT,
  updateProviderProfile
);


// ============================================================
// SERVICE AREA
// ============================================================

router.patch(
  "/service-area",
  verifyJWT,
  updateServiceArea
);


// ============================================================
// AVAILABILITY
// ============================================================

router.patch(
  "/availability",
  verifyJWT,
  updateAvailability
);


// ============================================================
// NEARBY PROVIDERS
// ============================================================

router.get(
  "/nearby",
  getNearbyProviders
);


// ============================================================
// PUBLIC PROVIDER PROFILE
// IMPORTANT: Keep this AFTER /nearby
// ============================================================

router.get(
  "/:providerId",
  getProviderProfile
);


export default router;