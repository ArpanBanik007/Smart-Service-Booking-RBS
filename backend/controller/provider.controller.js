import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { Provider } from "../models/provider.model.js";
import { Address } from "../models/address.model.js";


// ============================================================
// 1. BECOME PROVIDER
// ============================================================

const becomeProvider = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const {
    businessName,
    description = "",
    serviceRadiusKm = 10,
    serviceArea,
  } = req.body;

  if (!businessName?.trim()) {
    throw new ApiError(400, "Business name is required");
  }

  if (businessName.trim().length < 2) {
    throw new ApiError(
      400,
      "Business name must be at least 2 characters"
    );
  }

  if (businessName.trim().length > 120) {
    throw new ApiError(
      400,
      "Business name cannot exceed 120 characters"
    );
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Your account is inactive");
  }

  if (user.isSuspended) {
    throw new ApiError(403, "Your account is suspended");
  }

  if (user.role === "admin") {
    throw new ApiError(
      400,
      "Admin cannot create a provider profile"
    );
  }

  if (user.role === "provider") {
    throw new ApiError(
      400,
      "You are already registered as a provider"
    );
  }

  const existingProvider = await Provider.findOne({
    user: userId,
  });

  if (existingProvider) {
    throw new ApiError(
      409,
      "Provider profile already exists"
    );
  }

  const radius = Number(serviceRadiusKm);

  if (!Number.isFinite(radius)) {
    throw new ApiError(
      400,
      "Service radius must be a valid number"
    );
  }

  if (radius < 1 || radius > 200) {
    throw new ApiError(
      400,
      "Service radius must be between 1 and 200 km"
    );
  }

  let validatedServiceArea = null;

  if (serviceArea) {
    const { type, coordinates } = serviceArea;

    if (type !== "Point") {
      throw new ApiError(
        400,
        "Service area type must be Point"
      );
    }

    if (
      !Array.isArray(coordinates) ||
      coordinates.length !== 2
    ) {
      throw new ApiError(
        400,
        "Coordinates must be [longitude, latitude]"
      );
    }

    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);

    if (
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude)
    ) {
      throw new ApiError(
        400,
        "Invalid geographic coordinates"
      );
    }

    if (
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
    ) {
      throw new ApiError(
        400,
        "Coordinates are outside valid geographic range"
      );
    }

    validatedServiceArea = {
      type: "Point",
      coordinates: [longitude, latitude],
    };
  }

  const provider = await Provider.create({
    user: userId,
    businessName: businessName.trim(),
    description: description?.trim() || "",
    serviceRadiusKm: radius,
    serviceArea: validatedServiceArea,
    verificationStatus: "pending",
    status: "active",
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      provider,
      "Provider profile created successfully. Please complete verification."
    )
  );
});


// ============================================================
// 2. GET MY PROVIDER PROFILE
// ============================================================

const getMyProviderProfile = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const provider = await Provider.findOne({
    user: userId,
  }).populate({
    path: "user",
    select: "fullName username email phone avatar isVerified role",
  });

  if (!provider) {
    throw new ApiError(
      404,
      "Provider profile not found"
    );
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      provider,
      "Provider profile fetched successfully"
    )
  );
});


// ============================================================
// 3. UPDATE PROVIDER PROFILE
// ============================================================

