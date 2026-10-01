import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import AdminPageShell from "./AdminPageShell.jsx";
import {
  FiArrowLeft,
  FiCheck,
  FiX,
  FiFileText,
  FiExternalLink,
  FiShield,
  FiUser,
  FiMapPin,
  FiCalendar,
  FiAlertCircle,
} from "react-icons/fi";

export default function AdminVerificationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchDetails = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api.get(ENDPOINTS.PROVIDER_VERIFICATION.GET_BY_ID(id));
      setVerification(res.data?.data || null);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load verification details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleApprove = async () => {
    setActionLoading(true);
    setErrorMsg("");
    try {
      await api.patch(ENDPOINTS.ADMIN.APPROVE_VERIFICATION(id));
      setSuccessMsg("Verification approved successfully! Partner account is now active.");
      fetchDetails();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to approve verification.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }
    setActionLoading(true);
    try {
      await api.patch(ENDPOINTS.ADMIN.REJECT_VERIFICATION(id), {
        rejectionReason: rejectReason.trim(),
      });
      setSuccessMsg("Verification rejected.");
      setRejectModalOpen(false);
      fetchDetails();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject verification.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminPageShell
      title="Application Inspection"
      subtitle={`Reviewing verification dossier #${id}`}
    >
      <div className="mb-6">
        <Link
          to="/admin/verifications"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <FiArrowLeft /> Back to Verifications Queue
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
      ) : !verification ? (
        <div className="py-12 text-center text-sm text-slate-500">
          Verification record not found.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900">
                  {verification.provider?.businessName || "Provider Application"}
                </h2>
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase ${
                    verification.status === "APPROVED"
                      ? "bg-emerald-100 text-emerald-700"
                      : verification.status === "REJECTED"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {verification.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Submitted on {new Date(verification.submittedAt || verification.createdAt).toLocaleString()}
              </p>
            </div>

            {verification.status === "PENDING" && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setRejectModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  <FiX /> Reject Application
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleApprove}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                >
                  <FiCheck /> Approve Partner
                </button>
              </div>
            )}
          </div>

          {/* Business & Applicant Info */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FiShield className="text-indigo-600" /> Business Profile
              </h3>
              <div className="mt-4 space-y-2 text-xs">
                <div>
                  <span className="text-slate-400">Business Name:</span>
                  <p className="font-semibold text-slate-800">
                    {verification.provider?.businessName}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Description:</span>
                  <p className="leading-relaxed text-slate-700">
                    {verification.provider?.description || "No description provided."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FiUser className="text-indigo-600" /> Applicant Details
              </h3>
              <div className="mt-4 space-y-2 text-xs">
                <div>
                  <span className="text-slate-400">Contact Person:</span>
                  <p className="font-semibold text-slate-800">
                    {verification.provider?.user?.fullName || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Email:</span>
                  <p className="font-semibold text-slate-800">
                    {verification.provider?.user?.email || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Phone:</span>
                  <p className="font-semibold text-slate-800">
                    {verification.provider?.user?.phone || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Uploaded Documents */}
          <div className="rounded-2xl border border-slate-200 p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <FiFileText className="text-indigo-600" /> Submitted Documents (
              {verification.documents?.length || 0})
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Click on any document to open full resolution certificate or ID proof.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {verification.documents?.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-indigo-300 hover:bg-indigo-50/20"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                        {doc.type}
                      </span>
                      <FiFileText className="text-slate-400" />
                    </div>
                    <p className="mt-2 truncate font-semibold text-slate-800 text-xs">
                      {doc.originalName || `Document #${idx + 1}`}
                    </p>
                    {doc.uploadedAt && (
                      <p className="text-[10px] text-slate-400">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    View Document <FiExternalLink />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">
              Reject Verification Application
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Please specify reason for rejection:
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Identity document unreadable. Please upload higher quality scan."
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
                disabled={actionLoading}
                onClick={handleReject}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
