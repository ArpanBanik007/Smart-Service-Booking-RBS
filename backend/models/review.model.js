import mongoose, { Schema } from "mongoose";

const reviewSchema = new Schema(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      immutable: true,
      index: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
      index: true,
    },

    provider: {
      type: Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
      immutable: true,
      index: true,
    },

    rating: {
      type: Number,
      required: true,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      validate: {
        validator: Number.isInteger,
        message: "Rating must be a whole number from 1 to 5",
      },
    },

    comment: {
      type: String,
      trim: true,
      maxlength: [1000, "Review cannot exceed 1000 characters"],
      default: "",
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
          return images.length <= 5;
        },

        message: "A review can have a maximum of 5 images",
      },
    },

    isVisible: {
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

// One user can review a booking only once.
reviewSchema.index(
  {
    booking: 1,
    user: 1,
  },
  {
    unique: true,
  }
);

// Provider review listing
reviewSchema.index({
  provider: 1,
  createdAt: -1,
});

reviewSchema.index({
  provider: 1,
  rating: -1,
});

export const Review = mongoose.model("Review", reviewSchema);