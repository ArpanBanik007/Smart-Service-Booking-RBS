import mongoose from "mongoose";

import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

import { Category } from "../models/category.model.js";


// ============================================================
// 1. CREATE CATEGORY
// ADMIN ONLY
// ============================================================

const createCategory = asyncHandler(async (req, res) => {
  const { name, slug, description = "", icon = "", image = "" } =
    req.body;

  // ----------------------------------------------------------
  // Required fields
  // ----------------------------------------------------------

  if (!name?.trim()) {
    throw new ApiError(400, "Category name is required");
  }

  if (!slug?.trim()) {
    throw new ApiError(400, "Category slug is required");
  }

  // ----------------------------------------------------------
  // Normalize
  // ----------------------------------------------------------

  const categoryName = name.trim();
  const categorySlug = slug.trim().toLowerCase();

  // ----------------------------------------------------------
  // Validate name
  // ----------------------------------------------------------

  if (categoryName.length < 2) {
    throw new ApiError(
      400,
      "Category name must be at least 2 characters"
    );
  }

  if (categoryName.length > 80) {
    throw new ApiError(
      400,
      "Category name cannot exceed 80 characters"
    );
  }

  // ----------------------------------------------------------
  // Validate slug
  // ----------------------------------------------------------

  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  if (!slugRegex.test(categorySlug)) {
    throw new ApiError(
      400,
      "Slug can only contain lowercase letters, numbers and hyphens"
    );
  }

  if (categorySlug.length < 2 || categorySlug.length > 100) {
    throw new ApiError(
      400,
      "Category slug must be between 2 and 100 characters"
    );
  }

  // ----------------------------------------------------------
  // Validate description
  // ----------------------------------------------------------

  if (typeof description !== "string") {
    throw new ApiError(
      400,
      "Description must be a string"
    );
  }

  if (description.trim().length > 500) {
    throw new ApiError(
      400,
      "Description cannot exceed 500 characters"
    );
  }

  // ----------------------------------------------------------
  // Check duplicate name
  // ----------------------------------------------------------

  const existingName = await Category.findOne({
    name: categoryName,
  }).collation({
    locale: "en",
    strength: 2,
  });

  if (existingName) {
    throw new ApiError(
      409,
      "A category with this name already exists"
    );
  }

  // ----------------------------------------------------------
  // Check duplicate slug
  // ----------------------------------------------------------

  const existingSlug = await Category.findOne({
    slug: categorySlug,
  });

  if (existingSlug) {
    throw new ApiError(
      409,
      "A category with this slug already exists"
    );
  }

  // ----------------------------------------------------------
  // Create category
  // ----------------------------------------------------------

  const category = await Category.create({
    name: categoryName,
    slug: categorySlug,
    description: description.trim(),
    icon: typeof icon === "string" ? icon.trim() : "",
    image: typeof image === "string" ? image.trim() : "",
    isActive: true,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      category,
      "Category created successfully"
    )
  );
});


// ============================================================
// 2. GET ADMIN CATEGORIES
// ADMIN ONLY
// Includes active + inactive categories
// ============================================================

const getAdminCategories = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    status,
  } = req.query;

  const currentPage = Number(page);
  const itemsPerPage = Number(limit);

  // ----------------------------------------------------------
  // Pagination validation
  // ----------------------------------------------------------

  if (
    !Number.isInteger(currentPage) ||
    currentPage < 1
  ) {
    throw new ApiError(
      400,
      "Page must be a positive integer"
    );
  }

  if (
    !Number.isInteger(itemsPerPage) ||
    itemsPerPage < 1 ||
    itemsPerPage > 50
  ) {
    throw new ApiError(
      400,
      "Limit must be between 1 and 50"
    );
  }

  const skip = (currentPage - 1) * itemsPerPage;

  // ----------------------------------------------------------
  // Build filter
  // ----------------------------------------------------------

  const filter = {};

  if (search?.trim()) {
    const searchRegex = new RegExp(
      search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );

    filter.$or = [
      { name: searchRegex },
      { slug: searchRegex },
    ];
  }

  // ----------------------------------------------------------
  // Status filter
  // ----------------------------------------------------------

  if (status !== undefined) {
    if (status === "active") {
      filter.isActive = true;
    } else if (status === "inactive") {
      filter.isActive = false;
    } else {
      throw new ApiError(
        400,
        "Status must be active or inactive"
      );
    }
  }

  // ----------------------------------------------------------
  // Query
  // ----------------------------------------------------------

  const [categories, totalCategories] =
    await Promise.all([
      Category.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(itemsPerPage),

      Category.countDocuments(filter),
    ]);

  const totalPages = Math.ceil(
    totalCategories / itemsPerPage
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        categories,

        pagination: {
          currentPage,
          itemsPerPage,
          totalCategories,
          totalPages,
          hasNextPage: currentPage < totalPages,
          hasPreviousPage: currentPage > 1,
        },
      },
      "Admin categories fetched successfully"
    )
  );
});


// ============================================================
// 3. GET PUBLIC CATEGORIES
// PUBLIC
// Only active categories
// ============================================================

const getPublicCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({
    isActive: true,
  })
    .select(
      "_id name slug description icon image"
    )
    .sort({ name: 1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      categories,
      "Active categories fetched successfully"
    )
  );
});


// ============================================================
// 4. GET CATEGORY BY ID
// ADMIN ONLY
// Can view active/inactive
// ============================================================

