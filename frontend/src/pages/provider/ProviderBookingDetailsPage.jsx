import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import ProviderPageShell from "./ProviderPageShell.jsx";
import ServiceMap from "../../components/map/ServiceMap.jsx";
import {
  FiArrowLeft,
  FiClock,
  FiMapPin,
  FiUser,
  FiPhone,
  FiCheck,
  FiX,
  FiNavigation,
  FiPlay,
  FiCheckCircle,
  FiAlertCircle,
  FiCreditCard,
  FiAlertTriangle,
} from "react-icons/fi";

export default function ProviderBookingDetailsPage() {
  const { id } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const fetchBooking = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api.get(ENDPOINTS.BOOKINGS.PROVIDER_GET_BY_ID(id));
      setBooking(res.data?.data || null);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load booking details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const handleTransition = async (actionFn, successText) => {
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await actionFn();
      setSuccessMsg(successText);
      fetchBooking();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Status transition failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = () =>
    handleTransition(
      () => api.patch(ENDPOINTS.BOOKINGS.ACCEPT(id)),
      "Booking accepted successfully!"
    );

  const handleReject = () => {
    const reason = prompt("Enter a reason for declining this request:");
    if (!reason || !reason.trim()) return;
    handleTransition(
      () => api.patch(ENDPOINTS.BOOKINGS.REJECT(id), { reason: reason.trim() }),
      "Booking declined."
    );
  };

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) return;
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await api.patch(ENDPOINTS.BOOKINGS.PROVIDER_CANCEL(id), {
        reason: cancelReason.trim(),
      });
      const refundInfo = res.data?.data?.refund;
      const refundMsg = refundInfo?.refunded
        ? ` Full refund of ₹${refundInfo.amount} has been initiated to the customer.`
        : "";
      setSuccessMsg(`Booking cancelled successfully.${refundMsg}`);
      setShowCancelConfirm(false);
      setCancelReason("");
      fetchBooking();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to cancel booking.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkOnTheWay = () =>
    handleTransition(
      () => api.patch(ENDPOINTS.BOOKINGS.ON_THE_WAY(id)),
      "Status updated to: On The Way! Customer can now track your arrival."
    );

  const handleStartService = () =>
    handleTransition(
      () => api.patch(ENDPOINTS.BOOKINGS.START(id)),
      "Service started!"
    );

  const handleCompleteService = () =>
    handleTransition(
      () => api.patch(ENDPOINTS.BOOKINGS.COMPLETE(id)),
      "Service marked as completed! Payment is credited to your provider ledger."
    );

  const addressCoords = booking?.address?.coordinates?.coordinates; // GeoJSON [lng, lat]
  const customerLoc =
    Array.isArray(addressCoords) && addressCoords.length === 2
      ? { latitude: addressCoords[1], longitude: addressCoords[0] }
      : null;

  const canCancel =
    booking &&
    !["COMPLETED", "CANCELLED", "REJECTED"].includes(booking.bookingStatus);

  return (
    <ProviderPageShell
      title="Job Dispatch & Execution"
      subtitle={`Managing Booking #${id}`}
    >
      <div className="mb-6">
        <Link
          to="/provider/bookings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <FiArrowLeft /> Back to Job Bookings
        </Link>
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
      ) : !booking ? (
        <div className="py-12 text-center text-sm text-slate-500">
          Booking record not found.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Status & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
            <div>
              <span className="font-mono text-xs font-bold text-slate-400">
                BOOKING #{booking._id.slice(-8).toUpperCase()}
              </span>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                {booking.service?.title || "Service"}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <FiClock className="text-indigo-600" />
                  Scheduled: {new Date(booking.scheduledDate).toLocaleDateString()} at {booking.timeSlot}
                </span>
                <span className="flex items-center gap-1">
                  <FiCreditCard className="text-indigo-600" />
                  Total: ₹{booking.totalAmount} ({booking.paymentStatus})
                </span>
              </div>
            </div>

            {/* State Transition Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {booking.bookingStatus === "PENDING" && (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleAccept}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <FiCheck /> Accept Job
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleReject}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                  >
                    <FiX /> Decline
                  </button>
                </>
              )}

              {booking.bookingStatus === "ACCEPTED" && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleMarkOnTheWay}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  <FiNavigation /> Depart (Mark On The Way)
                </button>
              )}

              {booking.bookingStatus === "ON_THE_WAY" && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleStartService}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  <FiPlay /> Arrived & Start Service
                </button>
              )}

              {(booking.bookingStatus === "IN_PROGRESS" || booking.bookingStatus === "STARTED") && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleCompleteService}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <FiCheckCircle /> Mark Service Completed
                </button>
              )}

              {booking.bookingStatus === "COMPLETED" && (
                <span className="rounded-xl bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-800">
                  Job Completed & Fulfilled
                </span>
              )}

              {/* Cancel Order — shown until the job is done or already cancelled */}
              {canCancel && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setShowCancelConfirm(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                >
                  <FiAlertTriangle className="shrink-0" /> Cancel Order
                </button>
              )}
            </div>
          </div>

          {/* Cancel Confirmation Dialog */}
          {showCancelConfirm && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-rose-800">
                <FiAlertTriangle /> Cancel This Booking?
              </h3>
              {booking.paymentStatus === "PAID" && (
                <p className="mt-2 text-xs text-rose-700 font-medium">
                  The customer has already paid. An automatic refund will be issued to their original payment method.
                </p>
              )}
              <p className="mt-2 text-xs text-slate-600">
                This action cannot be undone. Please provide a reason for the cancellation.
              </p>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancelling (e.g. not available that day, parts unavailable...)"
                className="mt-3 w-full rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-rose-400 focus:outline-none"
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  disabled={actionLoading || !cancelReason.trim()}
                  onClick={handleCancelBooking}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
                >
                  {actionLoading ? "Cancelling..." : "Confirm Cancellation"}
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => { setShowCancelConfirm(false); setCancelReason(""); }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Go Back
                </button>
              </div>
            </div>
          )}

          {/* Customer & Destination Details */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FiUser className="text-indigo-600" /> Customer Information
              </h3>
              <div className="mt-4 space-y-2 text-xs">
                <p className="text-sm font-bold text-slate-800">
                  {booking.user?.fullName}
                </p>
                <p className="text-slate-500">{booking.user?.email}</p>
                {booking.user?.phone && (
                  <a
                    href={`tel:${booking.user.phone}`}
                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <FiPhone /> Call Customer: {booking.user.phone}
                  </a>
                )}
                {booking.notes && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-slate-700">
                    <span className="font-semibold text-slate-900">Customer Notes:</span> {booking.notes}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FiMapPin className="text-indigo-600" /> Destination Service Address
              </h3>
              <div className="mt-4 space-y-1 text-xs text-slate-700">
                <p className="font-bold text-slate-900">{booking.address?.label || "Primary Address"}</p>
                <p>{booking.address?.addressLine}</p>
                <p>{booking.address?.city}, {booking.address?.state} - {booking.address?.pincode}</p>
                {booking.address?.landmark && (
                  <p className="text-slate-500">Landmark: {booking.address.landmark}</p>
                )}
              </div>
            </div>
          </div>

          {/* Destination Map Pin */}
          {customerLoc && (
            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FiNavigation className="text-indigo-600" /> Customer Location Pin
              </h3>
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                <ServiceMap
                  center={[customerLoc.latitude, customerLoc.longitude]}
                  zoom={14}
                  userLocation={customerLoc}
                  className="h-[300px] w-full"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </ProviderPageShell>
  );
}
