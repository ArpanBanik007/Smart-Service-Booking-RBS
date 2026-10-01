import mongoose from "mongoose";

import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

import { Service } from "../models/service.model.js";
import { Provider } from "../models/provider.model.js";
import { Category } from "../models/category.model.js";
import { extractSearchTokens, escapeRegex } from "../utils/searchHelper.js";



// ============================================================
// Helper Functions
// ============================================================

// Check valid MongoDB ObjectId
const validateObjectId = (id, fieldName = "ID") => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }
};




// Validate price
const validatePrice = (price) => {
  if (price === undefined) return;

  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    throw new ApiError(400, "Price must be a valid non-negative number");
  }
};


// Validate duration
const validateDuration = (duration) => {
  if (duration === undefined) return;

  if (
    !Number.isInteger(duration) ||
    duration <= 0 ||
    duration > 1440
  ) {
    throw new ApiError(
      400,
      "Duration must be a positive integer between 1 and 1440 minutes"
    );
  }
};


// Validate GeoJSON Point
const validateCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    throw new ApiError(
      400,
      "Coordinates must be [longitude, latitude]"
    );
  }

  const [longitude, latitude] = coordinates;

  if (
    typeof longitude !== "number" ||
    typeof latitude !== "number" ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude)
  ) {
    throw new ApiError(400, "Invalid coordinates");
  }

  if (longitude < -180 || longitude > 180) {
    throw new ApiError(400, "Longitude must be between -180 and 180");
  }

  if (latitude < -90 || latitude > 90) {
    throw new ApiError(400, "Latitude must be between -90 and 90");
  }
};


// Get provider belonging to logged-in user
const getMyProvider = async (userId) => {
  const provider = await Provider.findOne({
    user: userId,
  });

  if (!provider) {
    throw new ApiError(
      404,
      "Provider profile not found. Please become a provider first."
    );
  }

  if (provider.status === "suspended") {
    throw new ApiError(
      403,
      "Your provider account is suspended"
    );
  }

  if (provider.verificationStatus !== "approved") {
    throw new ApiError(
      403,
      "Provider verification is not approved yet"
    );
  }

  return provider;
};


// ============================================================
// PROVIDER
// ============================================================


// 1. Create Service
const createService = asyncHandler(async (req, res) => {
  const {
    category,
    title,
    description,
    price,
    duration,
    images,
    serviceArea,
  } = req.body;


  // ----------------------------------------
  // Basic validation
  // ----------------------------------------

  if (!title || title.trim().length < 2) {
    throw new ApiError(
      400,
      "Service title is required and must contain at least 2 characters"
    );
  }

  if (title.trim().length > 150) {
    throw new ApiError(
      400,
      "Service title cannot exceed 150 characters"
    );
  }

  if (!category) {
    throw new ApiError(400, "Category is required");
  }

  validateObjectId(category, "category ID");

  validatePrice(price);
  validateDuration(duration);


  // ----------------------------------------
  // Get provider
  // ----------------------------------------

  const provider = await getMyProvider(req.user._id);


  // ----------------------------------------
  // Check category
  // ----------------------------------------

  const categoryExists = await Category.findOne({
    _id: category,
    isActive: true,
  });

  if (!categoryExists) {
    throw new ApiError(
      404,
      "Category not found or inactive"
    );
  }


  // ----------------------------------------
  // Service Area
  // ----------------------------------------

  let finalServiceArea = provider.serviceArea;

  if (serviceArea) {
    if (
      !serviceArea.type ||
      serviceArea.type !== "Point"
    ) {
      throw new ApiError(
        400,
        "serviceArea type must be Point"
      );
    }

    validateCoordinates(serviceArea.coordinates);

    finalServiceArea = {
      type: "Point",
      coordinates: serviceArea.coordinates,
    };
  }


  // ----------------------------------------
  // Create service
  // ----------------------------------------

  const service = await Service.create({
    provider: provider._id,
    category,
    title: title.trim(),
    description: description?.trim() || "",
    price,
    duration,
    images: Array.isArray(images) ? images : [],
    serviceArea: finalServiceArea,
    isActive: true,
  });


  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        service,
        "Service created successfully"
      )
    );
});


