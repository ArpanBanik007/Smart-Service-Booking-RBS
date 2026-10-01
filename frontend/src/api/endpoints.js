// Centralized API endpoints matching backend routes

export const ENDPOINTS = {
  // Authentication & User routes (/api/v1/users)
  AUTH: {
    REGISTER: "/users/register",
    LOGIN: "/users/login",
    LOGOUT: "/users/logout",
    CURRENT_USER: "/users/current-user",
    REFRESH_TOKEN: "/users/refresh-token",
    SEND_OTP: "/users/sendOTP",
    VERIFY_OTP: "/users/verifyOTP",
    CHANGE_PASSWORD: "/users/change-password",
    UPDATE_ACCOUNT: "/users/update-account",
    UPDATE_AVATAR: "/users/avatar",
  },

  // Provider routes (/api/v1/provider)
  PROVIDER: {
    LIST: "/provider",
    SEARCH: "/provider/search",
    BECOME: "/provider/become",
    ME: "/provider/me",
    UPDATE_PROFILE: "/provider/profile",
    UPDATE_SERVICE_AREA: "/provider/service-area",
    UPDATE_AVAILABILITY: "/provider/availability",
    NEARBY: "/provider/nearby",
    GET_BY_ID: (id) => `/provider/${id}`,
  },

  // Provider Verification routes (/api/v1/provider-verification)
  PROVIDER_VERIFICATION: {
    SUBMIT: "/provider-verification/submit",
    ME: "/provider-verification/me",
    RESUBMIT: "/provider-verification/resubmit",
    PENDING: "/provider-verification/pending",
    GET_BY_ID: (id) => `/provider-verification/${id}`,
    APPROVE: (id) => `/provider-verification/${id}/approve`,
    REJECT: (id) => `/provider-verification/${id}/reject`,
  },

  // Category routes (/api/v1/catagory)
  CATEGORIES: {
    LIST: "/catagory",
    ADMIN_LIST: "/catagory/admin",
    CREATE: "/catagory",
    GET_BY_ID: (id) => `/catagory/${id}`,
    UPDATE: (id) => `/catagory/${id}`,
    TOGGLE_STATUS: (id) => `/catagory/${id}/toggle-status`,
    DELETE: (id) => `/catagory/${id}`,
  },

  // Service routes (/api/v1/services)
  SERVICES: {
    LIST: "/services",
    SEARCH: "/services/search",
    SUGGESTIONS: "/services/suggestions",
    BY_CATEGORY: (catId) => `/services/category/${catId}`,
    BY_PROVIDER: (providerId) => `/services/provider/${providerId}`,
    GET_BY_ID: (id) => `/services/${id}`,
    // Provider specific
    CREATE: "/services",
    MY_SERVICES: "/services/my-services",
    MY_SERVICE_BY_ID: (id) => `/services/my-services/${id}`,
    UPDATE: (id) => `/services/my-services/${id}`,
    TOGGLE_STATUS: (id) => `/services/my-services/${id}/toggle-status`,
    DELETE: (id) => `/services/my-services/${id}`,
  },

  // Address routes (/api/v1/addresses)
  ADDRESSES: {
    LIST: "/addresses",
    CREATE: "/addresses",
    GET_BY_ID: (id) => `/addresses/${id}`,
    UPDATE: (id) => `/addresses/${id}`,
    DELETE: (id) => `/addresses/${id}`,
    SET_DEFAULT: (id) => `/addresses/${id}/default`,
  },

  // Booking routes (/api/v1/bookings)
  BOOKINGS: {
    CREATE: "/bookings",
    MY_BOOKINGS: "/bookings",
    GET_BY_ID: (id) => `/bookings/${id}`,
    CANCEL: (id) => `/bookings/${id}/cancel`,
    HISTORY: (id) => `/bookings/${id}/history`,
    // Provider specific
    PROVIDER_LIST: "/bookings/provider",
    PROVIDER_GET_BY_ID: (id) => `/bookings/provider/${id}`,
    ACCEPT: (id) => `/bookings/provider/${id}/accept`,
    REJECT: (id) => `/bookings/provider/${id}/reject`,
    PROVIDER_CANCEL: (id) => `/bookings/provider/${id}/cancel`,
    ON_THE_WAY: (id) => `/bookings/provider/${id}/on-the-way`,
    START: (id) => `/bookings/provider/${id}/start`,
    COMPLETE: (id) => `/bookings/provider/${id}/complete`,
  },

  // Payment routes (/api/v1/payments)
  PAYMENTS: {
    CREATE_ORDER: "/payments/create-order",
    VERIFY: "/payments/verify",
    BY_BOOKING: (bookingId) => `/payments/booking/${bookingId}`,
    MY_PAYMENTS: "/payments/my-payments",
  },

  // Refund routes (/api/v1/refunds)
  REFUNDS: {
    REQUEST: "/refunds",
    MY_REFUNDS: "/refunds/my-refunds",
    GET_BY_ID: (id) => `/refunds/${id}`,
    ADMIN_REQUESTS: "/refunds/admin/requests",
    ADMIN_PROCESS: (id) => `/refunds/admin/${id}/process`,
    ADMIN_REJECT: (id) => `/refunds/admin/${id}/reject`,
  },

  // Review routes (/api/v1/reviews)
  REVIEWS: {
    CREATE: "/reviews",
    MY_REVIEWS: "/reviews/my-reviews",
    UPDATE: (id) => `/reviews/${id}`,
    DELETE: (id) => `/reviews/${id}`,
    BY_PROVIDER: (providerId) => `/reviews/provider/${providerId}`,
  },

  // Notification routes (/api/v1/notifications)
  NOTIFICATIONS: {
    LIST: "/notifications",
    UNREAD: "/notifications/unread",
    MARK_READ: (id) => `/notifications/${id}/read`,
    MARK_ALL_READ: "/notifications/read-all",
    DELETE: (id) => `/notifications/${id}`,
  },

  // Admin routes (/api/v1/admin)
  ADMIN: {
    DASHBOARD: "/admin/dashboard",
    USERS: "/admin/users",
    USER_BY_ID: (id) => `/admin/users/${id}`,
    SUSPEND_USER: (id) => `/admin/users/${id}/suspend`,
    ACTIVATE_USER: (id) => `/admin/users/${id}/activate`,
    PROVIDERS: "/admin/providers",
    PROVIDER_BY_ID: (id) => `/admin/providers/${id}`,
    SUSPEND_PROVIDER: (id) => `/admin/providers/${id}/suspend`,
    ACTIVATE_PROVIDER: (id) => `/admin/providers/${id}/activate`,
    APPROVE_PROVIDER: (id) => `/admin/providers/${id}/approve`,
    PENDING_VERIFICATIONS: "/admin/verifications/pending",
    APPROVE_VERIFICATION: (id) => `/admin/verifications/${id}/approve`,
    REJECT_VERIFICATION: (id) => `/admin/verifications/${id}/reject`,
    BOOKINGS: "/admin/bookings",
    BOOKING_BY_ID: (id) => `/admin/bookings/${id}`,
    PAYMENTS: "/admin/payments",
    REFUNDS: "/admin/refunds",
    PROCESS_REFUND: (id) => `/admin/refunds/${id}/process`,
    REVIEWS: "/admin/reviews",
    HIDE_REVIEW: (id) => `/admin/reviews/${id}/hide`,
    SHOW_REVIEW: (id) => `/admin/reviews/${id}/show`,
  },
};
