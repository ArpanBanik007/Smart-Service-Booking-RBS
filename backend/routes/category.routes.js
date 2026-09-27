import { Router } from "express";

import { verifyJWT } from "../middlewire/auth.middlewire.js";
import { authorizeRole } from "../middlewire/role.middlewire.js";

import {
  createCategory,
  getAdminCategories,
  getPublicCategories,
  getCategoryById,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
} from "../controller/category.controller.js";

const router = Router();

// ========================================
// PUBLIC ROUTES
// ========================================

// Get all active categories
router.get("/", getPublicCategories);


// ========================================
// ADMIN ROUTES
// ========================================

// Get all categories for admin
// Includes active + inactive
router.get(
  "/admin",
  verifyJWT,
  authorizeRole("admin"),
  getAdminCategories
);

// Create new category
router.post(
  "/",
  verifyJWT,
  authorizeRole("admin"),
  createCategory
);

// Get single category
router.get(
  "/:categoryId",
  verifyJWT,
  authorizeRole("admin"),
  getCategoryById
);

// Update category
router.patch(
  "/:categoryId",
  verifyJWT,
  authorizeRole("admin"),
  updateCategory
);

// Toggle active/inactive
router.patch(
  "/:categoryId/toggle-status",
  verifyJWT,
  authorizeRole("admin"),
  toggleCategoryStatus
);

// Delete category
router.delete(
  "/:categoryId",
  verifyJWT,
  authorizeRole("admin"),
  deleteCategory
);

export default router;