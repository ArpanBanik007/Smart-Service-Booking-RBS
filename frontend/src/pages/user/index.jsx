import { useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import UserPageShell from "./UserPageShell.jsx";
import { FiUser, FiMapPin, FiCalendar, FiBell, FiCompass } from "react-icons/fi";

export function ProfilePage() {
  const { user } = useSelector((state) => state.auth);
  return (
    <UserPageShell title="My Profile" subtitle="Manage your personal details and account settings">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-2xl font-bold text-indigo-700">
            {user?.fullName?.charAt(0) || <FiUser />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{user?.fullName || "Guest User"}</h2>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <span className="mt-1 inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold uppercase text-indigo-700">
              Role: {user?.role || "user"}
            </span>
          </div>
        </div>
      </div>
    </UserPageShell>
  );
}

export function AddressesPage() {
  return (
    <UserPageShell title="Saved Addresses" subtitle="Manage delivery and service addresses">
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <FiMapPin className="text-4xl text-slate-300" />
        <p className="mt-2 text-sm text-slate-500">No addresses saved yet. Add your primary service location.</p>
      </div>
    </UserPageShell>
  );
}

export function ProvidersExplorePage() {
  return (
    <UserPageShell title="Nearby Service Providers" subtitle="Discover verified professionals in your local area">
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <FiCompass className="text-4xl text-indigo-500" />
        <p className="mt-2 text-sm text-slate-600">Explore providers map & directory will be loaded here in Phase 2.</p>
      </div>
    </UserPageShell>
  );
}

export function ProviderDetailsPage() {
  const { id } = useParams();
  return (
    <UserPageShell title="Provider Details" subtitle={`Viewing provider ${id}`}>
      <p className="text-sm text-slate-600">Provider details and service booking catalog will appear here in Phase 3.</p>
    </UserPageShell>
  );
}

export function BookServicePage() {
  const { serviceId } = useParams();
  return (
    <UserPageShell title="Book Service" subtitle={`Scheduling service #${serviceId}`}>
      <p className="text-sm text-slate-600">Step-by-step booking form ready for Phase 3 integration.</p>
    </UserPageShell>
  );
}

export function BookingSummaryPage() {
  return (
    <UserPageShell title="Booking Summary" subtitle="Review service details before payment">
      <p className="text-sm text-slate-600">Summary and Razorpay payment checkout will be completed in Phase 4.</p>
    </UserPageShell>
  );
}

export function BookingStatusPage() {
  const { id } = useParams();
  return (
    <UserPageShell title="Booking Status" subtitle={`Tracking Order #${id}`}>
      <p className="text-sm text-slate-600">Live order timeline and GPS tracking will be connected in Phase 4 & 5.</p>
    </UserPageShell>
  );
}

export function MyBookingsPage() {
  return (
    <UserPageShell title="My Bookings" subtitle="Track active and completed service appointments">
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <FiCalendar className="text-4xl text-slate-300" />
        <p className="mt-2 text-sm text-slate-500">You do not have any active bookings.</p>
        <Link to="/providers" className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
          Browse Services
        </Link>
      </div>
    </UserPageShell>
  );
}

export function BookingDetailsPage() {
  const { id } = useParams();
  return (
    <UserPageShell title="Booking Details" subtitle={`Order #${id}`}>
      <p className="text-sm text-slate-600">Detailed booking breakdown and invoice view.</p>
    </UserPageShell>
  );
}

export function NotificationsPage() {
  return (
    <UserPageShell title="Notifications" subtitle="Stay updated with order alerts and provider notifications">
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <FiBell className="text-4xl text-slate-300" />
        <p className="mt-2 text-sm text-slate-500">No new notifications.</p>
      </div>
    </UserPageShell>
  );
}

export function BecomeProviderPage() {
  return (
    <UserPageShell title="Become a Service Partner" subtitle="Expand your business and connect with local customers">
      <div className="max-w-xl">
        <p className="text-sm leading-relaxed text-slate-600">
          Join Near It... as a verified service professional. Complete your business profile, submit your verification documents, and start receiving job requests.
        </p>
      </div>
    </UserPageShell>
  );
}
