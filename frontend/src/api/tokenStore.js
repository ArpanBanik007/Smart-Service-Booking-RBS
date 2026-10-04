/**
 * localStorage-based token helpers.
 * Provides a fallback for cross-origin deployments (e.g. Vercel frontend → Render backend)
 * where httpOnly cookies may not be transmitted by the browser.
 */

export const saveTokens = (accessToken, refreshToken) => {
  if (accessToken) localStorage.setItem("accessToken", accessToken);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

export const getStoredAccessToken = () => localStorage.getItem("accessToken");
export const getStoredRefreshToken = () => localStorage.getItem("refreshToken");
