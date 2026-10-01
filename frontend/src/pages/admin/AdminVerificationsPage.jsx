import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import AdminPageShell from "./AdminPageShell.jsx";
import {
  FiCheckSquare,
  FiClock,
  FiFileText,
  FiEye,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiBriefcase,
} from "react-icons/fi";

export default function AdminVerificationsPage() {
  const [verifications, setVerifications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetId, setTargetId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchVerifications = async (page = 1) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api.get(`${ENDPOINTS.ADMIN.PENDING_VERIFICATIONS}?page=${page}&limit=10`);
      const list = res.data?.data?.verifications || [];
      setVerifications(list);
      if (res.data?.data?.pagination) {
        setPagination({
          page: res.data.data.pagination.page || res.data.data.pagination.currentPage || 1,
          limit: 10,
          total: res.data.data.pagination.totalVerifications || res.data.data.pagination.totalItems || list.length,
          pages: res.data.data.pagination.totalPages || 1,
        });
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load pending verifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications(1);
  }, []);

  const handleApprove = async (id) => {
    setActionId(id);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await api.patch(ENDPOINTS.ADMIN.APPROVE_VERIFICATION(id));
      setSuccessMsg("Provider verification approved successfully!");
      setVerifications((prev) => prev.filter((v) => v._id !== id));
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to approve verification.");
    } finally {
      setActionId(null);
    }
  };

  const handleOpenReject = (id) => {
    setTargetId(id);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }
    setActionId(targetId);
    try {
      await api.patch(ENDPOINTS.ADMIN.REJECT_VERIFICATION(targetId), {
        rejectionReason: rejectReason.trim(),
      });
      setSuccessMsg("Verification rejected.");
      setVerifications((prev) => prev.filter((v) => v._id !== targetId));
      setRejectModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject verification.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <AdminPageShell
      title="Partner Verification Queue"
      subtitle="Review pending business credentials, national ID cards, and trade licenses"
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
      ) : verifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-3xl text-emerald-600">
            <FiCheckSquare />
          </div>
          <p className="mt-3 text-base font-bold text-slate-900">All caught up!</p>
          <p className="text-xs text-slate-500">
            There are no pending partner verification applications at this time.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 font-semibold text-slate-600">
                <th className="px-4 py-3">Business / Partner</th>
                <th className="px-4 py-3">Applicant Contact</th>
                <th className="px-4 py-3">Documents</th>
                <th className="px-4 py-3">Submitted On</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {verifications.map((v) => (
                <tr key={v._id} className="transition hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-bold text-slate-900">
                        {v.provider?.businessName || "Service Partner"}
                      </p>
                      <p className="line-clamp-1 max-w-xs text-[11px] text-slate-500">
                        {v.provider?.description || "No description"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">
                      {v.provider?.user?.fullName || "—"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {v.provider?.user?.email || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700">
                      <FiFileText />
                      {v.documents?.length || 0} File(s)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(v.submittedAt || v.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                      PENDING
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/admin/verifications/${v._id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <FiEye /> Inspect
                      </Link>
                      <button
                        type="button"
                        disabled={actionId === v._id}
                        onClick={() => handleApprove(v._id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <FiCheck /> Approve
                      </button>
                      <button
                        type="button"
                        disabled={actionId === v._id}
                        onClick={() => handleOpenReject(v._id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        <FiX /> Reject
                      </button>
                    </div>
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
              onClick={() => fetchVerifications(pagination.page - 1)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <FiChevronLeft /> Prev
            </button>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchVerifications(pagination.page + 1)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Next <FiChevronRight />
            </button>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">
              Reject Verification Application
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Provide a clear reason so the provider knows what documents to re-upload.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Identity card is blurry. Trade license has expired."
              className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionId === targetId}
                onClick={handleConfirmReject}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {actionId === targetId ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
