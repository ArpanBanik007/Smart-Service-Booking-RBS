import { useState, useEffect } from "react";
import api from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import ProviderPageShell from "./ProviderPageShell.jsx";
import {
  FiDollarSign,
  FiCalendar,
  FiCheckCircle,
  FiTrendingUp,
  FiCreditCard,
  FiAlertCircle,
} from "react-icons/fi";

export default function ProviderEarningsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchEarnings = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api.get(`${ENDPOINTS.BOOKINGS.PROVIDER_LIST}?limit=50`);
      setBookings(res.data?.data?.bookings || []);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load earnings records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const completed = bookings.filter((b) => b.bookingStatus === "COMPLETED");
  const totalEarned = completed.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const pendingAmount = bookings
    .filter((b) => b.paymentStatus === "PAID" && b.bookingStatus !== "COMPLETED")
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  return (
    <ProviderPageShell
      title="Earnings & Payout Ledger"
      subtitle="Financial performance, completed job reconciliations, and payout distributions"
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
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Realized Earnings
              </span>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                ₹{totalEarned.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                From {completed.length} completed job appointments
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                In Escrow / In Progress
              </span>
              <p className="mt-3 text-3xl font-extrabold text-indigo-600">
                ₹{pendingAmount.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Active jobs booked by customers
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Avg. Ticket Size
              </span>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                ₹
                {completed.length > 0
                  ? Math.round(totalEarned / completed.length).toLocaleString("en-IN")
                  : "0"}
              </p>
              <p className="mt-1 text-xs text-slate-500">Average billing per appointment</p>
            </div>
          </div>

          {/* Earnings Breakdown Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900">
              Completed Job Transactions
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              List of all completed appointments and credited payouts.
            </p>

            {completed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FiDollarSign className="text-4xl text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-700">No earnings recorded yet</p>
                <p className="text-xs text-slate-400">Complete service appointments to start generating payouts.</p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/60 font-semibold text-slate-600">
                      <th className="px-4 py-3">Order / Service</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Completed On</th>
                      <th className="px-4 py-3">Payment Mode</th>
                      <th className="px-4 py-3 text-right">Credited Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {completed.map((b) => (
                      <tr key={b._id} className="transition hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {b.service?.title}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {b.user?.fullName || "Customer"}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(b.updatedAt || b.scheduledDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                            <FiCreditCard /> Razorpay
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                          ₹{b.totalAmount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </ProviderPageShell>
  );
}