const getCategoryById = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  // ----------------------------------------------------------
  // Validate ObjectId
  // ----------------------------------------------------------

  if (!mongoose.isValidObjectId(categoryId)) {
    throw new ApiError(
      400,
      "Invalid category ID"
    );
  }

  const category = await Category.findById(
    categoryId
  );

  if (!category) {
    throw new ApiError(
      404,
      "Category not found"
    );
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      category,
      "Category fetched successfully"
    )
  );
});


// ============================================================
// 5. UPDATE CATEGORY
// ADMIN ONLY
// ============================================================

const updateCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  if (!mongoose.isValidObjectId(categoryId)) {
    throw new ApiError(
      400,
      "Invalid category ID"
    );
  }

  const category = await Category.findById(
    categoryId
  );

  if (!category) {
    throw new ApiError(
      404,
      "Category not found"
    );
  }

  const {
    name,
    slug,
    description,
    icon,
    image,
  } = req.body;

  // ----------------------------------------------------------
  // Update name
  // ----------------------------------------------------------

  if (name !== undefined) {
    if (typeof name !== "string") {
      throw new ApiError(
        400,
        "Category name must be a string"
      );
    }

    const categoryName = name.trim();

    if (categoryName.length < 2) {
      throw new ApiError(
        400,
        "Category name must be at least 2 characters"
      );
    }

    if (categoryName.length > 80) {
      throw new ApiError(
        400,
        "Category name cannot exceed 80 characters"
      );
    }

    const duplicateName = await Category.findOne({
      _id: { $ne: categoryId },
      name: categoryName,
    }).collation({
      locale: "en",
      strength: 2,
    });

    if (duplicateName) {
      throw new ApiError(
        409,
        "A category with this name already exists"
      );
    }

    category.name = categoryName;
  }

  // ----------------------------------------------------------
  // Update slug
  // ----------------------------------------------------------

  if (slug !== undefined) {
    if (typeof slug !== "string") {
      throw new ApiError(
        400,
        "Category slug must be a string"
      );
    }

    const categorySlug = slug.trim().toLowerCase();

    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    if (!slugRegex.test(categorySlug)) {
      throw new ApiError(
        400,
        "Slug can only contain lowercase letters, numbers and hyphens"
      );
    }

    if (
      categorySlug.length < 2 ||
      categorySlug.length > 100
    ) {
      throw new ApiError(
        400,
        "Category slug must be between 2 and 100 characters"
      );
    }

    const duplicateSlug = await Category.findOne({
      _id: { $ne: categoryId },
      slug: categorySlug,
    });

    if (duplicateSlug) {
      throw new ApiError(
        409,
        "A category with this slug already exists"
      );
    }

    category.slug = categorySlug;
  }

  // ----------------------------------------------------------
  // Update description
  // ----------------------------------------------------------

  if (description !== undefined) {
    if (typeof description !== "string") {
      throw new ApiError(
        400,
        "Description must be a string"
      );
    }

    const categoryDescription = description.trim();

    if (categoryDescription.length > 500) {
      throw new ApiError(
        400,
        "Description cannot exceed 500 characters"
      );
    }

    category.description = categoryDescription;
  }

  // ----------------------------------------------------------
  // Update icon
  // ----------------------------------------------------------

  if (icon !== undefined) {
    if (typeof icon !== "string") {
      throw new ApiError(
        400,
        "Icon must be a string"
      );
    }

    category.icon = icon.trim();
  }

  // ----------------------------------------------------------
  // Update image
  // ----------------------------------------------------------

  if (image !== undefined) {
    if (typeof image !== "string") {
      throw new ApiError(
        400,
        "Image must be a string"
      );
    }

    category.image = image.trim();
  }

  await category.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      category,
      "Category updated successfully"
    )
  );
});


// ============================================================
// 6. TOGGLE CATEGORY STATUS
// ADMIN ONLY
// ============================================================

const toggleCategoryStatus = asyncHandler(
  async (req, res) => {
    const { categoryId } = req.params;

    if (!mongoose.isValidObjectId(categoryId)) {
      throw new ApiError(
        400,
        "Invalid category ID"
      );
    }

    const category = await Category.findById(
      categoryId
    );

    if (!category) {
      throw new ApiError(
        404,
        "Category not found"
      );
    }

    category.isActive = !category.isActive;

    await category.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        category,
        `Category ${
          category.isActive
            ? "activated"
            : "deactivated"
        } successfully`
      )
    );
  }
);


// ============================================================
// 7. DELETE CATEGORY
// ADMIN ONLY
// ============================================================

const deleteCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  if (!mongoose.isValidObjectId(categoryId)) {
    throw new ApiError(
      400,
      "Invalid category ID"
    );
  }

  const category = await Category.findById(
    categoryId
  );

  if (!category) {
    throw new ApiError(
      404,
      "Category not found"
    );
  }

  // ----------------------------------------------------------
  // IMPORTANT:
  // Before hard deleting a category, later we should check
  // whether services are using this category.
  //
  // For now, prevent accidental deletion by recommending
  // deactivation.
  // ----------------------------------------------------------

  if (category.isActive) {
    throw new ApiError(
      400,
      "Please deactivate the category before deleting it"
    );
  }

  await Category.deleteOne({
    _id: categoryId,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      null,
      "Category deleted successfully"
    )
  );
});


// ============================================================
// EXPORTS
// ============================================================

export {
  createCategory,
  getAdminCategories,
  getPublicCategories,
  getCategoryById,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
};