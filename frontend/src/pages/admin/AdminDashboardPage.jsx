import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import AdminPageShell from "./AdminPageShell.jsx";
import {
  FiUsers,
  FiBriefcase,
  FiCalendar,
  FiCreditCard,
  FiCheckSquare,
  FiRefreshCw,
  FiArrowUpRight,
  FiAlertCircle,
  FiClock,
  FiTrendingUp,
} from "react-icons/fi";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchStats = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api.get(ENDPOINTS.ADMIN.DASHBOARD);
      setStats(res.data?.data || null);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <AdminPageShell
      title="Platform Overview & KPI Metrics"
      subtitle="Real-time monitor for marketplace transactions, user registrations, and verification queues"
    >
      {errorMsg && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          <FiAlertCircle className="text-base" /> {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Customers
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-lg text-indigo-700">
                  <FiUsers />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {stats?.totalUsers || 0}
              </p>
              <Link
                to="/admin/users"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Manage users <FiArrowUpRight />
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Service Partners
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-lg text-emerald-700">
                  <FiBriefcase />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {stats?.totalProviders || 0}
              </p>
              <Link
                to="/admin/providers"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                View providers <FiArrowUpRight />
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Service Bookings
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-lg text-amber-700">
                  <FiCalendar />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {stats?.totalBookings || 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Completed: <span className="font-bold text-slate-800">{stats?.completedBookings || 0}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Platform Volume
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-lg text-violet-700">
                  <FiCreditCard />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                ₹{(stats?.revenue || 0).toLocaleString("en-IN")}
              </p>
              <Link
                to="/admin/payments"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700"
              >
                Transactions ledger <FiArrowUpRight />
              </Link>
            </div>
          </div>

          {/* Action Queues */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Pending KYC Verifications */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 text-lg">
                    <FiCheckSquare />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Partner Verifications Queue
                    </h3>
                    <p className="text-xs text-slate-600">
                      Providers awaiting identity & trade certificate review
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-extrabold text-amber-900">
                  {stats?.pendingVerifications || 0} Pending
                </span>
              </div>
              <p className="mt-4 text-xs text-slate-600">
                Verify provider licenses, identity proofs, and background details to enable them on the marketplace search.
              </p>
              <div className="mt-4">
                <Link
                  to="/admin/verifications"
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-700"
                >
                  Open Verifications Queue <FiArrowUpRight />
                </Link>
              </div>
            </div>

            {/* Pending Refunds */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700 text-lg">
                    <FiRefreshCw />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Disputed Refunds
                    </h3>
                    <p className="text-xs text-slate-600">
                      Cancelled orders requiring customer reimbursement
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-rose-200 px-3 py-1 text-xs font-extrabold text-rose-900">
                  {stats?.refunds || 0} Claims
                </span>
              </div>
              <p className="mt-4 text-xs text-slate-600">
                Process or reject customer refund claims with direct automated Razorpay refund payout processing.
              </p>
              <div className="mt-4">
                <Link
                  to="/admin/refunds"
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"
                >
                  Manage Refunds <FiArrowUpRight />
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Administrative Quick Navigation
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Link
                to="/admin/categories"
                className="flex flex-col items-center justify-center rounded-xl border border-slate-200 p-4 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40"
              >
                <span className="text-xl text-indigo-600">🏷️</span>
                <span className="mt-2 text-xs font-bold text-slate-800">Categories</span>
                <span className="text-[10px] text-slate-400">Configure marketplace taxonomies</span>
              </Link>
              <Link
                to="/admin/services"
                className="flex flex-col items-center justify-center rounded-xl border border-slate-200 p-4 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40"
              >
                <span className="text-xl text-indigo-600">🛠️</span>
                <span className="mt-2 text-xs font-bold text-slate-800">Services</span>
                <span className="text-[10px] text-slate-400">Platform-wide service listings</span>
              </Link>
              <Link
                to="/admin/bookings"
                className="flex flex-col items-center justify-center rounded-xl border border-slate-200 p-4 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40"
              >
                <span className="text-xl text-indigo-600">📅</span>
                <span className="mt-2 text-xs font-bold text-slate-800">Bookings</span>
                <span className="text-[10px] text-slate-400">Monitor live customer orders</span>
              </Link>
              <Link
                to="/admin/reviews"
                className="flex flex-col items-center justify-center rounded-xl border border-slate-200 p-4 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40"
              >
                <span className="text-xl text-indigo-600">⭐</span>
                <span className="mt-2 text-xs font-bold text-slate-800">Reviews</span>
                <span className="text-[10px] text-slate-400">Moderate customer ratings</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
