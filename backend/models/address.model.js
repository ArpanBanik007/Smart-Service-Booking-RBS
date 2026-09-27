import mongoose, { Schema } from "mongoose";

const addressSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
      index: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
      enum: {
        values: ["home", "office", "other"],
        message: "Address label must be home, office or other",
      },
    },

    addressLine: {
      type: String,
      required: true,
      trim: true,
      minlength: [5, "Address must be at least 5 characters"],
      maxlength: [300, "Address cannot exceed 300 characters"],
    },

    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "City name cannot exceed 100 characters"],
    },

    state: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "State name cannot exceed 100 characters"],
    },

    pincode: {
      type: String,
      required: true,
      trim: true,
      match: [
        /^[1-9][0-9]{5}$/,
        "Please enter a valid 6-digit Indian pincode",
      ],
    },

    coordinates: {
      type: {
        type: String,
        enum: ["Point"],
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

    landmark: {
      type: String,
      trim: true,
      maxlength: [200, "Landmark cannot exceed 200 characters"],
      default: "",
    },

    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// Geospatial search
addressSchema.index({
  coordinates: "2dsphere",
});

// User's addresses
addressSchema.index({
  user: 1,
  createdAt: -1,
});

// Fast default-address lookup
addressSchema.index({
  user: 1,
  isDefault: 1,
});

export const Address = mongoose.model("Address", addressSchema);