import { useState, useEffect } from "react";
import api from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import AdminPageShell from "./AdminPageShell.jsx";
import {
  FiCreditCard,
  FiFilter,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiCheckCircle,
} from "react-icons/fi";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchPayments = async (page = 1) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (statusFilter) params.set("status", statusFilter);

      const res = await api.get(`${ENDPOINTS.ADMIN.PAYMENTS}?${params.toString()}`);
      setPayments(res.data?.data?.payments || []);
      if (res.data?.data?.pagination) {
        setPagination({
          page: res.data.data.pagination.page || 1,
          limit: 10,
          total: res.data.data.pagination.totalPayments || 0,
          pages: res.data.data.pagination.totalPages || 1,
        });
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load payment transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(1);
  }, [statusFilter]);

  return (
    <AdminPageShell
      title="Payments & Razorpay Transactions"
      subtitle="Complete ledger of captured gateway checkouts, order bindings, and transaction states"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500"
          >
            <option value="">All Payment Statuses</option>
            <option value="PAID">Paid / Captured</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
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
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FiCreditCard className="text-4xl text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">No payment transactions found</p>
          <p className="text-xs text-slate-400">Transactions will appear as customers pay via Razorpay.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 font-semibold text-slate-600">
                <th className="px-4 py-3">Transaction / Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Processed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p._id} className="transition hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-mono text-[10px] text-slate-400">
                      ID: {p.razorpayPaymentId || p._id.slice(-8).toUpperCase()}
                    </p>
                    <p className="font-semibold text-slate-800">
                      Order #{p.booking?.bookingNumber || p.booking?._id?.slice(-8) || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{p.user?.fullName || "—"}</p>
                    <p className="text-[11px] text-slate-400">{p.user?.email || "—"}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {p.provider?.businessName || "—"}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    ₹{p.amount}
                  </td>
                  <td className="px-4 py-3 font-medium uppercase text-slate-600">
                    {p.method || "Razorpay"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        p.status === "PAID"
                          ? "bg-emerald-100 text-emerald-700"
                          : p.status === "REFUNDED"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    {new Date(p.createdAt).toLocaleDateString()}{" "}
                    {new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
              onClick={() => fetchPayments(pagination.page - 1)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <FiChevronLeft /> Prev
            </button>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchPayments(pagination.page + 1)}
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