// ============================================================


// 2. Get My Services
const getMyServices = asyncHandler(async (req, res) => {
  const provider = await getMyProvider(req.user._id);


  const page = Math.max(
    parseInt(req.query.page, 10) || 1,
    1
  );

  const limit = Math.min(
    Math.max(parseInt(req.query.limit, 10) || 10, 1),
    50
  );

  const skip = (page - 1) * limit;


  const [services, total] = await Promise.all([
    Service.find({
      provider: provider._id,
    })
      .populate(
        "category",
        "name slug description icon image"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Service.countDocuments({
      provider: provider._id,
    }),
  ]);


  return res.status(200).json(
    new ApiResponse(
      200,
      {
        services,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPreviousPage: page > 1,
        },
      },
      "Services fetched successfully"
    )
  );
});


// ============================================================


// 3. Get My Service By ID
const getMyServiceById = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;

  validateObjectId(serviceId, "service ID");

  const provider = await getMyProvider(req.user._id);


  const service = await Service.findOne({
    _id: serviceId,
    provider: provider._id,
  }).populate(
    "category",
    "name slug description icon image"
  );


  if (!service) {
    throw new ApiError(
      404,
      "Service not found"
    );
  }


  return res.status(200).json(
    new ApiResponse(
      200,
      service,
      "Service fetched successfully"
    )
  );
});


// ============================================================


// 4. Update Service
const updateService = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;

  validateObjectId(serviceId, "service ID");

  const provider = await getMyProvider(req.user._id);


  const service = await Service.findOne({
    _id: serviceId,
    provider: provider._id,
  });


  if (!service) {
    throw new ApiError(
      404,
      "Service not found"
    );
  }


  const {
    category,
    title,
    description,
    price,
    duration,
    images,
    serviceArea,
  } = req.body;


  // ----------------------------------------
  // Category
  // ----------------------------------------

  if (category !== undefined) {
    validateObjectId(category, "category ID");

    const categoryExists = await Category.findOne({
      _id: category,
      isActive: true,
    });

    if (!categoryExists) {
      throw new ApiError(
        404,
        "Category not found or inactive"
      );
    }

    service.category = category;
  }


  // ----------------------------------------
  // Title
  // ----------------------------------------

  if (title !== undefined) {
    if (
      typeof title !== "string" ||
      title.trim().length < 2
    ) {
      throw new ApiError(
        400,
        "Service title must contain at least 2 characters"
      );
    }

    if (title.trim().length > 150) {
      throw new ApiError(
        400,
        "Service title cannot exceed 150 characters"
      );
    }

    service.title = title.trim();
  }


  // ----------------------------------------
  // Description
  // ----------------------------------------

  if (description !== undefined) {
    if (
      typeof description !== "string" ||
      description.length > 2000
    ) {
      throw new ApiError(
        400,
        "Description cannot exceed 2000 characters"
      );
    }

    service.description = description.trim();
  }


  // ----------------------------------------
  // Price
  // ----------------------------------------

  if (price !== undefined) {
    validatePrice(price);
    service.price = price;
  }


  // ----------------------------------------
  // Duration
  // ----------------------------------------

  if (duration !== undefined) {
    validateDuration(duration);
    service.duration = duration;
  }


  // ----------------------------------------
  // Images
  // ----------------------------------------

  if (images !== undefined) {
    if (!Array.isArray(images)) {
      throw new ApiError(
        400,
        "Images must be an array"
      );
    }

    if (images.length > 10) {
      throw new ApiError(
        400,
        "Maximum 10 images are allowed"
      );
    }

    service.images = images;
  }


  // ----------------------------------------
  // Service Area
  // ----------------------------------------

  if (serviceArea !== undefined) {
    if (
      !serviceArea ||
      serviceArea.type !== "Point"
    ) {
      throw new ApiError(
        400,
        "serviceArea must be a GeoJSON Point"
      );
    }

    validateCoordinates(serviceArea.coordinates);

    service.serviceArea = {
      type: "Point",
      coordinates: serviceArea.coordinates,
    };
  }


  await service.save();


  return res.status(200).json(
    new ApiResponse(
      200,
      service,
      "Service updated successfully"
    )
  );
});


