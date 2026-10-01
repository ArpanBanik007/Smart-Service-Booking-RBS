import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import AdminPageShell from "./AdminPageShell.jsx";
import {
  FiCalendar,
  FiFilter,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiExternalLink,
  FiCreditCard,
} from "react-icons/fi";

const STATUS_TABS = [
  { id: "", label: "All Bookings" },
  { id: "PENDING", label: "Pending" },
  { id: "ACCEPTED", label: "Accepted" },
  { id: "ON_THE_WAY", label: "On The Way" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "COMPLETED", label: "Completed" },
  { id: "CANCELLED", label: "Cancelled" },
];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [selectedStatus, setSelectedStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchBookings = async (page = 1) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (selectedStatus) params.set("bookingStatus", selectedStatus);

      const res = await api.get(`${ENDPOINTS.ADMIN.BOOKINGS}?${params.toString()}`);
      setBookings(res.data?.data?.bookings || []);
      if (res.data?.data?.pagination) {
        setPagination({
          page: res.data.data.pagination.page || 1,
          limit: 10,
          total: res.data.data.pagination.totalBookings || 0,
          pages: res.data.data.pagination.totalPages || 1,
        });
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load bookings feed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(1);
  }, [selectedStatus]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "COMPLETED":
        return "bg-emerald-100 text-emerald-700";
      case "ON_THE_WAY":
      case "IN_PROGRESS":
        return "bg-indigo-100 text-indigo-700";
      case "ACCEPTED":
        return "bg-blue-100 text-blue-700";
      case "CANCELLED":
        return "bg-rose-100 text-rose-700";
      default:
        return "bg-amber-100 text-amber-700";
    }
  };

  return (
    <AdminPageShell
      title="Master Bookings Ledger"
      subtitle="Audit real-time appointment bookings, dispatch stages, and fulfillment statuses"
    >
      {/* Status Filter Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedStatus(t.id)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
              selectedStatus === t.id
                ? "bg-indigo-600 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          <FiAlertCircle className="text-base" /> {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FiCalendar className="text-4xl text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">No bookings found</p>
          <p className="text-xs text-slate-400">
            {selectedStatus ? `No bookings with status "${selectedStatus}"` : "No bookings recorded yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 font-semibold text-slate-600">
                <th className="px-4 py-3">Order ID / Service</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Booking Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((b) => (
                <tr key={b._id} className="transition hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-mono text-[10px] text-slate-400">
                      #{b._id.slice(-8).toUpperCase()}
                    </p>
                    <p className="font-bold text-slate-900">
                      {b.service?.title || "Service"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{b.user?.fullName || "Customer"}</p>
                    <p className="text-[11px] text-slate-400">{b.user?.phone || b.user?.email || "—"}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {b.provider?.businessName || "Assigned Partner"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <p className="font-semibold">
                      {new Date(b.scheduledDate).toLocaleDateString()}
                    </p>
                    <p className="text-[11px] text-slate-400">{b.timeSlot || "Scheduled slot"}</p>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    ₹{b.totalAmount}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${getStatusBadge(
                        b.bookingStatus
                      )}`}
                    >
                      {b.bookingStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        b.paymentStatus === "PAID"
                          ? "text-emerald-600"
                          : b.paymentStatus === "REFUNDED"
                          ? "text-rose-600"
                          : "text-amber-600"
                      }`}
                    >
                      <FiCreditCard className="text-xs" />
                      {b.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/booking/status/${b._id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Live View <FiExternalLink />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Bar */}
      {pagination.pages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500">
          <span>
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </span>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchBookings(pagination.page - 1)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <FiChevronLeft /> Prev
            </button>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchBookings(pagination.page + 1)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Next <FiChevronRight />
            </button>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