const updateProviderProfile = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const {
    businessName,
    description,
    serviceRadiusKm,
  } = req.body;

  const provider = await Provider.findOne({
    user: userId,
  });

  if (!provider) {
    throw new ApiError(
      404,
      "Provider profile not found"
    );
  }

  if (provider.status === "suspended") {
    throw new ApiError(
      403,
      "Your provider account is suspended"
    );
  }

  if (businessName !== undefined) {
    if (typeof businessName !== "string") {
      throw new ApiError(
        400,
        "Business name must be a string"
      );
    }

    const trimmedBusinessName = businessName.trim();

    if (trimmedBusinessName.length < 2) {
      throw new ApiError(
        400,
        "Business name must be at least 2 characters"
      );
    }

    if (trimmedBusinessName.length > 120) {
      throw new ApiError(
        400,
        "Business name cannot exceed 120 characters"
      );
    }

    provider.businessName = trimmedBusinessName;
  }

  if (description !== undefined) {
    if (typeof description !== "string") {
      throw new ApiError(
        400,
        "Description must be a string"
      );
    }

    const trimmedDescription = description.trim();

    if (trimmedDescription.length > 1000) {
      throw new ApiError(
        400,
        "Description cannot exceed 1000 characters"
      );
    }

    provider.description = trimmedDescription;
  }

  if (serviceRadiusKm !== undefined) {
    const radius = Number(serviceRadiusKm);

    if (!Number.isFinite(radius)) {
      throw new ApiError(
        400,
        "Service radius must be a valid number"
      );
    }

    if (radius < 1 || radius > 200) {
      throw new ApiError(
        400,
        "Service radius must be between 1 and 200 km"
      );
    }

    provider.serviceRadiusKm = radius;
  }

  await provider.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      provider,
      "Provider profile updated successfully"
    )
  );
});


// ============================================================
// 4. UPDATE SERVICE AREA
// ============================================================

const updateServiceArea = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const {
    coordinates,
    serviceRadiusKm,
  } = req.body;

  const provider = await Provider.findOne({
    user: userId,
  });

  if (!provider) {
    throw new ApiError(
      404,
      "Provider profile not found"
    );
  }

  if (provider.status === "suspended") {
    throw new ApiError(
      403,
      "Your provider account is suspended"
    );
  }

  if (
    !Array.isArray(coordinates) ||
    coordinates.length !== 2
  ) {
    throw new ApiError(
      400,
      "Coordinates must be [longitude, latitude]"
    );
  }

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);

  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude)
  ) {
    throw new ApiError(
      400,
      "Invalid geographic coordinates"
    );
  }

  if (
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new ApiError(
      400,
      "Coordinates are outside valid geographic range"
    );
  }

  if (serviceRadiusKm !== undefined) {
    const radius = Number(serviceRadiusKm);

    if (!Number.isFinite(radius)) {
      throw new ApiError(
        400,
        "Service radius must be a valid number"
      );
    }

    if (radius < 1 || radius > 200) {
      throw new ApiError(
        400,
        "Service radius must be between 1 and 200 km"
      );
    }

    provider.serviceRadiusKm = radius;
  }

  provider.serviceArea = {
    type: "Point",
    coordinates: [longitude, latitude],
  };

  await provider.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      provider,
      "Service area updated successfully"
    )
  );
});


// ============================================================
// 5. UPDATE AVAILABILITY
// ============================================================

const updateAvailability = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { availability } = req.body;

  if (
    !availability ||
    typeof availability !== "object" ||
    Array.isArray(availability)
  ) {
    throw new ApiError(
      400,
      "Availability must be a valid object"
    );
  }

  const provider = await Provider.findOne({
    user: userId,
  });

  if (!provider) {
    throw new ApiError(
      404,
      "Provider profile not found"
    );
  }

  if (provider.status === "suspended") {
    throw new ApiError(
      403,
      "Your provider account is suspended"
    );
  }

  const allowedDays = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  const providedDays = Object.keys(availability);

  for (const day of providedDays) {
    if (!allowedDays.includes(day)) {
      throw new ApiError(
        400,
        `Invalid availability day: ${day}`
      );
    }
  }

  for (const day of providedDays) {
    const dayData = availability[day];

    if (
      !dayData ||
      typeof dayData !== "object" ||
      Array.isArray(dayData)
    ) {
      throw new ApiError(
        400,
        `Invalid availability data for ${day}`
      );
    }

    const {
      isAvailable,
      startTime,
      endTime,
    } = dayData;

    if (typeof isAvailable !== "boolean") {
      throw new ApiError(
        400,
        `isAvailable must be boolean for ${day}`
      );
    }

    if (!isAvailable) {
      provider.availability[day] = {
        isAvailable: false,
        startTime: null,
        endTime: null,
      };

      continue;
    }

    if (!startTime || !endTime) {
      throw new ApiError(
        400,
        `Start time and end time are required for ${day}`
      );
    }

    if (
      typeof startTime !== "string" ||
      typeof endTime !== "string"
    ) {
      throw new ApiError(
        400,
        `Invalid time format for ${day}`
      );
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!timeRegex.test(startTime)) {
      throw new ApiError(
        400,
        `Invalid start time for ${day}. Use HH:mm format`
      );
    }

    if (!timeRegex.test(endTime)) {
      throw new ApiError(
        400,
        `Invalid end time for ${day}. Use HH:mm format`
      );
    }

    if (startTime >= endTime) {
      throw new ApiError(
        400,
        `End time must be after start time for ${day}`
      );
    }

    provider.availability[day] = {
      isAvailable: true,
      startTime,
      endTime,
    };
  }

  await provider.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      provider,
      "Availability updated successfully"
    )
  );
});


