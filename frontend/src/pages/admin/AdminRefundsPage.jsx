import { useState, useEffect } from "react";
import api from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import AdminPageShell from "./AdminPageShell.jsx";
import {
  FiRefreshCw,
  FiCheck,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
} from "react-icons/fi";

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchRefunds = async (page = 1) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api.get(`${ENDPOINTS.ADMIN.REFUNDS}?page=${page}&limit=10`);
      setRefunds(res.data?.data?.refunds || []);
      if (res.data?.data?.pagination) {
        setPagination({
          page: res.data.data.pagination.page || 1,
          limit: 10,
          total: res.data.data.pagination.totalRefunds || 0,
          pages: res.data.data.pagination.totalPages || 1,
        });
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load refund requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds(1);
  }, []);

  const handleProcessRefund = async (refundId) => {
    if (!window.confirm("Are you sure you want to process this refund payout via Razorpay?")) return;
    setActionId(refundId);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await api.patch(ENDPOINTS.ADMIN.PROCESS_REFUND(refundId));
      setSuccessMsg("Refund processed successfully via Razorpay API!");
      fetchRefunds();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to process refund.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <AdminPageShell
      title="Refund Claims & Disputes"
      subtitle="Review customer reimbursement requests and initiate direct Razorpay refunds"
    >
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
      ) : refunds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FiRefreshCw className="text-4xl text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">No pending refund requests</p>
          <p className="text-xs text-slate-400">All customer refund requests have been resolved.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 font-semibold text-slate-600">
                <th className="px-4 py-3">Claim / Booking</th>
                <th className="px-4 py-3">Requested By</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Requested On</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {refunds.map((r) => {
                const canProcess = r.status === "REQUESTED";
                return (
                  <tr key={r._id} className="transition hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-mono text-[10px] text-slate-400">
                        #{r._id.slice(-8).toUpperCase()}
                      </p>
                      <p className="font-semibold text-slate-800">
                        Order #{r.booking?.bookingNumber || r.booking?._id?.slice(-8) || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{r.requestedBy?.fullName || "—"}</p>
                      <p className="text-[11px] text-slate-400">{r.requestedBy?.email || "—"}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      ₹{r.payment?.amount || r.amount || "—"}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-slate-600">
                      {r.reason || "Customer requested refund."}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          r.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-700"
                            : r.status === "REJECTED"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canProcess ? (
                        <button
                          type="button"
                          disabled={actionId === r._id}
                          onClick={() => handleProcessRefund(r._id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                        >
                          <FiCheck /> {actionId === r._id ? "Processing..." : "Process Payout"}
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400">
                          Resolved
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
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
              onClick={() => fetchRefunds(pagination.page - 1)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <FiChevronLeft /> Prev
            </button>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchRefunds(pagination.page + 1)}
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
