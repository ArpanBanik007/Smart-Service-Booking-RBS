import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import ProviderPageShell from "./ProviderPageShell.jsx";
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiCheck,
  FiX,
  FiNavigation,
  FiPlay,
  FiCheckCircle,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiArrowRight,
} from "react-icons/fi";
import { useSocket } from "../../context/SocketContext.jsx";

const STATUS_FILTERS = [
  { id: "", label: "All Bookings" },
  { id: "PENDING", label: "Pending Requests" },
  { id: "ACCEPTED", label: "Accepted" },
  { id: "ON_THE_WAY", label: "On The Way" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "COMPLETED", label: "Completed" },
];

export default function ProviderBookingsPage() {
  const getSocketFn = useSocket();

  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchBookings = useCallback(async (page = 1) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (statusFilter) params.set("status", statusFilter);

      const res = await api.get(`${ENDPOINTS.BOOKINGS.PROVIDER_LIST}?${params.toString()}`);
      setBookings(res.data?.data?.bookings || []);
      if (res.data?.data?.pagination) {
        setPagination({
          page: res.data.data.pagination.page || 1,
          limit: 10,
          total: res.data.data.pagination.total || 0,
          pages: res.data.data.pagination.totalPages || 1,
        });
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load provider bookings.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchBookings(1);
  }, [fetchBookings]);

  // Socket.IO: Real-time updates (new requests, payment confirmations)
  useEffect(() => {
    const socket = getSocketFn ? getSocketFn() : null;
    if (!socket) return;

    const handleBookingUpdate = () => {
      // Re-fetch current page from server (source of truth)
      fetchBookings(pagination.page);
    };

    socket.on("booking_update", handleBookingUpdate);

    return () => {
      socket.off("booking_update", handleBookingUpdate);
    };
  }, [getSocketFn, fetchBookings, pagination.page]);

  const handleQuickAccept = async (bookingId) => {
    setActionId(bookingId);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await api.patch(ENDPOINTS.BOOKINGS.ACCEPT(bookingId));
      setSuccessMsg("Booking accepted! Customer has been notified.");
      fetchBookings(pagination.page);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to accept booking.");
    } finally {
      setActionId(null);
    }
  };

  const handleQuickReject = async (bookingId) => {
    const reason = prompt("Enter a brief reason for declining this request:");
    if (!reason || !reason.trim()) return;

    setActionId(bookingId);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await api.patch(ENDPOINTS.BOOKINGS.REJECT(bookingId), { reason: reason.trim() });
      setSuccessMsg("Booking declined.");
      fetchBookings(pagination.page);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to decline booking.");
    } finally {
      setActionId(null);
    }
  };

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
      case "REJECTED":
        return "bg-rose-100 text-rose-700";
      default:
        return "bg-amber-100 text-amber-700";
    }
  };

  return (
    <ProviderPageShell
      title="Job Bookings & Service Schedule"
      subtitle="Manage incoming service requests, update real-time dispatch status, and log jobs"
    >
      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatusFilter(f.id)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
              statusFilter === f.id
                ? "bg-indigo-600 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          <FiAlertCircle className="text-base" /> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-700">
          <FiCheck className="text-base" /> {successMsg}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FiCalendar className="text-4xl text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">No job bookings found</p>
          <p className="text-xs text-slate-400">
            {statusFilter ? `No bookings with filter "${statusFilter}"` : "You have no scheduled bookings yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div
              key={b._id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 md:flex-row md:items-center"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-slate-400">
                    #{b._id.slice(-8).toUpperCase()}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {b.service?.title || "Booked Service"}
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${getStatusBadge(
                      b.bookingStatus
                    )}`}
                  >
                    {b.bookingStatus}
                  </span>
                  {/* Payment Status Badge */}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      b.paymentStatus === "PAID"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {b.paymentStatus === "PAID" ? "💰 Paid" : "Payment: Pending"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    Customer: {b.user?.fullName} ({b.user?.phone || "No phone"})
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <FiClock className="text-slate-400" />
                    {new Date(b.scheduledDate).toLocaleDateString()} at {b.scheduledStartTime || b.timeSlot}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <FiMapPin className="text-slate-400" />
                    {b.address?.addressLine || b.address?.street || b.address?.city || "Customer Address"}
                  </span>
                  <span className="font-bold text-slate-900">
                    ₹{b.totalAmount}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {b.bookingStatus === "PENDING" && (
                  <>
                    <button
                      type="button"
                      disabled={actionId === b._id}
                      onClick={() => handleQuickAccept(b._id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <FiCheck /> Accept
                    </button>
                    <button
                      type="button"
                      disabled={actionId === b._id}
                      onClick={() => handleQuickReject(b._id)}
                      className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      <FiX /> Decline
                    </button>
                  </>
                )}

                <Link
                  to={`/provider/bookings/${b._id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Manage Job <FiArrowRight />
                </Link>
              </div>
            </div>
          ))}
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
    </ProviderPageShell>
  );
}
