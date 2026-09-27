import mongoose, { Schema } from "mongoose";

const verificationDocumentSchema = new Schema(
  {
    type: {
      type: String,
      enum: {
        values: [
          "identity",
          "business_license",
          "address_proof",
          "certificate",
          "other",
        ],
        message: "Invalid document type",
      },
      required: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: [2048, "Document URL cannot exceed 2048 characters"],
    },

    publicId: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, "Public ID is too long"],
    },

    originalName: {
      type: String,
      trim: true,
      maxlength: [255, "Original file name is too long"],
      default: "",
    },
  },
  {
    _id: true,
    strict: true,
  }
);

const providerVerificationSchema = new Schema(
  {
    provider: {
      type: Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
      immutable: true,
      index: true,
    },

    documents: {
      type: [verificationDocumentSchema],
      required: true,

      validate: {
        validator: function (documents) {
          return documents.length >= 1 && documents.length <= 10;
        },

        message: "Verification must contain between 1 and 10 documents",
      },
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    status: {
      type: String,
      enum: {
        values: ["PENDING", "APPROVED", "REJECTED"],
        message: "Invalid verification status",
      },
      default: "PENDING",
      index: true,
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, "Rejection reason cannot exceed 500 characters"],
      default: "",
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

providerVerificationSchema.index({
  provider: 1,
  createdAt: -1,
});

providerVerificationSchema.index({
  status: 1,
  createdAt: -1,
});

export const ProviderVerification = mongoose.model(
  "ProviderVerification",
  providerVerificationSchema
);