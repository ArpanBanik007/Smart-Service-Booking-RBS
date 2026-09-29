import { useParams } from "react-router-dom";
import AdminPageShell from "./AdminPageShell.jsx";

export function AdminDashboardPage() {
  return (
    <AdminPageShell title="Platform Analytics & Overview" subtitle="System-wide performance, active users, revenues, and verifications">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">Total Users</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">0</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">Verified Providers</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">0</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">Completed Bookings</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">0</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">Total Revenue</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">₹0.00</p>
        </div>
      </div>
      <p className="mt-6 text-sm text-slate-500">Admin dashboard analytics, verification queues, and audit logs ready for Phase 7.</p>
    </AdminPageShell>
  );
}

export function AdminUsersPage() {
  return (
    <AdminPageShell title="User Management" subtitle="Manage registered customers, account status, and permissions">
      <p className="text-sm text-slate-500">Users table with suspend/activate controls ready for Phase 7.</p>
    </AdminPageShell>
  );
}

export function AdminProvidersPage() {
  return (
    <AdminPageShell title="Provider Management" subtitle="Registered service partners, KYC statuses, and performance ratings">
      <p className="text-sm text-slate-500">Providers table ready for Phase 7.</p>
    </AdminPageShell>
  );
}

export function AdminVerificationsPage() {
  return (
    <AdminPageShell title="Pending KYC Verifications" subtitle="Review submitted partner documents and business credentials">
      <p className="text-sm text-slate-500">Verification approval queue ready for Phase 7.</p>
    </AdminPageShell>
  );
}

export function AdminVerificationDetailsPage() {
  const { id } = useParams();
  return (
    <AdminPageShell title="Verification Details" subtitle={`Application #${id}`}>
      <p className="text-sm text-slate-500">Document inspection and Approve/Reject controls ready for Phase 7.</p>
    </AdminPageShell>
  );
}

export function AdminCategoriesPage() {
  return (
    <AdminPageShell title="Service Categories" subtitle="Manage marketplace categories and icons">
      <p className="text-sm text-slate-500">Category CRUD controls ready for Phase 7.</p>
    </AdminPageShell>
  );
}

export function AdminServicesPage() {
  return (
    <AdminPageShell title="All Platform Services" subtitle="Manage active service offerings across all providers">
      <p className="text-sm text-slate-500">Services catalog ready for Phase 7.</p>
    </AdminPageShell>
  );
}

export function AdminBookingsPage() {
  return (
    <AdminPageShell title="All System Bookings" subtitle="Live feed and historical records of all service orders">
      <p className="text-sm text-slate-500">Master bookings list ready for Phase 7.</p>
    </AdminPageShell>
  );
}

export function AdminPaymentsPage() {
  return (
    <AdminPageShell title="Payments & Transactions" subtitle="Razorpay captured transactions, payouts, and balances">
      <p className="text-sm text-slate-500">Payment ledger ready for Phase 7.</p>
    </AdminPageShell>
  );
}

export function AdminRefundsPage() {
  return (
    <AdminPageShell title="Refund Requests" subtitle="Customer refund claims and dispute management">
      <p className="text-sm text-slate-500">Refund processing queue ready for Phase 7.</p>
    </AdminPageShell>
  );
}

export function AdminReviewsPage() {
  return (
    <AdminPageShell title="Review Moderation" subtitle="Inspect customer ratings and hide inappropriate reviews">
      <p className="text-sm text-slate-500">Review moderation controls ready for Phase 7.</p>
    </AdminPageShell>
  );
}
