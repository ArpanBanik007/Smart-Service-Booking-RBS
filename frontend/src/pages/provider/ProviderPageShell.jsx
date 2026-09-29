import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiGrid,
  FiCalendar,
  FiLayers,
  FiMapPin,
  FiClock,
  FiStar,
  FiDollarSign,
  FiUser,
  FiLogOut,
  FiExternalLink,
} from "react-icons/fi";
import { logoutUser } from "../../store/slices/authSlice.js";

const PROVIDER_NAV = [
  { path: "/provider/dashboard", label: "Dashboard", icon: FiGrid },
  { path: "/provider/bookings", label: "Job Bookings", icon: FiCalendar },
  { path: "/provider/services", label: "My Services", icon: FiLayers },
  { path: "/provider/service-area", label: "Service Area", icon: FiMapPin },
  { path: "/provider/availability", label: "Availability", icon: FiClock },
  { path: "/provider/earnings", label: "Earnings", icon: FiDollarSign },
  { path: "/provider/reviews", label: "Reviews", icon: FiStar },
  { path: "/provider/profile", label: "Business Profile", icon: FiUser },
];

export default function ProviderPageShell({ title, subtitle, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white shadow-sm">
            N
          </span>
          <div className="flex flex-col">
            <span className="text-base font-extrabold text-slate-900">Partner Portal</span>
            <span className="text-[10px] text-slate-500">Near It... Provider</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {PROVIDER_NAV.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`text-lg ${active ? "text-indigo-600" : "text-slate-400"}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <FiExternalLink />
            Customer Marketplace
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
          >
            <FiLogOut />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              Provider: {user?.fullName || "Active"}
            </span>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
