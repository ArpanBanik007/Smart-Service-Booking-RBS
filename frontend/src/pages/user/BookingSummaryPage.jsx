import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  FiSend,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiShield,
  FiArrowLeft,
  FiAlertCircle,
  FiInfo,
  FiCheckCircle,
} from "react-icons/fi";
import UserPageShell from "./UserPageShell.jsx";
import apiClient from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";

export default function BookingSummaryPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const bookingData = location.state || {};
  const {
    service,
    serviceId,
    addressId,
    address,
    scheduledDate,
    scheduledStartTime,
    scheduledEndTime,
    notes,
  } = bookingData;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!serviceId || !addressId || !scheduledDate) {
    return (
      <UserPageShell title="Booking Summary" subtitle="Incomplete booking details">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <FiAlertCircle className="mx-auto text-3xl text-rose-500" />
          <h3 className="mt-2 text-base font-bold text-rose-800">
            Booking session expired or incomplete
          </h3>
          <p className="mt-1 text-xs text-rose-600">
            Please pick a service and schedule a time slot to proceed.
          </p>
          <Link
            to="/providers"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <FiArrowLeft />
            Find Services
          </Link>
        </div>
      </UserPageShell>
    );
  }

  const handleSendRequest = async () => {
    setError("");
    setSubmitting(true);

    try {
      // Create booking request — NO payment at this stage
      const bookingRes = await apiClient.post(ENDPOINTS.BOOKINGS.CREATE, {
        serviceId,
        addressId,
        scheduledDate,
        scheduledStartTime,
        scheduledEndTime,
        notes: notes || "",
      });

      const booking = bookingRes.data?.data || bookingRes.data;
      const bookingId = booking._id;

      // Redirect to booking status page
      navigate(`/booking/status/${bookingId}`, { replace: true });
    } catch (err) {
      console.error("Booking request error:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to submit booking request. Please try again."
      );
      setSubmitting(false);
    }
  };

  return (
    <UserPageShell
      title="Review & Send Request"
      subtitle="Confirm your booking details before sending the request to the provider"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          to={`/book/${serviceId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          <FiArrowLeft />
          Modify date & address
        </Link>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">
            <FiAlertCircle />
            {error}
          </div>
        )}

        {/* ===== IMPORTANT NOTICE: NO UPFRONT PAYMENT ===== */}
        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
          <FiInfo className="mt-0.5 shrink-0 text-lg text-blue-600" />
          <div className="text-xs text-blue-800">
            <p className="font-bold text-blue-900">No upfront payment required</p>
            <p className="mt-0.5">
              Your provider will review this request first. You will be notified to complete
              payment only after the provider accepts your booking.
            </p>
          </div>
        </div>

        {/* ================= ORDER SUMMARY CARD ================= */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start justify-between border-b border-slate-100 pb-5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                Service Request
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                {service?.title}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Provider: <span className="font-semibold text-slate-800">{service?.provider?.businessName || "Verified Provider"}</span>
              </p>
            </div>
            <span className="text-2xl font-black text-slate-900">
              ₹{service?.price}
            </span>
          </div>

          {/* Booking Attributes */}
          <div className="grid grid-cols-1 gap-4 py-5 border-b border-slate-100 sm:grid-cols-2 text-xs">
            <div className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <FiCalendar />
              </span>
              <div>
                <p className="font-semibold text-slate-900">Scheduled Date</p>
                <p className="text-slate-500">{scheduledDate}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <FiClock />
              </span>
              <div>
                <p className="font-semibold text-slate-900">Time Slot & Duration</p>
                <p className="text-slate-500">
                  {scheduledStartTime} - {scheduledEndTime} ({service?.duration} mins)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 sm:col-span-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <FiMapPin />
              </span>
              <div>
                <p className="font-semibold text-slate-900">Service Location</p>
                <p className="text-slate-500">
                  {address?.addressLine || address?.street}, {address?.city}, {address?.state} - {address?.pincode || address?.postalCode}
                </p>
              </div>
            </div>

            {notes && (
              <div className="sm:col-span-2 rounded-xl bg-slate-50 p-3 text-slate-600">
                <span className="font-semibold text-slate-800">Special Instructions:</span>{" "}
                {notes}
              </div>
            )}
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-2 py-5 border-b border-slate-100 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Base Service Fee</span>
              <span>₹{service?.price}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Platform & Convenience Fee</span>
              <span className="text-emerald-600 font-semibold">Free</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Taxes & Compliance</span>
              <span>Included</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-extrabold text-slate-900">
              <span>Estimated Total</span>
              <span className="text-indigo-600">₹{service?.price}</span>
            </div>
          </div>

          {/* Trust Guarantees */}
          <div className="mt-5 flex items-center justify-around gap-2 rounded-2xl bg-indigo-50/50 p-3 text-center text-[11px] font-medium text-slate-600">
            <span className="flex items-center gap-1.5">
              <FiShield className="text-indigo-600" />
              Pay Only After Acceptance
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <FiCheckCircle className="text-emerald-600" />
              Hassle-Free Refund Policy
            </span>
          </div>

          {/* Request Service Button */}
          <div className="mt-6">
            <button
              type="button"
              onClick={handleSendRequest}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
            >
              <FiSend />
              {submitting ? "Sending Request..." : "Request Service"}
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              No payment now. Your provider will review and accept/decline this request.
            </p>
          </div>
        </div>
      </div>
    </UserPageShell>
  );
}