// ============================================================


// 5. Delete Service
const deleteService = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;

  validateObjectId(serviceId, "service ID");

  const provider = await getMyProvider(req.user._id);


  const service = await Service.findOne({
    _id: serviceId,
    provider: provider._id,
  });


  if (!service) {
    throw new ApiError(
      404,
      "Service not found"
    );
  }


  await Service.deleteOne({
    _id: service._id,
  });


  return res.status(200).json(
    new ApiResponse(
      200,
      null,
      "Service deleted successfully"
    )
  );
});


// ============================================================


// 6. Toggle Service Status
const toggleServiceStatus = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;

  validateObjectId(serviceId, "service ID");

  const provider = await getMyProvider(req.user._id);


  const service = await Service.findOne({
    _id: serviceId,
    provider: provider._id,
  });


  if (!service) {
    throw new ApiError(
      404,
      "Service not found"
    );
  }


  service.isActive = !service.isActive;

  await service.save();


  return res.status(200).json(
    new ApiResponse(
      200,
      service,
      `Service ${
        service.isActive ? "activated" : "deactivated"
      } successfully`
    )
  );
});


// ============================================================
// CUSTOMER
// ============================================================


// 7. Get Services
//
// Filters:
// category
// provider
// price
// location
// rating
// duration
//
// Pagination:
// ?page=1&limit=10
// ============================================================

