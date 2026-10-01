import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import ProviderPageShell from "./ProviderPageShell.jsx";
import {
  FiCalendar,
  FiCheckCircle,
  FiDollarSign,
  FiStar,
  FiArrowUpRight,
  FiClock,
  FiLayers,
  FiMapPin,
  FiAlertCircle,
} from "react-icons/fi";

export default function ProviderDashboardPage() {
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [profRes, bookRes, srvRes] = await Promise.allSettled([
        api.get(ENDPOINTS.PROVIDER.ME),
        api.get(`${ENDPOINTS.BOOKINGS.PROVIDER_LIST}?limit=5`),
        api.get(ENDPOINTS.SERVICES.MY_SERVICES),
      ]);

      if (profRes.status === "fulfilled") {
        setProfile(profRes.value.data?.data || null);
      }
      if (bookRes.status === "fulfilled") {
        setBookings(bookRes.value.data?.data?.bookings || []);
      }
      if (srvRes.status === "fulfilled") {
        const list = srvRes.value.data?.data?.services || srvRes.value.data?.data || [];
        setServices(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load provider metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const completedCount = bookings.filter((b) => b.bookingStatus === "COMPLETED").length;
  const activeCount = bookings.filter(
    (b) => !["COMPLETED", "CANCELLED", "REJECTED"].includes(b.bookingStatus)
  ).length;

  return (
    <ProviderPageShell
      title="Partner Operations Dashboard"
      subtitle="Overview of your incoming service requests, scheduled appointments, and catalog"
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
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Active Jobs
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-lg text-indigo-700">
                  <FiClock />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {activeCount}
              </p>
              <Link
                to="/provider/bookings"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Manage bookings <FiArrowUpRight />
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Completed Jobs
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-lg text-emerald-700">
                  <FiCheckCircle />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {completedCount}
              </p>
              <p className="mt-1 text-xs text-slate-400">Successfully fulfilled</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Customer Rating
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-lg text-amber-700">
                  <FiStar />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {profile?.rating?.average?.toFixed(1) || "5.0"}
              </p>
              <Link
                to="/provider/reviews"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700"
              >
                View {profile?.rating?.count || 0} reviews <FiArrowUpRight />
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Active Services
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-lg text-violet-700">
                  <FiLayers />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {services.length}
              </p>
              <Link
                to="/provider/services"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700"
              >
                Manage catalog <FiArrowUpRight />
              </Link>
            </div>
          </div>

          {/* Recent Booking Requests */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Recent Booking Requests
                </h3>
                <p className="text-xs text-slate-500">
                  Incoming orders awaiting confirmation or fulfillment
                </p>
              </div>
              <Link
                to="/provider/bookings"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                View all bookings &rarr;
              </Link>
            </div>

            {bookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FiCalendar className="text-4xl text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  No active job requests yet
                </p>
                <p className="text-xs text-slate-400">
                  Ensure your services and availability are enabled to appear in search.
                </p>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {bookings.map((b) => (
                  <div
                    key={b._id}
                    className="flex flex-wrap items-center justify-between gap-4 py-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {b.service?.title || "Requested Service"}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600">
                          #{b._id.slice(-6).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Customer: <span className="font-semibold text-slate-800">{b.user?.fullName || "Customer"}</span> •{" "}
                        Scheduled: {new Date(b.scheduledDate).toLocaleDateString()} at {b.timeSlot}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                        {b.bookingStatus}
                      </span>
                      <Link
                        to={`/provider/bookings/${b._id}`}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Action Job &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </ProviderPageShell>
  );
}
