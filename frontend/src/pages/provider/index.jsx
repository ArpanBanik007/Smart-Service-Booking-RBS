import { useParams } from "react-router-dom";
import ProviderPageShell from "./ProviderPageShell.jsx";

export function ProviderDashboardPage() {
  return (
    <ProviderPageShell title="Provider Dashboard" subtitle="Manage bookings, accept incoming requests, and review daily stats">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">Active Bookings</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">0</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">Completed Jobs</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">0</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">Total Earnings</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">₹0.00</p>
        </div>
      </div>
      <p className="mt-6 text-sm text-slate-500">Provider dashboard metrics & live request dispatch will be built in Phase 6.</p>
    </ProviderPageShell>
  );
}

export function ProviderBookingsPage() {
  return (
    <ProviderPageShell title="Provider Bookings" subtitle="Incoming requests and scheduled jobs">
      <p className="text-sm text-slate-500">Booking management table ready for Phase 6.</p>
    </ProviderPageShell>
  );
}

export function ProviderBookingDetailsPage() {
  const { id } = useParams();
  return (
    <ProviderPageShell title="Booking Details" subtitle={`Managing Job #${id}`}>
      <p className="text-sm text-slate-500">Status transition controls (Accept, On The Way, Start, Complete) will be connected here.</p>
    </ProviderPageShell>
  );
}

export function ProviderServicesPage() {
  return (
    <ProviderPageShell title="Offered Services" subtitle="Manage service catalog, pricing, and active statuses">
      <p className="text-sm text-slate-500">Service catalog editor ready for Phase 6.</p>
    </ProviderPageShell>
  );
}

export function ProviderServiceAreaPage() {
  return (
    <ProviderPageShell title="Service Area" subtitle="Define working radius and coverage locations">
      <p className="text-sm text-slate-500">Map-based radius selector ready for Phase 6.</p>
    </ProviderPageShell>
  );
}

export function ProviderAvailabilityPage() {
  return (
    <ProviderPageShell title="Working Hours & Availability" subtitle="Set weekly operating hours and on-duty status">
      <p className="text-sm text-slate-500">Schedule planner ready for Phase 6.</p>
    </ProviderPageShell>
  );
}

export function ProviderReviewsPage() {
  return (
    <ProviderPageShell title="Customer Reviews" subtitle="Feedback and ratings from completed service jobs">
      <p className="text-sm text-slate-500">Reviews list ready for Phase 6.</p>
    </ProviderPageShell>
  );
}

export function ProviderEarningsPage() {
  return (
    <ProviderPageShell title="Earnings & Payouts" subtitle="Financial overview and payment reconciliations">
      <p className="text-sm text-slate-500">Earnings breakdown ready for Phase 6.</p>
    </ProviderPageShell>
  );
}

export function ProviderProfilePage() {
  return (
    <ProviderPageShell title="Business Profile" subtitle="Public listing details, bio, and business verification">
      <p className="text-sm text-slate-500">Profile editor ready for Phase 6.</p>
    </ProviderPageShell>
  );
}