const getServices = asyncHandler(async (req, res) => {
  const {
    category,
    provider,
    minPrice,
    maxPrice,
    minDuration,
    maxDuration,
    minRating,
    lat,
    lng,
    radius,
    page: pageQuery,
    limit: limitQuery,
  } = req.query;


  const page = Math.max(
    parseInt(pageQuery, 10) || 1,
    1
  );

  const limit = Math.min(
    Math.max(parseInt(limitQuery, 10) || 10, 1),
    50
  );


  // ----------------------------------------
  // Validate IDs
  // ----------------------------------------

  if (category) {
    validateObjectId(category, "category ID");
  }

  if (provider) {
    validateObjectId(provider, "provider ID");
  }


  // ----------------------------------------
  // Validate price
  // ----------------------------------------

  if (minPrice !== undefined) {
    const value = Number(minPrice);

    if (!Number.isFinite(value) || value < 0) {
      throw new ApiError(
        400,
        "Invalid minPrice"
      );
    }
  }

  if (maxPrice !== undefined) {
    const value = Number(maxPrice);

    if (!Number.isFinite(value) || value < 0) {
      throw new ApiError(
        400,
        "Invalid maxPrice"
      );
    }
  }


  if (
    minPrice !== undefined &&
    maxPrice !== undefined &&
    Number(minPrice) > Number(maxPrice)
  ) {
    throw new ApiError(
      400,
      "minPrice cannot be greater than maxPrice"
    );
  }


  // ----------------------------------------
  // Validate duration
  // ----------------------------------------

  if (minDuration !== undefined) {
    const value = Number(minDuration);

    if (!Number.isInteger(value) || value <= 0) {
      throw new ApiError(
        400,
        "Invalid minDuration"
      );
    }
  }

  if (maxDuration !== undefined) {
    const value = Number(maxDuration);

    if (!Number.isInteger(value) || value <= 0) {
      throw new ApiError(
        400,
        "Invalid maxDuration"
      );
    }
  }


  // ----------------------------------------
  // Validate rating
  // ----------------------------------------

  if (minRating !== undefined) {
    const value = Number(minRating);

    if (
      !Number.isFinite(value) ||
      value < 0 ||
      value > 5
    ) {
      throw new ApiError(
        400,
        "minRating must be between 0 and 5"
      );
    }
  }


  // ----------------------------------------
  // Build normal filters
  // ----------------------------------------

  const matchStage = {
    isActive: true,
  };


  if (category) {
    matchStage.category =
      new mongoose.Types.ObjectId(category);
  }


  if (provider) {
    matchStage.provider =
      new mongoose.Types.ObjectId(provider);
  }


  if (
    minPrice !== undefined ||
    maxPrice !== undefined
  ) {
    matchStage.price = {};

    if (minPrice !== undefined) {
      matchStage.price.$gte = Number(minPrice);
    }

    if (maxPrice !== undefined) {
      matchStage.price.$lte = Number(maxPrice);
    }
  }


  if (
    minDuration !== undefined ||
    maxDuration !== undefined
  ) {
    matchStage.duration = {};

    if (minDuration !== undefined) {
      matchStage.duration.$gte = Number(minDuration);
    }

    if (maxDuration !== undefined) {
      matchStage.duration.$lte = Number(maxDuration);
    }
  }


  // ----------------------------------------
  // Rating filter
  // ----------------------------------------

  const providerMatch = {
    status: "active",
    verificationStatus: "approved",
  };


  if (minRating !== undefined) {
    providerMatch.rating = {
      $gte: Number(minRating),
    };
  }


  // ----------------------------------------
  // Location validation
  // ----------------------------------------

  const hasLocation =
    lat !== undefined &&
    lng !== undefined;


  if (
    (lat !== undefined && lng === undefined) ||
    (lat === undefined && lng !== undefined)
  ) {
    throw new ApiError(
      400,
      "Both lat and lng are required for location search"
    );
  }


  if (hasLocation) {
    const latitude = Number(lat);
    const longitude = Number(lng);

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      throw new ApiError(
        400,
        "Invalid latitude"
      );
    }

    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new ApiError(
        400,
        "Invalid longitude"
      );
    }

    const radiusKm = Number(radius) || 10;

    if (
      !Number.isFinite(radiusKm) ||
      radiusKm <= 0 ||
      radiusKm > 200
    ) {
      throw new ApiError(
        400,
        "Radius must be between 1 and 200 km"
      );
    }


    // ----------------------------------------
    // Location based aggregation
    // ----------------------------------------

    const skip = (page - 1) * limit;

    const pipeline = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [
              longitude,
              latitude,
            ],
          },
          key: "serviceArea",
          distanceField: "distanceInMeters",
          maxDistance: radiusKm * 1000,
          spherical: true,
          query: matchStage,
        },
      },

      // Provider join
      {
        $lookup: {
          from: "providers",
          localField: "provider",
          foreignField: "_id",
          as: "providerData",
        },
      },

      {
        $unwind: "$providerData",
      },

      {
        $match: {
          "providerData.status": providerMatch.status,
          "providerData.verificationStatus":
            providerMatch.verificationStatus,
          ...(providerMatch.rating
            ? {
                "providerData.rating":
                  providerMatch.rating,
              }
            : {}),
        },
      },

      // Category join
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryData",
        },
      },

      {
        $unwind: "$categoryData",
      },

      {
        $match: {
          "categoryData.isActive": true,
        },
      },

      {
        $sort: {
          distanceInMeters: 1,
          createdAt: -1,
        },
      },

      {
        $facet: {
          services: [
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
            {
              $project: {
                _id: 1,
                title: 1,
                description: 1,
                price: 1,
                duration: 1,
                images: 1,
                isActive: 1,
                serviceArea: 1,
                distanceInMeters: 1,
                provider: {
                  _id: "$providerData._id",
                  businessName:
                    "$providerData.businessName",
                  rating:
                    "$providerData.rating",
                  totalReviews:
                    "$providerData.totalReviews",
                },
                category: {
                  _id: "$categoryData._id",
                  name: "$categoryData.name",
                  slug: "$categoryData.slug",
                  icon: "$categoryData.icon",
                },
              },
            },
          ],

          total: [
            {
              $count: "count",
            },
          ],
        },
      },
    ];


    const result =
      await Service.aggregate(pipeline);


    const services =
      result[0]?.services || [];

    const total =
      result[0]?.total?.[0]?.count || 0;


    return res.status(200).json(
      new ApiResponse(
        200,
        {
          services,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(
              total / limit
            ),
            hasNextPage:
              page <
              Math.ceil(total / limit),
            hasPreviousPage:
              page > 1,
          },
        },
        "Services fetched successfully"
      )
    );
  }


  // ----------------------------------------
  // Normal search without location
  // ----------------------------------------

  const skip = (page - 1) * limit;


  const [services, total] =
    await Promise.all([
      Service.find(matchStage)
        .populate({
          path: "provider",
          match: providerMatch,
          select:
            "businessName rating totalReviews status verificationStatus",
        })
        .populate(
          "category",
          "name slug icon image"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Service.countDocuments(matchStage),
    ]);


  // Remove services whose provider does not
  // match the provider/rating filter.
  const filteredServices =
    services.filter(
      (service) => service.provider
    );


  // Note:
  // When provider/rating filtering is used,
  // total from Service.countDocuments() can be
  // different from filteredServices.length.
  //
  // For exact count, aggregation should be used.
  // We handle exact provider/rating filtering below.


  if (
    provider ||
    minRating !== undefined
  ) {
    const aggregation = [
      {
        $match: matchStage,
      },

      {
        $lookup: {
          from: "providers",
          localField: "provider",
          foreignField: "_id",
          as: "providerData",
        },
      },

      {
        $unwind: "$providerData",
      },

      {
        $match: {
          "providerData.status": "active",
          "providerData.verificationStatus":
            "approved",
          ...(providerMatch.rating
            ? {
                "providerData.rating":
                  providerMatch.rating,
              }
            : {}),
        },
      },

      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryData",
        },
      },

      {
        $unwind: "$categoryData",
      },

      {
        $match: {
          "categoryData.isActive": true,
        },
      },

      {
        $sort: {
          createdAt: -1,
        },
      },

      {
        $facet: {
          services: [
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
          ],

          total: [
            {
              $count: "count",
            },
          ],
        },
      },
    ];


    const result =
      await Service.aggregate(aggregation);


    const exactServices =
      result[0]?.services || [];

    const exactTotal =
      result[0]?.total?.[0]?.count || 0;


    return res.status(200).json(
      new ApiResponse(
        200,
        {
          services: exactServices,
          pagination: {
            page,
            limit,
            total: exactTotal,
            totalPages: Math.ceil(
              exactTotal / limit
            ),
            hasNextPage:
              page <
              Math.ceil(
                exactTotal / limit
              ),
            hasPreviousPage:
              page > 1,
          },
        },
        "Services fetched successfully"
      )
    );
  }


  return res.status(200).json(
    new ApiResponse(
      200,
      {
        services: filteredServices,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(
            total / limit
          ),
          hasNextPage:
            page <
            Math.ceil(total / limit),
          hasPreviousPage:
            page > 1,
        },
      },
      "Services fetched successfully"
    )
  );
});


