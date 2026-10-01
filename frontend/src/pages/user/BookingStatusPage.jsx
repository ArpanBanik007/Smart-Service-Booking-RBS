import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiUser,
  FiXCircle,
  FiStar,
  FiAlertCircle,
  FiArrowLeft,
  FiNavigation,
  FiCreditCard,
  FiInfo,
} from "react-icons/fi";
import { useSelector } from "react-redux";
import UserPageShell from "./UserPageShell.jsx";
import ServiceMap from "../../components/map/ServiceMap.jsx";
import apiClient from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import { loadRazorpayScript } from "../../utils/razorpay.js";
import { useSocket } from "../../context/SocketContext.jsx";

const TIMELINE_STEPS = [
  { key: "PENDING", label: "Request Placed", desc: "Awaiting provider confirmation" },
  { key: "ACCEPTED", label: "Accepted", desc: "Provider scheduled the job" },
  { key: "ON_THE_WAY", label: "On The Way", desc: "Provider is en route to location" },
  { key: "STARTED", label: "In Progress", desc: "Service is actively being performed" },
  { key: "COMPLETED", label: "Completed", desc: "Job successfully concluded" },
];

export default function BookingStatusPage() {
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);
  const getSocketFn = useSocket();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Payment state
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Cancel Booking Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.BOOKINGS.GET_BY_ID(id));
      const data = res.data?.data || res.data;
      setBooking(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load booking details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchBooking();
    }
  }, [id, fetchBooking]);

  // Socket.IO: Real-time booking status updates
  useEffect(() => {
    const socket = getSocketFn ? getSocketFn() : null;
    if (!socket) return;

    const handleBookingUpdate = (data) => {
      // Only react to updates for THIS booking
      if (data.bookingId !== id) return;

      // Re-fetch the full booking from server (source of truth)
      fetchBooking();
    };

    socket.on("booking_update", handleBookingUpdate);

    return () => {
      socket.off("booking_update", handleBookingUpdate);
    };
  }, [getSocketFn, id, fetchBooking]);

  // Handle Pay Now (post-acceptance Razorpay)
  const handlePayNow = async () => {
    setPaying(true);
    setPaymentError("");

    try {
      // 1. Create Razorpay order
      const orderRes = await apiClient.post(ENDPOINTS.PAYMENTS.CREATE_ORDER, {
        bookingId: id,
      });
      const orderData = orderRes.data?.data || orderRes.data;

      // 2. Load Razorpay SDK
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error("Razorpay SDK failed to load. Check your internet connection.");
      }

      // 3. Open Razorpay checkout
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Near It...",
        description: `Payment for ${booking?.service?.title || "Home Service"}`,
        order_id: orderData.razorpayOrderId,
        prefill: {
          name: user?.fullName || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: { color: "#4f46e5" },
        handler: async function (response) {
          try {
            // 4. Verify payment
            await apiClient.post(ENDPOINTS.PAYMENTS.VERIFY, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            setPaymentSuccess(true);
            fetchBooking(); // refresh booking data
          } catch (verifyErr) {
            console.error("Payment verification failed:", verifyErr);
            setPaymentError(
              verifyErr.response?.data?.message ||
                "Payment verification failed. Please contact support."
            );
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: function () {
            setPaying(false);
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();
    } catch (err) {
      console.error("Payment error:", err);
      setPaymentError(
        err.response?.data?.message ||
          err.message ||
          "Failed to create payment order."
      );
      setPaying(false);
    }
  };

  // Handle Cancel Booking
  const handleCancelBooking = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;

    setCancelling(true);
    try {
      await apiClient.patch(ENDPOINTS.BOOKINGS.CANCEL(id), {
        cancellationReason: cancelReason.trim(),
      });
      setShowCancelModal(false);
      fetchBooking();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel booking.");
    } finally {
      setCancelling(false);
    }
  };

  // Handle Submit Review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);

    try {
      await apiClient.post(ENDPOINTS.REVIEWS.CREATE, {
        bookingId: id,
        rating,
        comment: comment.trim(),
      });
      setReviewSuccess(true);
      setTimeout(() => setShowReviewModal(false), 1500);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <UserPageShell title="Booking Status" subtitle="Loading tracking details...">
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </UserPageShell>
    );
  }

  if (error || !booking) {
    return (
      <UserPageShell title="Booking Status" subtitle="Order not found">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <FiAlertCircle className="mx-auto text-3xl text-rose-500" />
          <h3 className="mt-2 text-base font-bold text-rose-800">{error || "Booking not found"}</h3>
          <Link
            to="/bookings"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
          >
            <FiArrowLeft />
            My Bookings List
          </Link>
        </div>
      </UserPageShell>
    );
  }

  const currentStatus = booking.bookingStatus || "PENDING";
  const isCancelled = currentStatus === "CANCELLED" || currentStatus === "REJECTED";
  const isCompleted = currentStatus === "COMPLETED";
  const isAccepted = currentStatus === "ACCEPTED";
  const isPending = currentStatus === "PENDING";
  const isPaid = booking.paymentStatus === "PAID";

  // Calculate current step index for timeline
  const currentStepIndex = TIMELINE_STEPS.findIndex((s) => s.key === currentStatus);

  // Address Coordinates
  const addressCoords = booking.address?.coordinates?.coordinates;
  const hasAddressCoords = Array.isArray(addressCoords) && addressCoords.length === 2;

  return (
    <UserPageShell
      title={`Order #${booking.bookingNumber || booking._id?.slice(-8)}`}
      subtitle={`Scheduled for ${booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString() : ""} at ${booking.scheduledStartTime}`}
    >
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            to="/bookings"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <FiArrowLeft />
            Back to all bookings
          </Link>

          <span
            className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${
              isCompleted
                ? "bg-emerald-100 text-emerald-800"
                : isCancelled
                ? "bg-rose-100 text-rose-800"
                : isAccepted
                ? "bg-blue-100 text-blue-800"
                : "bg-indigo-100 text-indigo-800"
            }`}
          >
            {currentStatus.replace(/_/g, " ")}
          </span>
        </div>

        {/* ===== PENDING APPROVAL NOTICE ===== */}
        {isPending && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <FiClock className="mt-0.5 shrink-0 text-2xl text-amber-600 animate-pulse" />
            <div>
              <h3 className="font-bold text-amber-900">Waiting for Provider Approval</h3>
              <p className="text-xs text-amber-700 mt-1">
                Your service request has been sent to the provider. You will be notified once they accept or decline.
                Payment is not required until the provider accepts your booking.
              </p>
            </div>
          </div>
        )}

        {/* ===== ACCEPTED — PAY NOW BANNER ===== */}
        {isAccepted && !isPaid && !paymentSuccess && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <FiCheckCircle className="mt-0.5 shrink-0 text-2xl text-emerald-600" />
              <div className="flex-1">
                <h3 className="font-bold text-emerald-900">Provider Accepted Your Request!</h3>
                <p className="text-xs text-emerald-700 mt-1">
                  Great news! Your service provider has confirmed availability and accepted your booking. 
                  Please complete payment to reserve your time slot.
                </p>
              </div>
            </div>

            {paymentError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-xs text-rose-700">
                <FiAlertCircle /> {paymentError}
              </div>
            )}

            <button
              type="button"
              onClick={handlePayNow}
              disabled={paying}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
            >
              <FiCreditCard />
              {paying ? "Opening Secure Payment..." : `Pay Now ₹${booking.totalAmount}`}
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Payments are securely encrypted and verified through Razorpay.
            </p>
          </div>
        )}

        {/* ===== PAYMENT SUCCESS BANNER ===== */}
        {(isPaid || paymentSuccess) && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <FiCheckCircle className="text-2xl text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-emerald-900">Payment Completed Successfully</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Your booking is confirmed and paid. The provider will arrive at the scheduled time.
              </p>
            </div>
          </div>
        )}

        {/* ===== REJECTED BANNER ===== */}
        {currentStatus === "REJECTED" && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <FiXCircle className="mt-0.5 shrink-0 text-2xl text-rose-600" />
            <div>
              <h3 className="font-bold text-rose-900">Provider Declined Your Request</h3>
              <p className="text-xs text-rose-700 mt-1">
                {booking.cancellationReason || "The provider was unable to accommodate this booking. No payment has been charged."}
              </p>
              <Link
                to="/providers"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Find Another Provider
              </Link>
            </div>
          </div>
        )}

        {/* ================= STATUS TIMELINE ================= */}
        {!isCancelled && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-base mb-6">Service Order Timeline</h3>
            <div className="relative">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-5">
                {TIMELINE_STEPS.map((step, idx) => {
                  const isDone = idx < currentStepIndex || isCompleted;
                  const isCurrent = idx === currentStepIndex && !isCompleted;

                  return (
                    <div key={step.key} className="flex flex-col items-start sm:items-center sm:text-center">
                      <div className="flex items-center gap-2 sm:flex-col">
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold shadow-xs transition ${
                            isDone
                              ? "bg-indigo-600 text-white"
                              : isCurrent
                              ? "border-2 border-indigo-600 bg-indigo-50 text-indigo-700 animate-pulse"
                              : "border border-slate-200 bg-slate-50 text-slate-400"
                          }`}
                        >
                          {isDone ? <FiCheckCircle /> : idx + 1}
                        </span>
                        <div>
                          <p
                            className={`text-xs font-bold ${
                              isDone || isCurrent ? "text-slate-900" : "text-slate-400"
                            }`}
                          >
                            {step.label}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5 hidden sm:block">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Cancelled banner (for CANCELLED status, not REJECTED which is handled above) */}
        {currentStatus === "CANCELLED" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 text-xs text-rose-700">
              <FiXCircle className="text-2xl shrink-0" />
              <div>
                <p className="font-bold text-rose-900">Booking Cancelled</p>
                <p className="text-rose-600 mt-0.5">
                  {booking.cancellationReason || "This booking will not proceed."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= LIVE TRACKING MAP (IF ON THE WAY) ================= */}
        {currentStatus === "ON_THE_WAY" && hasAddressCoords && (
          <div className="rounded-3xl border border-indigo-200 bg-indigo-50/20 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FiNavigation className="text-indigo-600 text-lg animate-pulse" />
                <h3 className="font-bold text-slate-900 text-sm">Provider is On The Way</h3>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                Live Tracking Active
              </span>
            </div>

            <div className="h-64 overflow-hidden rounded-2xl border border-slate-200">
              <ServiceMap
                center={[addressCoords[1], addressCoords[0]]}
                zoom={14}
                userLocation={{
                  latitude: addressCoords[1],
                  longitude: addressCoords[0],
                }}
                interactive={true}
                className="h-full w-full"
              />
            </div>
            <p className="mt-2 text-center text-xs text-slate-500">
              Provider is traveling towards your destination address.
            </p>
          </div>
        )}

        {/* ================= BOOKING & PROVIDER DETAILS ================= */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Service & Price */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">
              Service Details
            </h4>
            <p className="text-base font-bold text-slate-900">{booking.service?.title}</p>
            <p className="text-xs text-slate-500 mt-1">{booking.service?.description}</p>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
              <span className="text-slate-500">Total Amount</span>
              <span className="font-extrabold text-slate-900 text-base">₹{booking.totalAmount}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
              <span>Payment Status</span>
              <span className={`font-bold uppercase ${
                isPaid ? "text-emerald-600" : isAccepted ? "text-amber-600" : "text-slate-500"
              }`}>
                {isPaid ? "PAID" : isPending ? "Awaiting Acceptance" : isAccepted ? "Payment Pending" : booking.paymentStatus}
              </span>
            </div>
          </div>

          {/* Provider Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">
              Service Partner
            </h4>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-lg font-bold text-indigo-700">
                {booking.provider?.businessName?.charAt(0) || <FiUser />}
              </div>
              <div>
                <p className="font-bold text-slate-900">{booking.provider?.businessName}</p>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <FiStar className="fill-amber-400 text-amber-500" />
                  <span>{booking.provider?.rating?.toFixed(1) || "5.0"} rating</span>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-600">
              <p className="flex items-center gap-1.5">
                <FiMapPin className="text-indigo-600 shrink-0" />
                {booking.address?.addressLine || booking.address?.street}, {booking.address?.city}
              </p>
            </div>
          </div>
        </div>

        {/* ================= ACTIONS: PAY / REVIEW / CANCEL ================= */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
          {/* Review Button if completed */}
          {isCompleted && (
            <button
              type="button"
              onClick={() => setShowReviewModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <FiStar />
              Leave a Review
            </button>
          )}

          {/* Cancel button if pending or accepted (unpaid) */}
          {(isPending || (isAccepted && !isPaid)) && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
            >
              <FiXCircle />
              Cancel Booking
            </button>
          )}
        </div>
      </div>

      {/* ================= CANCEL MODAL ================= */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Cancel Service Appointment</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to cancel? Any paid charges will be submitted for refund processing.
            </p>

            <form onSubmit={handleCancelBooking} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Cancellation
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please tell us why you need to cancel..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                >
                  {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= REVIEW MODAL ================= */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Rate & Review Service</h3>
            <p className="text-xs text-slate-500 mt-1">
              How was your service with {booking.provider?.businessName}?
            </p>

            {reviewSuccess ? (
              <div className="my-6 flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-700">
                <FiCheckCircle />
                Thank you! Your review has been submitted.
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`text-2xl transition ${
                          star <= rating ? "text-amber-400" : "text-slate-200"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Feedback
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {submittingReview ? "Submitting..." : "Submit Review"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </UserPageShell>
  );
}
