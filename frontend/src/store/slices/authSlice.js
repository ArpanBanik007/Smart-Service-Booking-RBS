import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authApi } from "../../api/authApi.js";

// Fetch currently authenticated user session via cookie
export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.getCurrentUser();
      // Backend returns new ApiResponse(200, user.toSafeObject(), ...)
      // response is { statusCode, data, message, success }
      const user = response?.data?.user || response?.data;
      return user;
    } catch (error) {
      const message =
        error.response?.data?.message || "Session expired or invalid";
      return rejectWithValue(message);
    }
  }
);

// Login user
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials);
      // Backend returns { statusCode, data: { user }, message, success }
      const user = response?.data?.user || response?.data;
      return user;
    } catch (error) {
      const message =
        error.response?.data?.message || "Invalid credentials. Please try again.";
      return rejectWithValue(message);
    }
  }
);

// Register user
export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authApi.register(userData);
      const user = response?.data?.user || response?.data;
      return user;
    } catch (error) {
      const message =
        error.response?.data?.message || "Registration failed. Please check your details.";
      return rejectWithValue(message);
    }
  }
);

// Logout user
export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { rejectWithValue }) => {
    try {
      await authApi.logout();
      return true;
    } catch (error) {
      // Even if network fails, logout locally
      return rejectWithValue(
        error.response?.data?.message || "Logout failed"
      );
    }
  }
);

const initialState = {
  user: null,
  isAuthenticated: false,
  isCheckingAuth: true, // true on startup while verifying session
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setCheckingAuth: (state, action) => {
      state.isCheckingAuth = action.payload;
    },
  },
  extraReducers: (builder) => {
    // fetchCurrentUser
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isCheckingAuth = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isCheckingAuth = false;
        state.error = null;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.isCheckingAuth = false;
      });

    // loginUser
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // registerUser
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // logoutUser
    builder
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearAuthError, setUser, setCheckingAuth } = authSlice.actions;
export default authSlice.reducer;