// ============================================================


// 8. Get Service By ID
const getServiceById = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;

  validateObjectId(serviceId, "service ID");


  const service = await Service.findOne({
    _id: serviceId,
    isActive: true,
  })
    .populate(
      "category",
      "name slug description icon image"
    )
    .populate(
      "provider",
      "businessName description rating totalReviews completedBookings serviceArea serviceRadiusKm"
    )
    .lean();


  if (!service) {
    throw new ApiError(
      404,
      "Service not found"
    );
  }


  return res.status(200).json(
    new ApiResponse(
      200,
      service,
      "Service fetched successfully"
    )
  );
});


// ============================================================


// 9. Get Services By Category
const getServicesByCategory = asyncHandler(
  async (req, res) => {
    const { categoryId } = req.params;

    validateObjectId(
      categoryId,
      "category ID"
    );


    const categoryExists =
      await Category.findOne({
        _id: categoryId,
        isActive: true,
      });

    if (!categoryExists) {
      throw new ApiError(
        404,
        "Category not found or inactive"
      );
    }


    const page = Math.max(
      parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        parseInt(req.query.limit, 10) || 10,
        1
      ),
      50
    );

    const skip = (page - 1) * limit;


    const filter = {
      category: categoryId,
      isActive: true,
    };


    const [services, total] =
      await Promise.all([
        Service.find(filter)
          .populate(
            "category",
            "name slug icon image"
          )
          .populate(
            "provider",
            "businessName rating totalReviews"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        Service.countDocuments(filter),
      ]);


    return res.status(200).json(
      new ApiResponse(
        200,
        {
          category: categoryExists,
          services,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(
              total / limit
            ),
            hasNextPage:
              page <
              Math.ceil(total / limit),
            hasPreviousPage:
              page > 1,
          },
        },
        "Category services fetched successfully"
      )
    );
  }
);


