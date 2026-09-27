// models/user.model.js

import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [
        /^[a-z0-9_]+$/,
        "Username can only contain lowercase letters, numbers and underscore",
      ],
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "Full name must be at least 2 characters"],
      maxlength: [100, "Full name cannot exceed 100 characters"],
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [254, "Email cannot exceed 254 characters"],
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [
        /^\+?[1-9]\d{7,14}$/,
        "Please enter a valid phone number",
      ],
    },

    password: {
      type: String,
      required: true,
      minlength: [8, "Password must be at least 8 characters"],
      maxlength: [128, "Password cannot exceed 128 characters"],
      select: false,
    },

  
    avatar: {
      type: String,
      default: "",
      trim: true,
    },

    avatarPublicId: {
      type: String,
      default: null,
      trim: true,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: [300, "Bio cannot exceed 300 characters"],
      default: "",
    },


role: {
  type: String,
  enum: {
    values: ["user", "provider", "admin"],
    message: "Invalid user role",
  },
  default: "user",
  index: true,
},

    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isSuspended: {
      type: Boolean,
      default: false,
      index: true,
    },

   

    location: {
      city: {
        type: String,
        trim: true,
        maxlength: [100, "City name is too long"],
        default: null,
      },

      state: {
        type: String,
        trim: true,
        maxlength: [100, "State name is too long"],
        default: null,
      },

      country: {
        type: String,
        trim: true,
        maxlength: [100, "Country name is too long"],
        default: null,
      },

      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },

        coordinates: {
          type: [Number],
          default: [0, 0],

          validate: {
            validator: function (coordinates) {
              if (!Array.isArray(coordinates)) {
                return false;
              }

              if (coordinates.length !== 2) {
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
    },

   

    addresses: [
      {
        type: Schema.Types.ObjectId,
        ref: "Address",
      },
    ],

   

    passwordResetToken: {
      type: String,
      default: null,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
    },

    

    emailVerificationToken: {
      type: String,
      default: null,
      select: false,
    },

    emailVerificationExpires: {
      type: Date,
      default: null,
      select: false,
    },

    refreshToken: {
      type: String,
      default: null,
      select: false,
    },

    
    lastLoginAt: {
      type: Date,
      default: null,
    },

    lastLoginIp: {
      type: String,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,

    // Prevent accidental fields from being silently accepted
    strict: true,
  }
);


// Geospatial search
userSchema.index({
  "location.coordinates": "2dsphere",
});

// Search
userSchema.index({
  username: "text",
  fullName: "text",
});



userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error) {
    next(error);
  }
});



userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword || !this.password) {
    return false;
  }

  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isPasswordCorrect = async function (candidatePassword) {
  return this.comparePassword(candidatePassword);
};



userSchema.methods.generateAccessToken = function () {
  if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new Error("ACCESS_TOKEN_SECRET is not configured");
  }

  if (!process.env.ACCESS_TOKEN_EXPIRY) {
    throw new Error("ACCESS_TOKEN_EXPIRY is not configured");
  }

  return jwt.sign(
    {
      _id: this._id.toString(),
      email: this.email,
      username: this.username,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};


userSchema.methods.generateRefreshToken = function () {
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error("REFRESH_TOKEN_SECRET is not configured");
  }

  if (!process.env.REFRESH_TOKEN_EXPIRY) {
    throw new Error("REFRESH_TOKEN_EXPIRY is not configured");
  }

  return jwt.sign(
    {
      _id: this._id.toString(),
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};


userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();

  // Authentication secrets
  delete obj.password;
  delete obj.refreshToken;

  // Password reset
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;

  // Email verification
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;

  // Private login information
  delete obj.lastLoginIp;

  return obj;
};

userSchema.set("toJSON", {
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.refreshToken;

    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;

    delete ret.emailVerificationToken;
    delete ret.emailVerificationExpires;

    delete ret.lastLoginIp;

    return ret;
  },
});

export const User = mongoose.model("User", userSchema);