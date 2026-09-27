import mongoose from "mongoose";

import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

import { User } from "../models/user.models.js";
import { Provider } from "../models/provider.model.js";
import { ProviderVerification } from "../models/providerVerification.model.js";

import { uploadOnCloudinary } from "../utils/cloudinary.js";


// ============================================================
// CONSTANTS
// ============================================================

const ALLOWED_DOCUMENT_TYPES = [
  "identity",
  "business_license",
  "address_proof",
  "certificate",
  "other",
];

const MAX_DOCUMENTS = 10;


// ============================================================
// HELPER
// ============================================================

const validateDocumentType = (type) => {
  return ALLOWED_DOCUMENT_TYPES.includes(type);
};


// ============================================================
// 1. SUBMIT VERIFICATION
// ============================================================

const submitVerification = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  // ----------------------------------------------------------
  // Find provider owned by current user
  // ----------------------------------------------------------

  const provider = await Provider.findOne({
    user: userId,
  });

  if (!provider) {
    throw new ApiError(
      404,
      "Provider profile not found. Please become a provider first."
    );
  }

  // ----------------------------------------------------------
  // Provider status
  // ----------------------------------------------------------

  if (provider.status === "suspended") {
    throw new ApiError(
      403,
      "Your provider account is suspended"
    );
  }

  // ----------------------------------------------------------
  // Already approved?
  // ----------------------------------------------------------

  if (provider.verificationStatus === "approved") {
    throw new ApiError(
      400,
      "Your provider verification is already approved"
    );
  }

  // ----------------------------------------------------------
  // Get uploaded files
  //
  // Expected:
  // upload.array("documents", 10)
  // ----------------------------------------------------------

  const files = req.files;

  if (!Array.isArray(files) || files.length === 0) {
    throw new ApiError(
      400,
      "At least one verification document is required"
    );
  }

  if (files.length > MAX_DOCUMENTS) {
    throw new ApiError(
      400,
      `Maximum ${MAX_DOCUMENTS} documents are allowed`
    );
  }

  // ----------------------------------------------------------
  // documentTypes
  //
  // Example frontend:
  //
  // documentTypes: [
  //   "identity",
  //   "business_license"
  // ]
  //
  // Same index corresponds to same file.
  // ----------------------------------------------------------

  let documentTypes = req.body?.documentTypes;

  if (!documentTypes) {
    throw new ApiError(
      400,
      "Document types are required"
    );
  }

  // When multipart/form-data contains only one value,
  // Express may give us a string.
  if (!Array.isArray(documentTypes)) {
    documentTypes = [documentTypes];
  }

  if (documentTypes.length !== files.length) {
    throw new ApiError(
      400,
      "Each uploaded document must have a corresponding document type"
    );
  }

  // ----------------------------------------------------------
  // Validate document types
  // ----------------------------------------------------------

  for (const type of documentTypes) {
    if (
      typeof type !== "string" ||
      !validateDocumentType(type)
    ) {
      throw new ApiError(
        400,
        `Invalid document type. Allowed types: ${ALLOWED_DOCUMENT_TYPES.join(
          ", "
        )}`
      );
    }
  }

  // ----------------------------------------------------------
  // Check latest verification
  // ----------------------------------------------------------

  const latestVerification =
    await ProviderVerification.findOne({
      provider: provider._id,
    }).sort({ createdAt: -1 });

  if (
    latestVerification &&
    latestVerification.status === "PENDING"
  ) {
    throw new ApiError(
      400,
      "Your verification is already pending review"
    );
  }

  // ----------------------------------------------------------
  // Upload documents
  // ----------------------------------------------------------

  const uploadedDocuments = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (!file?.path) {
      throw new ApiError(
        400,
        "Invalid uploaded file"
      );
    }

    const uploadedFile = await uploadOnCloudinary(
      file.path
    );

    if (!uploadedFile) {
      throw new ApiError(
        500,
        "Failed to upload verification document"
      );
    }

    uploadedDocuments.push({
      type: documentTypes[i],
      url: uploadedFile.secure_url,
      publicId: uploadedFile.public_id,
      originalName: file.originalname || "",
    });
  }

  // ----------------------------------------------------------
  // Create verification
  // ----------------------------------------------------------

  const verification =
    await ProviderVerification.create({
      provider: provider._id,
      documents: uploadedDocuments,
      submittedAt: new Date(),
      status: "PENDING",
    });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        _id: verification._id,
        provider: verification.provider,
        documents: verification.documents.map(
          (document) => ({
            _id: document._id,
            type: document.type,
            originalName: document.originalName,
            uploadedAt: document.uploadedAt,
          })
        ),
        submittedAt: verification.submittedAt,
        status: verification.status,
      },
      "Provider verification submitted successfully"
    )
  );
});


