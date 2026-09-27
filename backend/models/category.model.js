import mongoose, { Schema } from "mongoose";

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "Category name must be at least 2 characters"],
      maxlength: [80, "Category name cannot exceed 80 characters"],
    },

    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: [2, "Category slug must be at least 2 characters"],
      maxlength: [100, "Category slug cannot exceed 100 characters"],

      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug can only contain lowercase letters, numbers and hyphens",
      ],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },

    icon: {
      type: String,
      trim: true,
      maxlength: [100, "Icon value is too long"],
      default: "",
    },

    image: {
      type: String,
      trim: true,
      maxlength: [2048, "Image URL cannot exceed 2048 characters"],
      default: "",
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

// Category name should be unique
categorySchema.index(
  { name: 1 },
  {
    unique: true,
    collation: {
      locale: "en",
      strength: 2,
    },
  }
);

// Slug must always be unique
categorySchema.index(
  { slug: 1 },
  {
    unique: true,
  }
);

export const Category = mongoose.model("Category", categorySchema);