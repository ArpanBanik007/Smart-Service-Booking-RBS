import apiClient from "./axios.js";
import { ENDPOINTS } from "./endpoints.js";

export const authApi = {
  // Login with identifier (email or username) + password
  login: async (credentials) => {
    const res = await apiClient.post(ENDPOINTS.AUTH.LOGIN, credentials);
    return res.data;
  },

  // Register user with fullName, email, phone, username, password, otp
  register: async (userData) => {
    const res = await apiClient.post(ENDPOINTS.AUTH.REGISTER, userData);
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

  // Get current logged in user from cookie
  getCurrentUser: async () => {
    const res = await apiClient.get(ENDPOINTS.AUTH.CURRENT_USER);
    return res.data;
  },

  // Refresh access token
  refreshToken: async () => {
    const res = await apiClient.post(ENDPOINTS.AUTH.REFRESH_TOKEN);
    return res.data;
  },

  // Logout user and clear cookies
  logout: async () => {
    const res = await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
    return res.data;
  },

  // Change password
  changePassword: async (passwords) => {
    const res = await apiClient.post(ENDPOINTS.AUTH.CHANGE_PASSWORD, passwords);
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