// ============================================================
// 2. GET MY VERIFICATION
// ============================================================

const getMyVerification = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  // ----------------------------------------------------------
  // Find provider owned by current user
  // ----------------------------------------------------------

  const provider = await Provider.findOne({
    user: userId,
  }).select("_id");

  if (!provider) {
    throw new ApiError(
      404,
      "Provider profile not found"
    );
  }

  // ----------------------------------------------------------
  // Get latest verification
  // ----------------------------------------------------------

  const verification =
    await ProviderVerification.findOne({
      provider: provider._id,
    })
      .sort({ createdAt: -1 })
      .select(
        "_id provider documents submittedAt reviewedAt status rejectionReason createdAt updatedAt"
      );

  if (!verification) {
    throw new ApiError(
      404,
      "No verification submission found"
    );
  }

  // ----------------------------------------------------------
  // Do NOT expose Cloudinary URLs to normal user response
  // ----------------------------------------------------------

  const safeVerification = {
    _id: verification._id,
    provider: verification.provider,
    documents: verification.documents.map(
      (document) => ({
        _id: document._id,
        type: document.type,
        originalName: document.originalName,
        uploadedAt: document.uploadedAt,
      })
    ),
    submittedAt: verification.submittedAt,
    reviewedAt: verification.reviewedAt,
    status: verification.status,
    rejectionReason: verification.rejectionReason,
    createdAt: verification.createdAt,
    updatedAt: verification.updatedAt,
  };

  return res.status(200).json(
    new ApiResponse(
      200,
      safeVerification,
      "Verification details fetched successfully"
    )
  );
});


// ============================================================
// 3. RESUBMIT VERIFICATION
// ============================================================

const resubmitVerification = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  // ----------------------------------------------------------
  // Find provider
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // Already approved?
  // ----------------------------------------------------------

  if (provider.verificationStatus === "approved") {
    throw new ApiError(
      400,
      "Your provider verification is already approved"
    );
  }

  // ----------------------------------------------------------
  // Get latest verification
  // ----------------------------------------------------------

  const latestVerification =
    await ProviderVerification.findOne({
      provider: provider._id,
    }).sort({ createdAt: -1 });

  if (!latestVerification) {
    throw new ApiError(
      404,
      "No previous verification found. Please submit verification first."
    );
  }

  if (latestVerification.status === "PENDING") {
    throw new ApiError(
      400,
      "Your current verification is still pending"
    );
  }

  if (latestVerification.status !== "REJECTED") {
    throw new ApiError(
      400,
      "Verification cannot be resubmitted at this stage"
    );
  }

  // ----------------------------------------------------------
  // Files
  // ----------------------------------------------------------

  const files = req.files;

  if (!Array.isArray(files) || files.length === 0) {
    throw new ApiError(
      400,
      "At least one verification document is required"
    );
  }

  if (files.length > MAX_DOCUMENTS) {
    throw new ApiError(
      400,
      `Maximum ${MAX_DOCUMENTS} documents are allowed`
    );
  }

  let documentTypes = req.body?.documentTypes;

  if (!documentTypes) {
    throw new ApiError(
      400,
      "Document types are required"
    );
  }

  if (!Array.isArray(documentTypes)) {
    documentTypes = [documentTypes];
  }

  if (documentTypes.length !== files.length) {
    throw new ApiError(
      400,
      "Each uploaded document must have a corresponding document type"
    );
  }

  for (const type of documentTypes) {
    if (
      typeof type !== "string" ||
      !validateDocumentType(type)
    ) {
      throw new ApiError(
        400,
        `Invalid document type. Allowed types: ${ALLOWED_DOCUMENT_TYPES.join(
          ", "
        )}`
      );
    }
  }

  // ----------------------------------------------------------
  // Upload new documents
  // ----------------------------------------------------------

  const uploadedDocuments = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (!file?.path) {
      throw new ApiError(
        400,
        "Invalid uploaded file"
      );
    }

    const uploadedFile = await uploadOnCloudinary(
      file.path
    );

    if (!uploadedFile) {
      throw new ApiError(
        500,
        "Failed to upload verification document"
      );
    }

    uploadedDocuments.push({
      type: documentTypes[i],
      url: uploadedFile.secure_url,
      publicId: uploadedFile.public_id,
      originalName: file.originalname || "",
    });
  }

  // ----------------------------------------------------------
  // Create a NEW verification record
  // ----------------------------------------------------------

  const verification =
    await ProviderVerification.create({
      provider: provider._id,
      documents: uploadedDocuments,
      submittedAt: new Date(),
      status: "PENDING",
      rejectionReason: "",
      reviewedAt: null,
      reviewedBy: null,
    });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        _id: verification._id,
        provider: verification.provider,
        documents: verification.documents.map(
          (document) => ({
            _id: document._id,
            type: document.type,
            originalName: document.originalName,
            uploadedAt: document.uploadedAt,
          })
        ),
        submittedAt: verification.submittedAt,
        status: verification.status,
      },
      "Provider verification resubmitted successfully"
    )
  );
});


