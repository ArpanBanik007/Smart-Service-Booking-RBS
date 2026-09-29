import { Routes, Route } from "react-router-dom";

// Public pages
import HomePage from "../pages/home/HomePage.jsx";
import LoginPage from "../pages/auth/LoginPage.jsx";
import RegisterPage from "../pages/auth/RegisterPage.jsx";
import VerifyOtpPage from "../pages/auth/VerifyOtpPage.jsx";
import UnauthorizedPage from "../pages/auth/UnauthorizedPage.jsx";
import NotFoundPage from "../pages/auth/NotFoundPage.jsx";

// Route guards
import ProtectedRoute from "./ProtectedRoute.jsx";
import GuestRoute from "./GuestRoute.jsx";

// User pages
import {
  ProfilePage,
  AddressesPage,
  ProvidersExplorePage,
  ProviderDetailsPage,
  BookServicePage,
  BookingSummaryPage,
  BookingStatusPage,
  MyBookingsPage,
  BookingDetailsPage,
  NotificationsPage,
  BecomeProviderPage,
} from "../pages/user/index.jsx";

// Provider pages
import {
  ProviderDashboardPage,
  ProviderBookingsPage,
  ProviderBookingDetailsPage,
  ProviderServicesPage,
  ProviderServiceAreaPage,
  ProviderAvailabilityPage,
  ProviderReviewsPage,
  ProviderEarningsPage,
  ProviderProfilePage,
} from "../pages/provider/index.jsx";

// Admin pages
import {
  AdminDashboardPage,
  AdminUsersPage,
  AdminProvidersPage,
  AdminVerificationsPage,
  AdminVerificationDetailsPage,
  AdminCategoriesPage,
  AdminServicesPage,
  AdminBookingsPage,
  AdminPaymentsPage,
  AdminRefundsPage,
  AdminReviewsPage,
} from "../pages/admin/index.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      {/* ========================================================
          PUBLIC ROUTES
      ======================================================== */}
      <Route path="/" element={<HomePage />} />
      <Route path="/providers" element={<ProvidersExplorePage />} />
      <Route path="/providers/:id" element={<ProviderDetailsPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* ========================================================
          GUEST ONLY ROUTES (Redirects logged-in users to home/dash)
      ======================================================== */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
      </Route>

      {/* ========================================================
          USER PROTECTED ROUTES (user, provider, or admin)
      ======================================================== */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["user", "provider", "admin"]} />
        }
      >
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/addresses" element={<AddressesPage />} />
        <Route path="/book/:serviceId" element={<BookServicePage />} />
        <Route path="/booking/summary" element={<BookingSummaryPage />} />
        <Route path="/booking/status/:id" element={<BookingStatusPage />} />
        <Route path="/bookings" element={<MyBookingsPage />} />
        <Route path="/bookings/:id" element={<BookingDetailsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/become-provider" element={<BecomeProviderPage />} />
      </Route>

      {/* ========================================================
          PROVIDER PROTECTED ROUTES (role === 'provider')
      ======================================================== */}
      <Route element={<ProtectedRoute allowedRoles={["provider"]} />}>
        <Route path="/provider/dashboard" element={<ProviderDashboardPage />} />
        <Route path="/provider/bookings" element={<ProviderBookingsPage />} />
        <Route
          path="/provider/bookings/:id"
          element={<ProviderBookingDetailsPage />}
        />
        <Route path="/provider/services" element={<ProviderServicesPage />} />
        <Route
          path="/provider/service-area"
          element={<ProviderServiceAreaPage />}
        />
        <Route
          path="/provider/availability"
          element={<ProviderAvailabilityPage />}
        />
        <Route path="/provider/reviews" element={<ProviderReviewsPage />} />
        <Route path="/provider/earnings" element={<ProviderEarningsPage />} />
        <Route path="/provider/profile" element={<ProviderProfilePage />} />
      </Route>

      {/* ========================================================
          ADMIN PROTECTED ROUTES (role === 'admin')
      ======================================================== */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/providers" element={<AdminProvidersPage />} />
        <Route
          path="/admin/verifications"
          element={<AdminVerificationsPage />}
        />
        <Route
          path="/admin/verifications/:id"
          element={<AdminVerificationDetailsPage />}
        />
        <Route path="/admin/categories" element={<AdminCategoriesPage />} />
        <Route path="/admin/services" element={<AdminServicesPage />} />
        <Route path="/admin/bookings" element={<AdminBookingsPage />} />
        <Route path="/admin/payments" element={<AdminPaymentsPage />} />
        <Route path="/admin/refunds" element={<AdminRefundsPage />} />
        <Route path="/admin/reviews" element={<AdminReviewsPage />} />
      </Route>

      {/* ========================================================
          404 FALLTHROUGH
      ======================================================== */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
