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
        message: "Invalid verification document type",
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

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
    strict: true,
  }
);

const serviceAreaSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
      default: "Point",
    },

    coordinates: {
      type: [Number],
      required: true,

      validate: {
        validator: function (coordinates) {
          if (!Array.isArray(coordinates) || coordinates.length !== 2) {
            return false;
          }

          const [longitude, latitude] = coordinates;

          return (
            Number.isFinite(longitude) &&
            Number.isFinite(latitude) &&
            longitude >= -180 &&
            longitude <= 180 &&
            latitude >= -90 &&
            latitude <= 90
          );
        },

        message:
          "Coordinates must be [longitude, latitude] with valid geographic values",
      },
    },
  },
  {
    _id: false,
    strict: true,
  }
);

const availabilityDaySchema = new Schema(
  {
    isAvailable: {
      type: Boolean,
      default: false,
    },

    startTime: {
      type: String,
      trim: true,
      match: [
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "Start time must be in HH:mm format",
      ],
      default: null,
    },

    endTime: {
      type: String,
      trim: true,
      match: [
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "End time must be in HH:mm format",
      ],
      default: null,
    },
  },
  {
    _id: false,
    strict: true,
  }
);

const providerSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      immutable: true,
      index: true,
    },

    businessName: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "Business name must be at least 2 characters"],
      maxlength: [120, "Business name cannot exceed 120 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },

    verificationStatus: {
      type: String,
      enum: {
        values: ["pending", "approved", "rejected"],
        message: "Invalid verification status",
      },
      default: "pending",
      index: true,
    },

    verificationDocuments: {
      type: [verificationDocumentSchema],
      default: [],
    },

    serviceArea: {
      type: serviceAreaSchema,
      default: null,
    },

    serviceRadiusKm: {
      type: Number,
      min: [1, "Service radius must be at least 1 km"],
      max: [200, "Service radius cannot exceed 200 km"],
      default: 10,
    },

    availability: {
      monday: {
        type: availabilityDaySchema,
        default: () => ({}),
      },

      tuesday: {
        type: availabilityDaySchema,
        default: () => ({}),
      },

      wednesday: {
        type: availabilityDaySchema,
        default: () => ({}),
      },

      thursday: {
        type: availabilityDaySchema,
        default: () => ({}),
      },

      friday: {
        type: availabilityDaySchema,
        default: () => ({}),
      },

      saturday: {
        type: availabilityDaySchema,
        default: () => ({}),
      },

      sunday: {
        type: availabilityDaySchema,
        default: () => ({}),
      },
    },

    rating: {
      type: Number,
      min: [0, "Rating cannot be below 0"],
      max: [5, "Rating cannot exceed 5"],
      default: 0,
    },

    totalReviews: {
      type: Number,
      min: [0, "Total reviews cannot be negative"],
      default: 0,
    },

    completedBookings: {
      type: Number,
      min: [0, "Completed bookings cannot be negative"],
      default: 0,
    },

    status: {
      type: String,
      enum: {
        values: ["active", "inactive", "suspended"],
        message: "Invalid provider status",
      },
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

providerSchema.index({
  serviceArea: "2dsphere",
});

providerSchema.index({
  verificationStatus: 1,
  status: 1,
});

providerSchema.index({
  rating: -1,
  totalReviews: -1,
});

export const Provider = mongoose.model("Provider", providerSchema);