// ============================================================


// 10. Get Services By Provider
const getServicesByProvider = asyncHandler(
  async (req, res) => {
    const { providerId } = req.params;

    validateObjectId(
      providerId,
      "provider ID"
    );


    const provider = await Provider.findOne({
      _id: providerId,
      status: "active",
      verificationStatus: "approved",
    }).select(
      "businessName description rating totalReviews completedBookings serviceArea serviceRadiusKm"
    );


    if (!provider) {
      throw new ApiError(
        404,
        "Provider not found"
      );
    }


    const page = Math.max(
      parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        parseInt(req.query.limit, 10) || 10,
        1
      ),
      50
    );

    const skip = (page - 1) * limit;


    const filter = {
      provider: providerId,
      isActive: true,
    };


    const [services, total] =
      await Promise.all([
        Service.find(filter)
          .populate(
            "category",
            "name slug icon image"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        Service.countDocuments(filter),
      ]);


    return res.status(200).json(
      new ApiResponse(
        200,
        {
          provider,
          services,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(
              total / limit
            ),
            hasNextPage:
              page <
              Math.ceil(total / limit),
            hasPreviousPage:
              page > 1,
          },
        },
        "Provider services fetched successfully"
      )
    );
  }
);


// ============================================================
// SEARCH
// ============================================================


// 11. Search Services
//
// Example:
// /api/v1/services/search?q=cleaning&page=1&limit=10
// ============================================================

