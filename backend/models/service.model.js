import mongoose, { Schema } from "mongoose";

const serviceAreaSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
      required: true,
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

const serviceSchema = new Schema(
  {
    provider: {
      type: Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
      immutable: true,
      index: true,
    },

    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "Service title must be at least 2 characters"],
      maxlength: [150, "Service title cannot exceed 150 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },

    price: {
      type: Number,
      required: true,
      min: [1, "Service price must be greater than 0"],
      max: [1000000, "Service price cannot exceed ₹10,00,000"],
    },

    duration: {
      type: Number,
      required: true,
      min: [5, "Service duration must be at least 5 minutes"],
      max: [1440, "Service duration cannot exceed 24 hours"],
    },

    images: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: [2048, "Image URL cannot exceed 2048 characters"],
        },
      ],
      default: [],

      validate: {
        validator: function (images) {
          return images.length <= 10;
        },

        message: "A service can have a maximum of 10 images",
      },
    },

    serviceArea: {
      type: serviceAreaSchema,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// Main query pattern:
// provider + active services
serviceSchema.index({
  provider: 1,
  isActive: 1,
});

// Category based search
serviceSchema.index({
  category: 1,
  isActive: 1,
});

// Provider + category filtering
serviceSchema.index({
  provider: 1,
  category: 1,
});

// Geospatial search
serviceSchema.index({
  serviceArea: "2dsphere",
});

// Text search
serviceSchema.index({
  title: "text",
  description: "text",
});

export const Service = mongoose.model("Service", serviceSchema);