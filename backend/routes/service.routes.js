import { Router } from "express";

import { verifyJWT } from "../middlewire/auth.middlewire.js";
import { authorizeRole } from "../middlewire/role.middlewire.js";

import {
  createService,
  getMyServices,
  getMyServiceById,
  updateService,
  deleteService,
  toggleServiceStatus,
  getServices,
  getServiceById,
  getServicesByCategory,
  getServicesByProvider,
  searchServices,
  getSearchSuggestions,
} from "../controller/service.controller.js";

const router = Router();


// ============================================================
// PROVIDER ROUTES
// ============================================================

router.post(
  "/",
  verifyJWT,
  authorizeRole("provider"),
  createService
);

router.get(
  "/my-services",
  verifyJWT,
  authorizeRole("provider"),
  getMyServices
);

router.get(
  "/my-services/:serviceId",
  verifyJWT,
  authorizeRole("provider"),
  getMyServiceById
);

router.patch(
  "/my-services/:serviceId",
  verifyJWT,
  authorizeRole("provider"),
  updateService
);

router.patch(
  "/my-services/:serviceId/toggle-status",
  verifyJWT,
  authorizeRole("provider"),
  toggleServiceStatus
);

router.delete(
  "/my-services/:serviceId",
  verifyJWT,
  authorizeRole("provider"),
  deleteService
);


// ============================================================
// PUBLIC / CUSTOMER ROUTES
// ============================================================

router.get(
  "/",
  getServices
);

router.get(
  "/search",
  searchServices
);

router.get(
  "/suggestions",
  getSearchSuggestions
);

router.get(
  "/category/:categoryId",
  getServicesByCategory
);

router.get(
  "/provider/:providerId",
  getServicesByProvider
);

router.get(
  "/:serviceId",
  getServiceById
);


export default router;