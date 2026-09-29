import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiGrid,
  FiUsers,
  FiBriefcase,
  FiCheckSquare,
  FiTag,
  FiLayers,
  FiCalendar,
  FiCreditCard,
  FiRefreshCw,
  FiStar,
  FiLogOut,
  FiExternalLink,
} from "react-icons/fi";
import { logoutUser } from "../../store/slices/authSlice.js";

const ADMIN_NAV = [
  { path: "/admin/dashboard", label: "Dashboard", icon: FiGrid },
  { path: "/admin/users", label: "Users", icon: FiUsers },
  { path: "/admin/providers", label: "Providers", icon: FiBriefcase },
  { path: "/admin/verifications", label: "Verifications", icon: FiCheckSquare },
  { path: "/admin/categories", label: "Categories", icon: FiTag },
  { path: "/admin/services", label: "Services", icon: FiLayers },
  { path: "/admin/bookings", label: "Bookings", icon: FiCalendar },
  { path: "/admin/payments", label: "Payments", icon: FiCreditCard },
  { path: "/admin/refunds", label: "Refunds", icon: FiRefreshCw },
  { path: "/admin/reviews", label: "Reviews", icon: FiStar },
];

export default function AdminPageShell({ title, subtitle, children }) {
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
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-slate-900 text-white md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-lg font-bold text-white shadow-sm">
            N
          </span>
          <div className="flex flex-col">
            <span className="text-base font-extrabold text-white">Admin Control</span>
            <span className="text-[10px] text-slate-400">Near It... Platform</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {ADMIN_NAV.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-600 text-white font-semibold"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className={`text-lg ${active ? "text-white" : "text-slate-400"}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <FiExternalLink />
            Customer Storefront
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/40"
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
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
              Administrator: {user?.fullName || "Admin"}
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