// ============================================================
// 4. GET PENDING VERIFICATIONS
// ADMIN ONLY
// ============================================================

const getPendingVerifications = asyncHandler(
  async (req, res) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    // --------------------------------------------------------
    // Extra controller-level admin check
    // Route should ALSO use authorizeRole("admin")
    // --------------------------------------------------------

    if (req.user.role !== "admin") {
      throw new ApiError(
        403,
        "Admin access required"
      );
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    if (
      !Number.isInteger(page) ||
      page < 1
    ) {
      throw new ApiError(
        400,
        "Page must be a positive integer"
      );
    }

    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50
    ) {
      throw new ApiError(
        400,
        "Limit must be between 1 and 50"
      );
    }

    const skip = (page - 1) * limit;

    const [verifications, total] =
      await Promise.all([
        ProviderVerification.find({
          status: "PENDING",
        })
          .populate({
            path: "provider",
            select:
              "businessName description verificationStatus status serviceArea",
            populate: {
              path: "user",
              select:
                "fullName username email phone avatar",
            },
          })
          .sort({ createdAt: 1 })
          .skip(skip)
          .limit(limit),

        ProviderVerification.countDocuments({
          status: "PENDING",
        }),
      ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          verifications,
          pagination: {
            currentPage: page,
            itemsPerPage: limit,
            totalItems: total,
            totalPages: Math.ceil(total / limit),
            hasNextPage:
              page < Math.ceil(total / limit),
            hasPreviousPage: page > 1,
          },
        },
        "Pending verifications fetched successfully"
      )
    );
  }
);


// ============================================================
// 5. GET VERIFICATION BY ID
// ADMIN ONLY
// ============================================================

const getVerificationById = asyncHandler(
  async (req, res) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    if (req.user.role !== "admin") {
      throw new ApiError(
        403,
        "Admin access required"
      );
    }

    const { verificationId } = req.params;

    if (
      !mongoose.isValidObjectId(verificationId)
    ) {
      throw new ApiError(
        400,
        "Invalid verification ID"
      );
    }

    const verification =
      await ProviderVerification.findById(
        verificationId
      )
        .populate({
          path: "provider",
          select:
            "businessName description verificationStatus status serviceArea serviceRadiusKm",
          populate: {
            path: "user",
            select:
              "fullName username email phone avatar isVerified",
          },
        })
        .populate({
          path: "reviewedBy",
          select: "fullName username",
        });

    if (!verification) {
      throw new ApiError(
        404,
        "Verification not found"
      );
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        verification,
        "Verification details fetched successfully"
      )
    );
  }
);


// ============================================================
// 6. APPROVE PROVIDER VERIFICATION
// ADMIN ONLY
// ============================================================

