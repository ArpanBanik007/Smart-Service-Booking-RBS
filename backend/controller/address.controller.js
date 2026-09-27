import mongoose from "mongoose";

import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

import { Address } from "../models/address.model.js";


// ============================================================
// Helper Functions
// ============================================================

const validateObjectId = (id, fieldName = "ID") => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }
};


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
    throw new ApiError(
      400,
      "Longitude must be between -180 and 180"
    );
  }

  if (latitude < -90 || latitude > 90) {
    throw new ApiError(
      400,
      "Latitude must be between -90 and 90"
    );
  }
};


const allowedLabels = ["home", "office", "other"];


// ============================================================
// 1. Create Address
// ============================================================

const createAddress = asyncHandler(async (req, res) => {
  const {
    label,
    addressLine,
    city,
    state,
    pincode,
    coordinates,
    landmark,
    isDefault,
  } = req.body;


  // ----------------------------------------------------------
  // Required fields
  // ----------------------------------------------------------

  if (!addressLine || !addressLine.trim()) {
    throw new ApiError(
      400,
      "Address line is required"
    );
  }

  if (!city || !city.trim()) {
    throw new ApiError(
      400,
      "City is required"
    );
  }

  if (!state || !state.trim()) {
    throw new ApiError(
      400,
      "State is required"
    );
  }

  if (!pincode || !String(pincode).trim()) {
    throw new ApiError(
      400,
      "Pincode is required"
    );
  }


  // ----------------------------------------------------------
  // Label
  // ----------------------------------------------------------

  const finalLabel = label || "other";

  if (!allowedLabels.includes(finalLabel)) {
    throw new ApiError(
      400,
      "Label must be home, office or other"
    );
  }


  // ----------------------------------------------------------
  // Pincode
  // ----------------------------------------------------------

  const cleanPincode = String(pincode).trim();

  if (!/^\d{6}$/.test(cleanPincode)) {
    throw new ApiError(
      400,
      "Pincode must be a valid 6-digit number"
    );
  }


  // ----------------------------------------------------------
  // Coordinates
  // ----------------------------------------------------------

  if (!coordinates) {
    throw new ApiError(
      400,
      "Coordinates are required"
    );
  }

  validateCoordinates(coordinates);


  // ----------------------------------------------------------
  // Check default address
  // ----------------------------------------------------------

  const shouldBeDefault = Boolean(isDefault);


  if (shouldBeDefault) {
    // Remove default from existing addresses
    await Address.updateMany(
      {
        user: req.user._id,
        isDefault: true,
      },
      {
        $set: {
          isDefault: false,
        },
      }
    );
  }


  // ----------------------------------------------------------
  // Create address
  // ----------------------------------------------------------

  const address = await Address.create({
    user: req.user._id,

    label: finalLabel,

    addressLine: addressLine.trim(),

    city: city.trim(),

    state: state.trim(),

    pincode: cleanPincode,

    coordinates: {
      type: "Point",
      coordinates,
    },

    landmark: landmark?.trim() || "",

    isDefault: shouldBeDefault,
  });


  return res.status(201).json(
    new ApiResponse(
      201,
      address,
      "Address created successfully"
    )
  );
});


// ============================================================
// 2. Get My Addresses
// ============================================================

const getMyAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({
    user: req.user._id,
  }).sort({
    isDefault: -1,
    createdAt: -1,
  });


  return res.status(200).json(
    new ApiResponse(
      200,
      addresses,
      "Addresses fetched successfully"
    )
  );
});


// ============================================================
// 3. Get Address By ID
// ============================================================

const getAddressById = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  validateObjectId(
    addressId,
    "address ID"
  );


  // IMPORTANT:
  // Ownership check happens HERE.
  //
  // Even if User A knows User B's addressId,
  // this query will NOT return User B's address.
  const address = await Address.findOne({
    _id: addressId,
    user: req.user._id,
  });


  if (!address) {
    throw new ApiError(
      404,
      "Address not found"
    );
  }


  return res.status(200).json(
    new ApiResponse(
      200,
      address,
      "Address fetched successfully"
    )
  );
});


// ============================================================
// 4. Update Address
// ============================================================

const updateAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  validateObjectId(
    addressId,
    "address ID"
  );


  // IMPORTANT:
  // Find address using BOTH:
  // _id + logged-in user
  const address = await Address.findOne({
    _id: addressId,
    user: req.user._id,
  });


  if (!address) {
    throw new ApiError(
      404,
      "Address not found"
    );
  }


  const {
    label,
    addressLine,
    city,
    state,
    pincode,
    coordinates,
    landmark,
    isDefault,
  } = req.body;


  // ----------------------------------------------------------
  // Label
  // ----------------------------------------------------------

  if (label !== undefined) {
    if (!allowedLabels.includes(label)) {
      throw new ApiError(
        400,
        "Label must be home, office or other"
      );
    }

    address.label = label;
  }


  // ----------------------------------------------------------
  // Address line
  // ----------------------------------------------------------

  if (addressLine !== undefined) {
    if (
      typeof addressLine !== "string" ||
      !addressLine.trim()
    ) {
      throw new ApiError(
        400,
        "Address line cannot be empty"
      );
    }

    address.addressLine = addressLine.trim();
  }


  // ----------------------------------------------------------
  // City
  // ----------------------------------------------------------

  if (city !== undefined) {
    if (
      typeof city !== "string" ||
      !city.trim()
    ) {
      throw new ApiError(
        400,
        "City cannot be empty"
      );
    }

    address.city = city.trim();
  }


  // ----------------------------------------------------------
  // State
  // ----------------------------------------------------------

  if (state !== undefined) {
    if (
      typeof state !== "string" ||
      !state.trim()
    ) {
      throw new ApiError(
        400,
        "State cannot be empty"
      );
    }

    address.state = state.trim();
  }


  // ----------------------------------------------------------
  // Pincode
  // ----------------------------------------------------------

  if (pincode !== undefined) {
    const cleanPincode =
      String(pincode).trim();

    if (!/^\d{6}$/.test(cleanPincode)) {
      throw new ApiError(
        400,
        "Pincode must be a valid 6-digit number"
      );
    }

    address.pincode = cleanPincode;
  }


  // ----------------------------------------------------------
  // Coordinates
  // ----------------------------------------------------------

  if (coordinates !== undefined) {
    validateCoordinates(coordinates);

    address.coordinates = {
      type: "Point",
      coordinates,
    };
  }


  // ----------------------------------------------------------
  // Landmark
  // ----------------------------------------------------------

  if (landmark !== undefined) {
    if (typeof landmark !== "string") {
      throw new ApiError(
        400,
        "Landmark must be a string"
      );
    }

    address.landmark = landmark.trim();
  }


  // ----------------------------------------------------------
  // Default Address
  // ----------------------------------------------------------

  if (isDefault === true) {
    await Address.updateMany(
      {
        user: req.user._id,
        _id: {
          $ne: address._id,
        },
        isDefault: true,
      },
      {
        $set: {
          isDefault: false,
        },
      }
    );

    address.isDefault = true;
  }


  if (isDefault === false) {
    address.isDefault = false;
  }


  await address.save();


  return res.status(200).json(
    new ApiResponse(
      200,
      address,
      "Address updated successfully"
    )
  );
});


// ============================================================
// 5. Delete Address
// ============================================================

const deleteAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  validateObjectId(
    addressId,
    "address ID"
  );


  // Ownership check
  const address = await Address.findOne({
    _id: addressId,
    user: req.user._id,
  });


  if (!address) {
    throw new ApiError(
      404,
      "Address not found"
    );
  }


  await Address.deleteOne({
    _id: address._id,
  });


  return res.status(200).json(
    new ApiResponse(
      200,
      null,
      "Address deleted successfully"
    )
  );
});


// ============================================================
// 6. Set Default Address
// ============================================================

const setDefaultAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  validateObjectId(
    addressId,
    "address ID"
  );


  // First verify ownership
  const address = await Address.findOne({
    _id: addressId,
    user: req.user._id,
  });


  if (!address) {
    throw new ApiError(
      404,
      "Address not found"
    );
  }


  // Remove default from all other addresses
  await Address.updateMany(
    {
      user: req.user._id,
      _id: {
        $ne: address._id,
      },
      isDefault: true,
    },
    {
      $set: {
        isDefault: false,
      },
    }
  );


  // Set selected address as default
  address.isDefault = true;

  await address.save();


  return res.status(200).json(
    new ApiResponse(
      200,
      address,
      "Default address updated successfully"
    )
  );
});


// ============================================================
// EXPORTS
// ============================================================

export {
  createAddress,
  getMyAddresses,
  getAddressById,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};