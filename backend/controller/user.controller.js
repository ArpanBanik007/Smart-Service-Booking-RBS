import asyncHandler from "../utils/asyncHandler.js";
import { v2 as cloudinary } from "cloudinary";
import { User } from "../models/user.models.js";
import emailVerificationModel from "../models/emailVerification.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

import {
  generateOTP,
  sendOTPEmail,
} from "../services/email.services.js";

import { uploadOnCloudinary } from "../utils/cloudinary.js";


// ============================================================
// CONSTANTS
// ============================================================

const ACCESS_COOKIE_NAME = "accessToken";
const REFRESH_COOKIE_NAME = "refreshToken";

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const getCookieOptions = () => ({
  httpOnly: true,

  secure: process.env.NODE_ENV === "production",

  sameSite:
    process.env.NODE_ENV === "production"
      ? "None"
      : "Lax",

  path: "/",

  maxAge: COOKIE_MAX_AGE,
});


// ============================================================
// HELPER: GENERATE ACCESS + REFRESH TOKEN
// ============================================================

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Store latest refresh token in DB
    user.refreshToken = refreshToken;

    await user.save({
      validateBeforeSave: false,
    });

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      500,
      "Something went wrong while generating authentication tokens"
    );
  }
};


// ============================================================
// HELPER: DELETE CLOUDINARY IMAGE
// ============================================================

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    // Image deletion failure should not break account update
    console.error(
      "Cloudinary delete error:",
      error.message
    );
  }
};


// ============================================================
// REGISTER USER
// ============================================================