const approveProviderVerification =
  asyncHandler(async (req, res) => {
    const adminId = req.user?._id;

    if (!adminId) {
      throw new ApiError(
        401,
        "Unauthorized request"
      );
    }

    if (req.user.role !== "admin") {
      throw new ApiError(
        403,
        "Admin access required"
      );
    }

    const { verificationId } = req.params;

    if (
      !mongoose.isValidObjectId(verificationId)
    ) {
      throw new ApiError(
        400,
        "Invalid verification ID"
      );
    }

    // --------------------------------------------------------
    // Start transaction
    // --------------------------------------------------------

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // ------------------------------------------------------
      // Get verification
      // ------------------------------------------------------

      const verification =
        await ProviderVerification.findById(
          verificationId
        ).session(session);

      if (!verification) {
        throw new ApiError(
          404,
          "Verification not found"
        );
      }

      // ------------------------------------------------------
      // Only pending verification can be approved
      // ------------------------------------------------------

      if (verification.status !== "PENDING") {
        throw new ApiError(
          400,
          `Verification is already ${verification.status.toLowerCase()}`
        );
      }

      // ------------------------------------------------------
      // Get provider
      // ------------------------------------------------------

      const provider =
        await Provider.findById(
          verification.provider
        ).session(session);

      if (!provider) {
        throw new ApiError(
          404,
          "Provider profile not found"
        );
      }

      if (provider.status === "suspended") {
        throw new ApiError(
          403,
          "Suspended provider cannot be approved"
        );
      }

      // ------------------------------------------------------
      // Get user
      // ------------------------------------------------------

      const user =
        await User.findById(
          provider.user
        ).session(session);

      if (!user) {
        throw new ApiError(
          404,
          "Provider user account not found"
        );
      }

      if (!user.isActive) {
        throw new ApiError(
          403,
          "Provider user account is inactive"
        );
      }

      if (user.isSuspended) {
        throw new ApiError(
          403,
          "Provider user account is suspended"
        );
      }

      // ------------------------------------------------------
      // Update verification
      // ------------------------------------------------------

      verification.status = "APPROVED";
      verification.reviewedAt = new Date();
      verification.reviewedBy = adminId;
      verification.rejectionReason = "";

      await verification.save({
        session,
      });

      // ------------------------------------------------------
      // Update provider
      // ------------------------------------------------------

      provider.verificationStatus = "approved";

      await provider.save({
        session,
      });

      // ------------------------------------------------------
      // Update user role
      // ------------------------------------------------------

      user.role = "provider";

      await user.save({
        session,
      });

      // ------------------------------------------------------
      // Commit transaction
      // ------------------------------------------------------

      await session.commitTransaction();

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            verificationId: verification._id,
            providerId: provider._id,
            userId: user._id,
            verificationStatus:
              verification.status,
            providerVerificationStatus:
              provider.verificationStatus,
            role: user.role,
          },
          "Provider verification approved successfully"
        )
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  });


// ============================================================
// 7. REJECT PROVIDER VERIFICATION
// ADMIN ONLY
// ============================================================

const rejectProviderVerification =
  asyncHandler(async (req, res) => {
    const adminId = req.user?._id;

    if (!adminId) {
      throw new ApiError(
        401,
        "Unauthorized request"
      );
    }

    if (req.user.role !== "admin") {
      throw new ApiError(
        403,
        "Admin access required"
      );
    }

    const { verificationId } = req.params;

    const { rejectionReason } = req.body;

    if (
      !mongoose.isValidObjectId(verificationId)
    ) {
      throw new ApiError(
        400,
        "Invalid verification ID"
      );
    }

    // --------------------------------------------------------
    // Validate rejection reason
    // --------------------------------------------------------

    if (
      typeof rejectionReason !== "string" ||
      !rejectionReason.trim()
    ) {
      throw new ApiError(
        400,
        "Rejection reason is required"
      );
    }

    const reason = rejectionReason.trim();

    if (reason.length < 3) {
      throw new ApiError(
        400,
        "Rejection reason must be at least 3 characters"
      );
    }

    if (reason.length > 500) {
      throw new ApiError(
        400,
        "Rejection reason cannot exceed 500 characters"
      );
    }

    // --------------------------------------------------------
    // Start transaction
    // --------------------------------------------------------

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // ------------------------------------------------------
      // Find verification
      // ------------------------------------------------------

      const verification =
        await ProviderVerification.findById(
          verificationId
        ).session(session);

      if (!verification) {
        throw new ApiError(
          404,
          "Verification not found"
        );
      }

      if (verification.status !== "PENDING") {
        throw new ApiError(
          400,
          `Verification is already ${verification.status.toLowerCase()}`
        );
      }

      // ------------------------------------------------------
      // Find provider
      // ------------------------------------------------------

      const provider =
        await Provider.findById(
          verification.provider
        ).session(session);

      if (!provider) {
        throw new ApiError(
          404,
          "Provider profile not found"
        );
      }

      // ------------------------------------------------------
      // Update verification
      // ------------------------------------------------------

      verification.status = "REJECTED";
      verification.reviewedAt = new Date();
      verification.reviewedBy = adminId;
      verification.rejectionReason = reason;

      await verification.save({
        session,
      });

      // ------------------------------------------------------
      // Update provider status
      // ------------------------------------------------------

      provider.verificationStatus = "rejected";

      await provider.save({
        session,
      });

      // ------------------------------------------------------
      // Commit
      // ------------------------------------------------------

      await session.commitTransaction();

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            verificationId: verification._id,
            providerId: provider._id,
            status: verification.status,
            providerVerificationStatus:
              provider.verificationStatus,
            rejectionReason:
              verification.rejectionReason,
          },
          "Provider verification rejected successfully"
        )
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  });


// ============================================================
// EXPORTS
// ============================================================

export {
  submitVerification,
  getMyVerification,
  resubmitVerification,
  getPendingVerifications,
  getVerificationById,
  approveProviderVerification,
  rejectProviderVerification,
};