// ============================================================
// 6. GET PROVIDER PROFILE
// ============================================================

const getProviderProfile = asyncHandler(async (req, res) => {
  const { providerId } = req.params;

  if (!providerId) {
    throw new ApiError(
      400,
      "Provider ID is required"
    );
  }

  if (!mongoose.isValidObjectId(providerId)) {
    throw new ApiError(
      400,
      "Invalid provider ID"
    );
  }

  const provider = await Provider.findOne({
    _id: providerId,
    status: "active",
    verificationStatus: "approved",
  }).populate({
    path: "user",
    select: "fullName username avatar",
  });

  if (!provider) {
    throw new ApiError(
      404,
      "Provider not found"
    );
  }

  const publicProvider = {
    _id: provider._id,
    businessName: provider.businessName,
    description: provider.description,
    serviceArea: provider.serviceArea,
    serviceRadiusKm: provider.serviceRadiusKm,
    availability: provider.availability,
    rating: provider.rating,
    totalReviews: provider.totalReviews,
    completedBookings: provider.completedBookings,
    user: provider.user
      ? {
          _id: provider.user._id,
          fullName: provider.user.fullName,
          username: provider.user.username,
          avatar: provider.user.avatar,
        }
      : null,
  };

  return res.status(200).json(
    new ApiResponse(
      200,
      publicProvider,
      "Provider profile fetched successfully"
    )
  );
});


// ============================================================
// 7. GET NEARBY PROVIDERS
// ============================================================