const registerUser = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    phone,
    password,
    username,
    otp,
  } = req.body;

  // ----------------------------------------------------------
  // Basic validation
  // ----------------------------------------------------------

  if (
    !fullName ||
    !email ||
    !phone ||
    !password ||
    !username ||
    !otp
  ) {
    throw new ApiError(
      400,
      "Full name, email, phone, username, password and OTP are required"
    );
  }

  const normalizedFullName = fullName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone.trim();
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedOtp = otp.trim();

  if (
    !normalizedFullName ||
    !normalizedEmail ||
    !normalizedPhone ||
    !normalizedUsername ||
    !normalizedOtp
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // ----------------------------------------------------------
  // Password validation
  // ----------------------------------------------------------

  if (password.length < 8) {
    throw new ApiError(
      400,
      "Password must be at least 8 characters"
    );
  }

  if (password.length > 128) {
    throw new ApiError(
      400,
      "Password cannot exceed 128 characters"
    );
  }

  // ----------------------------------------------------------
  // Username validation
  // ----------------------------------------------------------

  const usernameRegex = /^[a-z0-9_]+$/;

  if (!usernameRegex.test(normalizedUsername)) {
    throw new ApiError(
      400,
      "Username can only contain lowercase letters, numbers and underscore"
    );
  }

  // ----------------------------------------------------------
  // Email validation
  // ----------------------------------------------------------

  const emailRegex = /^\S+@\S+\.\S+$/;

  if (!emailRegex.test(normalizedEmail)) {
    throw new ApiError(
      400,
      "Please enter a valid email address"
    );
  }

  // ----------------------------------------------------------
  // Phone validation
  // ----------------------------------------------------------

  const phoneRegex = /^\+?[1-9]\d{7,14}$/;

  if (!phoneRegex.test(normalizedPhone)) {
    throw new ApiError(
      400,
      "Please enter a valid phone number"
    );
  }

  // ----------------------------------------------------------
  // Check OTP
  // ----------------------------------------------------------

  const otpRecord = await EmailVerification.findOne({
    email: normalizedEmail,
  });

  if (!otpRecord) {
    throw new ApiError(
      403,
      "OTP not found or expired. Please request a new OTP"
    );
  }

  // Check expiry BEFORE comparing
  if (new Date() > otpRecord.expiresAt) {
    await EmailVerification.deleteMany({
      email: normalizedEmail,
    });

    throw new ApiError(
      400,
      "OTP has expired. Please request a new OTP"
    );
  }

  const isOtpValid = await bcrypt.compare(
    normalizedOtp,
    otpRecord.otpHash
  );

  if (!isOtpValid) {
    throw new ApiError(400, "Invalid OTP");
  }

  // ----------------------------------------------------------
  // Check duplicate email / username / phone
  // ----------------------------------------------------------

  const existingUser = await User.findOne({
    $or: [
      { email: normalizedEmail },
      { username: normalizedUsername },
      { phone: normalizedPhone },
    ],
  }).select("_id email username phone");

  if (existingUser) {
    if (existingUser.email === normalizedEmail) {
      throw new ApiError(
        409,
        "User with this email already exists"
      );
    }

    if (existingUser.username === normalizedUsername) {
      throw new ApiError(
        409,
        "Username is already taken"
      );
    }

    if (existingUser.phone === normalizedPhone) {
      throw new ApiError(
        409,
        "Phone number is already registered"
      );
    }
  }

  // ----------------------------------------------------------
  // Avatar upload
  // ----------------------------------------------------------

  let avatar = null;

  const avatarLocalPath = req.file?.path;

  if (avatarLocalPath) {
    avatar = await uploadOnCloudinary(
      avatarLocalPath
    );

    if (!avatar?.url) {
      throw new ApiError(
        500,
        "Failed to upload avatar"
      );
    }
  }

  // ----------------------------------------------------------
  // CREATE USER
  // ----------------------------------------------------------

  /*
    IMPORTANT:

    role is intentionally NOT taken from req.body.

    Every newly registered account is:
        role = "user"

    User can later apply for provider.
    Admin approval will control provider access.
  */

  const user = await User.create({
    username: normalizedUsername,

    fullName: normalizedFullName,

    email: normalizedEmail,

    phone: normalizedPhone,

    password,

    avatar: avatar?.url || "",

    avatarPublicId: avatar?.public_id || null,

    role: "user",

    isVerified: true,

    isActive: true,

    isSuspended: false,
  });

  // ----------------------------------------------------------
  // Delete used OTP
  // ----------------------------------------------------------

  await EmailVerification.deleteMany({
    email: normalizedEmail,
  });

  // ----------------------------------------------------------
  // Generate authentication tokens
  // ----------------------------------------------------------

  const {
    accessToken,
    refreshToken,
  } = await generateAccessAndRefreshTokens(
    user._id
  );

  // ----------------------------------------------------------
  // Safe user response
  // ----------------------------------------------------------

  const createdUser = await User.findById(
    user._id
  );

  if (!createdUser) {
    throw new ApiError(
      500,
      "Something went wrong while creating user"
    );
  }

  // ----------------------------------------------------------
  // Cookies
  // ----------------------------------------------------------

  const cookieOptions = getCookieOptions();

  return res
    .status(201)

    .cookie(
      ACCESS_COOKIE_NAME,
      accessToken,
      cookieOptions
    )

    .cookie(
      REFRESH_COOKIE_NAME,
      refreshToken,
      cookieOptions
    )

    .json(
      new ApiResponse(
        201,
        {
          user: createdUser.toSafeObject(),
        },
        "User registered successfully"
      )
    );
});


// ============================================================
// OTP RATE LIMIT
// ============================================================

const otpRateLimit = new Map();


// ============================================================
// SEND OTP
// ============================================================

const sendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(
      400,
      "Email is required"
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  const emailRegex = /^\S+@\S+\.\S+$/;

  if (!emailRegex.test(normalizedEmail)) {
    throw new ApiError(
      400,
      "Please enter a valid email address"
    );
  }

  // ----------------------------------------------------------
  // Rate limit
  // ----------------------------------------------------------

  const now = Date.now();

  const lastRequest =
    otpRateLimit.get(normalizedEmail);

  if (
    lastRequest &&
    now - lastRequest < 60 * 1000
  ) {
    throw new ApiError(
      429,
      "Please wait 60 seconds before requesting another OTP"
    );
  }

  // ----------------------------------------------------------
  // Existing user check
  // ----------------------------------------------------------

  const existingUser = await User.findOne({
    email: normalizedEmail,
  }).select("_id");

  if (existingUser) {
    throw new ApiError(
      409,
      "User with this email already exists"
    );
  }

  // ----------------------------------------------------------
  // Generate OTP
  // ----------------------------------------------------------

  const otp = generateOTP();

  const otpHash = await bcrypt.hash(
    otp,
    10
  );

  const expiresAt = new Date(
    Date.now() + 3 * 60 * 1000
  );

  // Delete old OTP
  await EmailVerification.deleteMany({
    email: normalizedEmail,
  });

  // Save new OTP
  await EmailVerification.create({
    email: normalizedEmail,
    otpHash,
    expiresAt,
  });

  // ----------------------------------------------------------
  // Send email
  // ----------------------------------------------------------

  try {
    await sendOTPEmail(
      normalizedEmail,
      otp
    );

    otpRateLimit.set(
      normalizedEmail,
      now
    );
  } catch (error) {
    // If email failed, remove OTP
    await EmailVerification.deleteMany({
      email: normalizedEmail,
    });

    console.error(
      "OTP email error:",
      error.message
    );

    throw new ApiError(
      500,
      "Failed to send OTP email"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        null,
        "OTP sent successfully to your email"
      )
    );
});


// ============================================================
// VERIFY OTP
// ============================================================

const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(
      400,
      "Email and OTP are required"
    );
  }

  const normalizedEmail =
    email.trim().toLowerCase();

  const normalizedOtp =
    otp.trim();

  const otpRecord =
    await EmailVerification.findOne({
      email: normalizedEmail,
    });

  if (!otpRecord) {
    throw new ApiError(
      400,
      "OTP not found or expired"
    );
  }

  if (new Date() > otpRecord.expiresAt) {
    await EmailVerification.deleteMany({
      email: normalizedEmail,
    });

    throw new ApiError(
      400,
      "OTP has expired"
    );
  }

  const isOtpValid =
    await bcrypt.compare(
      normalizedOtp,
      otpRecord.otpHash
    );

  if (!isOtpValid) {
    throw new ApiError(
      400,
      "Invalid OTP"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        null,
        "Email verified successfully. You can now register."
      )
    );
});


// ============================================================
// LOGIN
// ============================================================

const loginUser = asyncHandler(async (req, res) => {
  const {
    identifier,
    password,
  } = req.body;

  if (!identifier || !password) {
    throw new ApiError(
      400,
      "Username or email and password are required"
    );
  }

  const normalizedIdentifier =
    identifier.trim().toLowerCase();

  // ----------------------------------------------------------
  // Find user
  // ----------------------------------------------------------

  const user = await User.findOne({
    $or: [
      {
        username: normalizedIdentifier,
      },
      {
        email: normalizedIdentifier,
      },
    ],
  }).select("+password +refreshToken");

  if (!user) {
    throw new ApiError(
      401,
      "Invalid user credentials"
    );
  }

  
  if (!user.isActive) {
    throw new ApiError(
      403,
      "Your account is inactive"
    );
  }

  if (user.isSuspended) {
    throw new ApiError(
      403,
      "Your account has been suspended"
    );
  }

  

  if (!user.isVerified) {
    throw new ApiError(
      403,
      "Please verify your email first"
    );
  }


  const isPasswordValid =
    await user.isPasswordCorrect(
      password
    );

  if (!isPasswordValid) {
    throw new ApiError(
      401,
      "Invalid user credentials"
    );
  }



  const {
    accessToken,
    refreshToken,
  } = await generateAccessAndRefreshTokens(
    user._id
  );

 

  user.lastLoginAt = new Date();

  // Don't store raw IP unless you intentionally enable it.
  // user.lastLoginIp = req.ip;

  await user.save({
    validateBeforeSave: false,
  });

 

  const loggedInUser =
    await User.findById(user._id);

  const cookieOptions =
    getCookieOptions();

  return res
    .status(200)

    .cookie(
      ACCESS_COOKIE_NAME,
      accessToken,
      cookieOptions
    )

    .cookie(
      REFRESH_COOKIE_NAME,
      refreshToken,
      cookieOptions
    )

    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser.toSafeObject(),
        },
        "User logged in successfully"
      )
    );
});



