import { Router } from "express";

import { verifyJWT } from "../middlewire/auth.middlewire.js";

import {
  createAddress,
  getMyAddresses,
  getAddressById,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../controller/address.controller.js";

const router = Router();


// ============================================================
// ADDRESS ROUTES
// ============================================================


// Create new address
// POST /api/v1/addresses
router.post(
  "/",
  verifyJWT,
  createAddress
);


// Get all my addresses
// GET /api/v1/addresses
router.get(
  "/",
  verifyJWT,
  getMyAddresses
);


// Get single my address
// GET /api/v1/addresses/:addressId
router.get(
  "/:addressId",
  verifyJWT,
  getAddressById
);


// Update my address
// PATCH /api/v1/addresses/:addressId
router.patch(
  "/:addressId",
  verifyJWT,
  updateAddress
);


// Set address as default
// PATCH /api/v1/addresses/:addressId/default
router.patch(
  "/:addressId/default",
  verifyJWT,
  setDefaultAddress
);


// Delete my address
// DELETE /api/v1/addresses/:addressId
router.delete(
  "/:addressId",
  verifyJWT,
  deleteAddress
);


export default router;