const getNearbyProviders = asyncHandler(async (req, res) => {
  const {
    addressId,
    longitude,
    latitude,
    radius = 10,
    page = 1,
    limit = 10,
  } = req.query;

  // ----------------------------------------------------------
  // Validate radius
  // ----------------------------------------------------------

  const radiusKm = Number(radius);

  if (!Number.isFinite(radiusKm)) {
    throw new ApiError(
      400,
      "Radius must be a valid number"
    );
  }

  if (radiusKm < 1 || radiusKm > 200) {
    throw new ApiError(
      400,
      "Radius must be between 1 and 200 km"
    );
  }

  // ----------------------------------------------------------
  // Pagination
  // ----------------------------------------------------------

  const currentPage = Number(page);
  const itemsPerPage = Number(limit);

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
  // Resolve search coordinates
  // ----------------------------------------------------------

  let searchLongitude;
  let searchLatitude;

  if (addressId) {
    if (!mongoose.isValidObjectId(addressId)) {
      throw new ApiError(
        400,
        "Invalid address ID"
      );
    }

    if (!req.user?._id) {
      throw new ApiError(
        401,
        "Login is required when using addressId"
      );
    }

    const address = await Address.findOne({
      _id: addressId,
      user: req.user._id,
    }).lean();

    if (!address) {
      throw new ApiError(
        404,
        "Address not found"
      );
    }

    if (
      !address.coordinates ||
      !Array.isArray(address.coordinates.coordinates) ||
      address.coordinates.coordinates.length !== 2
    ) {
      throw new ApiError(
        400,
        "Address does not have valid coordinates"
      );
    }

    [
      searchLongitude,
      searchLatitude,
    ] = address.coordinates.coordinates;
  } else {
    const lng = Number(longitude);
    const lat = Number(latitude);

    if (!Number.isFinite(lng)) {
      throw new ApiError(
        400,
        "Valid longitude is required"
      );
    }

    if (lng < -180 || lng > 180) {
      throw new ApiError(
        400,
        "Longitude must be between -180 and 180"
      );
    }

    if (!Number.isFinite(lat)) {
      throw new ApiError(
        400,
        "Valid latitude is required"
      );
    }

    if (lat < -90 || lat > 90) {
      throw new ApiError(
        400,
        "Latitude must be between -90 and 90"
      );
    }

    searchLongitude = lng;
    searchLatitude = lat;
  }

  // ----------------------------------------------------------
  // Convert KM to meters
  // ----------------------------------------------------------

  const maxDistanceInMeters = radiusKm * 1000;

  // ----------------------------------------------------------
  // Nearby providers
  // ----------------------------------------------------------

  const providers = await Provider.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [
            searchLongitude,
            searchLatitude,
          ],
        },

        key: "serviceArea",

        distanceField: "distanceInMeters",

        maxDistance: maxDistanceInMeters,

        spherical: true,

        query: {
          status: "active",
          verificationStatus: "approved",
          serviceArea: {
            $ne: null,
          },
        },
      },
    },

    // --------------------------------------------------------
    // Provider's own service radius
    // --------------------------------------------------------

    {
      $match: {
        $expr: {
          $lte: [
            "$distanceInMeters",
            {
              $multiply: [
                "$serviceRadiusKm",
                1000,
              ],
            },
          ],
        },
      },
    },

    // --------------------------------------------------------
    // Distance in KM
    // --------------------------------------------------------

    {
      $addFields: {
        distanceInKm: {
          $round: [
            {
              $divide: [
                "$distanceInMeters",
                1000,
              ],
            },
            2,
          ],
        },
      },
    },

    // --------------------------------------------------------
    // Public fields
    // --------------------------------------------------------

    {
      $project: {
        _id: 1,
        businessName: 1,
        description: 1,
        serviceArea: 1,
        serviceRadiusKm: 1,
        rating: 1,
        totalReviews: 1,
        completedBookings: 1,
        distanceInKm: 1,
        user: 1,
      },
    },

    // --------------------------------------------------------
    // Pagination
    // --------------------------------------------------------

    {
      $skip: skip,
    },

    {
      $limit: itemsPerPage,
    },
  ]);

  // ----------------------------------------------------------
  // Count nearby providers
  // ----------------------------------------------------------

  const countResult = await Provider.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [
            searchLongitude,
            searchLatitude,
          ],
        },

        key: "serviceArea",

        distanceField: "distanceInMeters",

        maxDistance: maxDistanceInMeters,

        spherical: true,

        query: {
          status: "active",
          verificationStatus: "approved",
          serviceArea: {
            $ne: null,
          },
        },
      },
    },

    {
      $match: {
        $expr: {
          $lte: [
            "$distanceInMeters",
            {
              $multiply: [
                "$serviceRadiusKm",
                1000,
              ],
            },
          ],
        },
      },
    },

    {
      $count: "total",
    },
  ]);

  const totalProviders =
    countResult.length > 0
      ? countResult[0].total
      : 0;

  const totalPages = Math.ceil(
    totalProviders / itemsPerPage
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        providers,

        pagination: {
          currentPage,
          itemsPerPage,
          totalProviders,
          totalPages,
          hasNextPage:
            currentPage < totalPages,
          hasPreviousPage:
            currentPage > 1,
        },

        search: {
          latitude: searchLatitude,
          longitude: searchLongitude,
          radiusKm,
          source: addressId
            ? "saved_address"
            : "coordinates",
        },
      },
      "Nearby providers fetched successfully"
    )
  );
});


export {
  becomeProvider,
  getMyProviderProfile,
  updateProviderProfile,
  updateServiceArea,
  updateAvailability,
  getProviderProfile,
  getNearbyProviders,
};