const logoutUser = asyncHandler(async (req, res) => {
  if (req.user?._id) {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $unset: {
          refreshToken: 1,
        },
      },
      {
        new: true,
      }
    );
  }

  const cookieOptions =
    getCookieOptions();

  return res
    .status(200)

    .clearCookie(
      ACCESS_COOKIE_NAME,
      cookieOptions
    )

    .clearCookie(
      REFRESH_COOKIE_NAME,
      cookieOptions
    )

    .json(
      new ApiResponse(
        200,
        null,
        "User logged out successfully"
      )
    );
});



const refreshAccessToken = asyncHandler(
  async (req, res) => {
    const incomingRefreshToken =
      req.cookies?.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(
        401,
        "Refresh token is required"
      );
    }

    try {
     
      const decoded = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );

      if (!decoded?._id) {
        throw new ApiError(
          401,
          "Invalid refresh token"
        );
      }

    

      const user = await User.findById(
        decoded._id
      ).select("+refreshToken");

      if (!user) {
        throw new ApiError(
          401,
          "Invalid refresh token"
        );
      }

     

      if (!user.isActive || user.isSuspended) {
        throw new ApiError(
          403,
          "Account is not allowed to continue"
        );
      }


      if (
        !user.refreshToken ||
        user.refreshToken !==
          incomingRefreshToken
      ) {
        throw new ApiError(
          401,
          "Refresh token expired or already used"
        );
      }


      const {
        accessToken,
        refreshToken: newRefreshToken,
      } = await generateAccessAndRefreshTokens(
        user._id
      );

      const safeUser =
        await User.findById(user._id);

      const cookieOptions =
        getCookieOptions();

      return res
        .status(200)

        .cookie(
          ACCESS_COOKIE_NAME,
          accessToken,
          cookieOptions
        )

        .cookie(
          REFRESH_COOKIE_NAME,
          newRefreshToken,
          cookieOptions
        )

        .json(
          new ApiResponse(
            200,
            {
              user: safeUser.toSafeObject(),
            },
            "Access token refreshed successfully"
          )
        );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (
        error.name === "TokenExpiredError"
      ) {
        throw new ApiError(
          401,
          "Refresh token has expired"
        );
      }

      if (
        error.name === "JsonWebTokenError"
      ) {
        throw new ApiError(
          401,
          "Invalid refresh token"
        );
      }

      throw new ApiError(
        401,
        "Unable to refresh access token"
      );
    }
  }
);


const changeCurrentPassword =
  asyncHandler(async (req, res) => {
    const {
      oldPassword,
      newPassword,
    } = req.body;

    if (!oldPassword || !newPassword) {
      throw new ApiError(
        400,
        "Old password and new password are required"
      );
    }

    if (newPassword.length < 8) {
      throw new ApiError(
        400,
        "New password must be at least 8 characters"
      );
    }

    if (newPassword.length > 128) {
      throw new ApiError(
        400,
        "New password cannot exceed 128 characters"
      );
    }

    const user =
      await User.findById(
        req.user._id
      ).select("+password");

    if (!user) {
      throw new ApiError(
        404,
        "User not found"
      );
    }

    const isOldPasswordCorrect =
      await user.isPasswordCorrect(
        oldPassword
      );

    if (!isOldPasswordCorrect) {
      throw new ApiError(
        400,
        "Invalid old password"
      );
    }

    const isSamePassword =
      await bcrypt.compare(
        newPassword,
        user.password
      );

    if (isSamePassword) {
      throw new ApiError(
        400,
        "New password must be different from old password"
      );
    }

    user.password = newPassword;

  
    user.refreshToken = null;

    await user.save();

    const cookieOptions =
      getCookieOptions();

    return res
      .status(200)

      .clearCookie(
        ACCESS_COOKIE_NAME,
        cookieOptions
      )

      .clearCookie(
        REFRESH_COOKIE_NAME,
        cookieOptions
      )

      .json(
        new ApiResponse(
          200,
          null,
          "Password changed successfully. Please login again."
        )
      );
  });


