import apiClient from "./axios.js";
import { ENDPOINTS } from "./endpoints.js";
import { saveTokens, clearTokens } from "./tokenStore.js";

// ─── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
  // Login with identifier (email or username) + password
  login: async (credentials) => {
    const res = await apiClient.post(ENDPOINTS.AUTH.LOGIN, credentials);
    // Store tokens from response body as fallback for cross-origin cookie issues
    const { accessToken, refreshToken } = res.data?.data || {};
    saveTokens(accessToken, refreshToken);
    return res.data;
  },

  // Register user with fullName, email, phone, username, password, otp
  register: async (userData) => {
    const res = await apiClient.post(ENDPOINTS.AUTH.REGISTER, userData);
    const { accessToken, refreshToken } = res.data?.data || {};
    saveTokens(accessToken, refreshToken);
    return res.data;
  },

  // Send OTP to email
  sendOtp: async (email) => {
    const res = await apiClient.post(ENDPOINTS.AUTH.SEND_OTP, { email });
    return res.data;
  },

  // Verify OTP
  verifyOtp: async (email, otp) => {
    const res = await apiClient.post(ENDPOINTS.AUTH.VERIFY_OTP, { email, otp });
    return res.data;
  },

  // Get current logged in user from cookie / localStorage token
  getCurrentUser: async () => {
    const res = await apiClient.get(ENDPOINTS.AUTH.CURRENT_USER);
    return res.data;
  },

  // Refresh access token
  refreshToken: async () => {
    const res = await apiClient.post(ENDPOINTS.AUTH.REFRESH_TOKEN);
    const { accessToken, refreshToken } = res.data?.data || {};
    saveTokens(accessToken, refreshToken);
    return res.data;
  },

  // Logout user and clear cookies + localStorage
  logout: async () => {
    try {
      const res = await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
      return res.data;
    } finally {
      clearTokens();
    }
  },

  // Change password
  changePassword: async (passwords) => {
    const res = await apiClient.post(ENDPOINTS.AUTH.CHANGE_PASSWORD, passwords);
    clearTokens();
    return res.data;
  },

  // Update account details
  updateAccount: async (details) => {
    const res = await apiClient.patch(ENDPOINTS.AUTH.UPDATE_ACCOUNT, details);
    return res.data;
  },

  // Update avatar (multipart form data)
  updateAvatar: async (formData) => {
    const res = await apiClient.patch(ENDPOINTS.AUTH.UPDATE_AVATAR, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },
};
