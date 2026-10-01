import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiChevronRight,
  FiAlertCircle,
  FiCreditCard,
} from "react-icons/fi";
import { useSelector } from "react-redux";
import UserPageShell from "./UserPageShell.jsx";
import apiClient from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import { loadRazorpayScript } from "../../utils/razorpay.js";
import { useSocket } from "../../context/SocketContext.jsx";

const FILTER_TABS = ["ALL", "PENDING", "ACCEPTED", "ON_THE_WAY", "COMPLETED", "CANCELLED"];

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const getSocketFn = useSocket();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [payingBookingId, setPayingBookingId] = useState(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get(ENDPOINTS.BOOKINGS.MY_BOOKINGS, {
        params: { limit: 50 }, // get up to 50 bookings
      });
      // API returns: { data: { bookings: [...], pagination: {...} } }
      const raw = res.data?.data;
      const list = raw?.bookings ?? raw ?? [];
      setBookings(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Socket.IO: Real-time booking updates
  useEffect(() => {
    const socket = getSocketFn ? getSocketFn() : null;
    if (!socket) return;

    const handleBookingUpdate = (data) => {
      // Optimistically update the matching booking in local state
      setBookings((prev) =>
        prev.map((b) => {
          if (b._id === data.bookingId) {
            return {
              ...b,
              bookingStatus: data.status || b.bookingStatus,
              paymentStatus: data.paymentStatus || b.paymentStatus,
            };
          }
          return b;
        })
      );

      // Also do a full refetch to get complete server data
      fetchBookings();
    };

    socket.on("booking_update", handleBookingUpdate);

    return () => {
      socket.off("booking_update", handleBookingUpdate);
    };
  }, [getSocketFn, fetchBookings]);

  // Handle Pay Now directly from card
  const handlePayNow = async (booking) => {
    setPayingBookingId(booking._id);
    try {
      const orderRes = await apiClient.post(ENDPOINTS.PAYMENTS.CREATE_ORDER, {
        bookingId: booking._id,
      });
      const orderData = orderRes.data?.data || orderRes.data;

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) throw new Error("Razorpay SDK failed to load.");

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Near It...",
        description: `Payment for ${booking.service?.title || "Home Service"}`,
        order_id: orderData.razorpayOrderId,
        prefill: {
          name: user?.fullName || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: { color: "#4f46e5" },
        handler: async function (response) {
          try {
            await apiClient.post(ENDPOINTS.PAYMENTS.VERIFY, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            fetchBookings(); // refresh list
          } catch (verifyErr) {
            console.error("Payment verification failed:", verifyErr);
            alert(verifyErr.response?.data?.message || "Payment verification failed.");
          } finally {
            setPayingBookingId(null);
          }
        },
        modal: {
          ondismiss: function () {
            setPayingBookingId(null);
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();
    } catch (err) {
      console.error("Payment error:", err);
      alert(err.response?.data?.message || err.message || "Failed to create payment.");
      setPayingBookingId(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "ALL") return true;
    return b.bookingStatus === activeTab;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "COMPLETED":
        return "bg-emerald-100 text-emerald-800";
      case "CANCELLED":
      case "REJECTED":
        return "bg-rose-100 text-rose-800";
      case "ON_THE_WAY":
      case "STARTED":
        return "bg-amber-100 text-amber-800 animate-pulse";
      case "ACCEPTED":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-indigo-100 text-indigo-800";
    }
  };

  const getStatusLabel = (booking) => {
    const status = booking.bookingStatus;
    if (status === "PENDING") return "Pending Approval";
    if (status === "ACCEPTED") return "Accepted";
    if (status === "REJECTED") return "Declined";
    return status?.replace(/_/g, " ");
  };

  const getPaymentLabel = (booking) => {
    if (booking.paymentStatus === "PAID") return { label: "Paid", color: "text-emerald-600" };
    if (booking.bookingStatus === "ACCEPTED") return { label: "Payment Pending", color: "text-amber-600" };
    if (booking.bookingStatus === "PENDING") return { label: "Awaiting Acceptance", color: "text-slate-500" };
    if (booking.bookingStatus === "REJECTED" || booking.bookingStatus === "CANCELLED") return { label: "N/A", color: "text-slate-400" };
    return { label: booking.paymentStatus || "—", color: "text-slate-500" };
  };

  return (
    <UserPageShell
      title="My Service Appointments"
      subtitle="Track active bookings, review appointment history, and view receipts"
    >
      <div className="flex flex-col gap-6">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === tab
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">
            <FiAlertCircle />
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100 p-5" />
            ))}
          </div>
        )}

        {!loading && filteredBookings.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">
              <FiCalendar />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">No bookings found</h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {activeTab === "ALL"
                ? "You haven't scheduled any services yet. Discover verified local partners today."
                : `No bookings found with status '${activeTab}'.`}
            </p>
            <Link
              to="/providers"
              className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Browse Nearby Services
            </Link>
          </div>
        )}

        {!loading && filteredBookings.length > 0 && (
          <div className="space-y-4">
            {filteredBookings.map((b) => {
              const payInfo = getPaymentLabel(b);
              const showPayButton = b.bookingStatus === "ACCEPTED" && b.paymentStatus !== "PAID";
              const isPaying = payingBookingId === b._id;

              return (
                <div
                  key={b._id}
                  className="group flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-indigo-300 hover:shadow-md sm:flex-row sm:items-center"
                >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${getStatusBadge(
                        b.bookingStatus
                      )}`}
                    >
                      {getStatusLabel(b)}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      #{b.bookingNumber || b._id?.slice(-8)}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition">
                    {b.service?.title || "Service Appointment"}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">
                      {b.provider?.businessName || "Service Partner"}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <FiCalendar className="text-indigo-600" />
                      {b.scheduledDate ? new Date(b.scheduledDate).toLocaleDateString() : ""}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <FiClock className="text-indigo-600" />
                      {b.scheduledStartTime}
                    </span>
                  </div>

                  {b.address && (
                    <p className="flex items-center gap-1 text-xs text-slate-400">
                      <FiMapPin className="text-slate-400 shrink-0" />
                      {b.address.addressLine || b.address.street}, {b.address.city}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-100 pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-400 block">Amount</span>
                    <span className="text-lg font-black text-slate-900">₹{b.totalAmount}</span>
                    <span className={`block text-[10px] font-bold uppercase ${payInfo.color}`}>
                      {payInfo.label}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {showPayButton && (
                      <button
                        type="button"
                        disabled={isPaying}
                        onClick={() => handlePayNow(b)}
                        className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <FiCreditCard />
                        {isPaying ? "Processing..." : "Pay Now"}
                      </button>
                    )}

                    <Link
                      to={`/booking/status/${b._id}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-600 hover:text-white"
                    >
                      View Timeline
                      <FiChevronRight />
                    </Link>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </UserPageShell>
  );
}