const getCurrentUser =
  asyncHandler(async (req, res) => {
    const user =
      await User.findById(
        req.user._id
      );

    if (!user) {
      throw new ApiError(
        404,
        "User not found"
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          user.toSafeObject(),
          "User fetched successfully"
        )
      );
  });



const updateAccountDetails =
  asyncHandler(async (req, res) => {
    const {
      fullName,
      email,
      phone,
      bio,
    } = req.body;

    if (
      fullName === undefined &&
      email === undefined &&
      phone === undefined &&
      bio === undefined
    ) {
      throw new ApiError(
        400,
        "Provide at least one field to update"
      );
    }

    const updateFields = {};

   

    if (fullName !== undefined) {
      const value = fullName.trim();

      if (value.length < 2) {
        throw new ApiError(
          400,
          "Full name must be at least 2 characters"
        );
      }

      if (value.length > 100) {
        throw new ApiError(
          400,
          "Full name cannot exceed 100 characters"
        );
      }

      updateFields.fullName = value;
    }

    

    if (bio !== undefined) {
      const value = bio.trim();

      if (value.length > 300) {
        throw new ApiError(
          400,
          "Bio cannot exceed 300 characters"
        );
      }

      updateFields.bio = value;
    }


    if (email !== undefined) {
      const normalizedEmail =
        email.trim().toLowerCase();

      const emailRegex =
        /^\S+@\S+\.\S+$/;

      if (!emailRegex.test(normalizedEmail)) {
        throw new ApiError(
          400,
          "Invalid email format"
        );
      }

      const emailExists =
        await User.findOne({
          email: normalizedEmail,
          _id: {
            $ne: req.user._id,
          },
        }).select("_id");

      if (emailExists) {
        throw new ApiError(
          409,
          "Email is already taken"
        );
      }

      

      updateFields.email =
        normalizedEmail;

      updateFields.isVerified =
        false;
    }

    

    if (phone !== undefined) {
      const normalizedPhone =
        phone.trim();

      const phoneRegex =
        /^\+?[1-9]\d{7,14}$/;

      if (!phoneRegex.test(normalizedPhone)) {
        throw new ApiError(
          400,
          "Please enter a valid phone number"
        );
      }

      const phoneExists =
        await User.findOne({
          phone: normalizedPhone,
          _id: {
            $ne: req.user._id,
          },
        }).select("_id");

      if (phoneExists) {
        throw new ApiError(
          409,
          "Phone number is already registered"
        );
      }

      updateFields.phone =
        normalizedPhone;
    }

   
    const user =
      await User.findByIdAndUpdate(
        req.user._id,
        {
          $set: updateFields,
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!user) {
      throw new ApiError(
        404,
        "User not found"
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          user.toSafeObject(),
          "Account details updated successfully"
        )
      );
  });



const updateUserAvatar =
  asyncHandler(async (req, res) => {
    const avatarLocalPath =
      req.file?.path;

    if (!avatarLocalPath) {
      throw new ApiError(
        400,
        "Avatar file is required"
      );
    }

   

    const avatar =
      await uploadOnCloudinary(
        avatarLocalPath
      );

    if (!avatar?.url) {
      throw new ApiError(
        500,
        "Failed to upload avatar"
      );
    }

   
    const oldUser =
      await User.findById(
        req.user._id
      ).select(
        "avatarPublicId"
      );

    if (!oldUser) {
      throw new ApiError(
        404,
        "User not found"
      );
    }


   
      await User.findByIdAndUpdate(
        req.user._id,
        {
          $set: {
            avatar: avatar.url,

            avatarPublicId:
              avatar.public_id || null,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!user) {
      throw new ApiError(
        404,
        "User not found"
      );
    }

  
    // Delete old Cloudinary image
    

    if (
      oldUser.avatarPublicId &&
      oldUser.avatarPublicId !==
        avatar.public_id
    ) {
      await deleteFromCloudinary(
        oldUser.avatarPublicId
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          user.toSafeObject(),
          "Avatar updated successfully"
        )
      );
  });




export {
  registerUser,
  sendOTP,
  verifyOTP,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
};