const searchServices = asyncHandler(async (req, res) => {
  const {
    q,
    category,
    minPrice,
    maxPrice,
    minDuration,
    maxDuration,
    minRating,
    sort,
    page: pageQuery,
    limit: limitQuery,
  } = req.query;

  const rawQuery = (q || "").trim();
  const page = Math.max(parseInt(pageQuery, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(limitQuery, 10) || 12, 1), 50);
  const skip = (page - 1) * limit;

  const matchStage = {
    isActive: true,
  };

  if (minPrice !== undefined && minPrice !== "") {
    matchStage.price = { ...(matchStage.price || {}), $gte: Number(minPrice) };
  }
  if (maxPrice !== undefined && maxPrice !== "") {
    matchStage.price = { ...(matchStage.price || {}), $lte: Number(maxPrice) };
  }
  if (minDuration !== undefined && minDuration !== "") {
    matchStage.duration = {
      ...(matchStage.duration || {}),
      $gte: Number(minDuration),
    };
  }
  if (maxDuration !== undefined && maxDuration !== "") {
    matchStage.duration = {
      ...(matchStage.duration || {}),
      $lte: Number(maxDuration),
    };
  }

  // Category filter by ObjectId or slug/name
  if (category && category !== "All" && category !== "all") {
    if (mongoose.Types.ObjectId.isValid(category)) {
      matchStage.category = new mongoose.Types.ObjectId(category);
    } else {
      const catDoc = await Category.findOne({
        $or: [
          { slug: category.toLowerCase() },
          { name: new RegExp(escapeRegex(category), "i") },
        ],
      });
      if (catDoc) {
        matchStage.category = catDoc._id;
      }
    }
  }

  // Intelligent search matching:
  let searchRegex = null;
  if (rawQuery) {
    const { expandedTerms } = extractSearchTokens(rawQuery);
    const regexPattern =
      expandedTerms.length > 0
        ? expandedTerms.map((t) => escapeRegex(t)).join("|")
        : escapeRegex(rawQuery);
    searchRegex = new RegExp(regexPattern, "i");
  }

  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "providers",
        localField: "provider",
        foreignField: "_id",
        as: "providerData",
      },
    },
    { $unwind: "$providerData" },
    {
      $match: {
        "providerData.status": "active",
        "providerData.verificationStatus": "approved",
        ...(minRating !== undefined && minRating !== ""
          ? { "providerData.rating": { $gte: Number(minRating) } }
          : {}),
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryData",
      },
    },
    { $unwind: "$categoryData" },
    {
      $match: {
        "categoryData.isActive": true,
      },
    },
  ];

  if (searchRegex) {
    pipeline.push({
      $match: {
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { "categoryData.name": searchRegex },
          { "categoryData.description": searchRegex },
          { "providerData.businessName": searchRegex },
          { "providerData.description": searchRegex },
        ],
      },
    });
  }

  // Sorting
  let sortField = { createdAt: -1 };
  if (sort === "price_asc") sortField = { price: 1 };
  else if (sort === "price_desc") sortField = { price: -1 };
  else if (sort === "rating") sortField = { "providerData.rating": -1 };
  else if (sort === "duration") sortField = { duration: 1 };

  pipeline.push({ $sort: sortField });

  pipeline.push({
    $facet: {
      services: [
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            price: 1,
            duration: 1,
            images: 1,
            serviceArea: 1,
            provider: {
              _id: "$providerData._id",
              businessName: "$providerData.businessName",
              rating: "$providerData.rating",
              totalReviews: "$providerData.totalReviews",
              serviceRadiusKm: "$providerData.serviceRadiusKm",
              availability: "$providerData.availability",
            },
            category: {
              _id: "$categoryData._id",
              name: "$categoryData.name",
              slug: "$categoryData.slug",
              icon: "$categoryData.icon",
            },
          },
        },
      ],
      total: [{ $count: "count" }],
    },
  });

  const result = await Service.aggregate(pipeline);
  const services = result[0]?.services || [];
  const total = result[0]?.total?.[0]?.count || 0;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        services,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPreviousPage: page > 1,
        },
      },
      "Search results fetched successfully"
    )
  );
});


// 12. Search Suggestions (Fast autocomplete for search bars)
//
// Example:
// /api/v1/services/suggestions?q=ac
// ============================================================

const getSearchSuggestions = asyncHandler(async (req, res) => {
  const { q = "" } = req.query;
  const raw = q.trim();

  let serviceQuery = { isActive: true };
  let providerQuery = { status: "active", verificationStatus: "approved" };

  if (raw) {
    const { expandedTerms } = extractSearchTokens(raw);
    const regexPattern =
      expandedTerms.length > 0
        ? expandedTerms.map((t) => escapeRegex(t)).join("|")
        : escapeRegex(raw);
    const searchRegex = new RegExp(regexPattern, "i");

    serviceQuery.$or = [
      { title: searchRegex },
      { description: searchRegex },
    ];

    providerQuery.$or = [
      { businessName: searchRegex },
      { description: searchRegex },
    ];
  }

  const [services, providers] = await Promise.all([
    Service.find(serviceQuery)
      .populate("category", "name icon slug")
      .populate("provider", "businessName rating")
      .limit(6)
      .select("title price duration category provider images")
      .lean(),
    Provider.find(providerQuery)
      .limit(4)
      .select(
        "businessName rating totalReviews serviceRadiusKm serviceArea availability"
      )
      .lean(),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      { services, providers },
      "Suggestions fetched successfully"
    )
  );
});


// ============================================================
// EXPORTS
// ============================================================

export {
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
};