import { useState, useEffect } from "react";
import api from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import AdminPageShell from "./AdminPageShell.jsx";
import {
  FiStar,
  FiEye,
  FiEyeOff,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiMessageSquare,
} from "react-icons/fi";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchReviews = async (page = 1) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (visibilityFilter !== "") params.set("isVisible", visibilityFilter);

      const res = await api.get(`${ENDPOINTS.ADMIN.REVIEWS}?${params.toString()}`);
      setReviews(res.data?.data?.reviews || []);
      if (res.data?.data?.pagination) {
        setPagination({
          page: res.data.data.pagination.page || 1,
          limit: 10,
          total: res.data.data.pagination.totalReviews || 0,
          pages: res.data.data.pagination.totalPages || 1,
        });
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load customer reviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(1);
  }, [visibilityFilter]);

  const handleToggleVisibility = async (reviewId, isCurrentlyVisible) => {
    setActionId(reviewId);
    try {
      if (isCurrentlyVisible) {
        await api.patch(ENDPOINTS.ADMIN.HIDE_REVIEW(reviewId));
      } else {
        await api.patch(ENDPOINTS.ADMIN.SHOW_REVIEW(reviewId));
      }
      setReviews((prev) =>
        prev.map((r) =>
          r._id === reviewId ? { ...r, isVisible: !isCurrentlyVisible } : r
        )
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to toggle review visibility.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <AdminPageShell
      title="Customer Reviews Moderation"
      subtitle="Audit customer feedback, ratings, and moderate offensive or inappropriate content"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500"
          >
            <option value="">All Review States</option>
            <option value="true">Visible Only</option>
            <option value="false">Hidden / Moderated Only</option>
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
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FiMessageSquare className="text-4xl text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">No reviews found</p>
          <p className="text-xs text-slate-400">Customer reviews will appear once services are completed.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 font-semibold text-slate-600">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Partner / Order</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Comment / Feedback</th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reviews.map((r) => {
                const isVisible = r.isVisible !== false;
                return (
                  <tr key={r._id} className="transition hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {r.user?.fullName || "Verified Customer"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">
                        {r.provider?.businessName || "Service Partner"}
                      </p>
                      <p className="font-mono text-[10px] text-slate-400">
                        Booking #{r.booking?.bookingNumber || r.booking?._id?.slice(-8) || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 font-bold text-amber-500">
                        <FiStar className="fill-amber-400" />
                        {r.rating} / 5
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-sm truncate text-slate-700">
                      {r.comment || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          isVisible
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {isVisible ? "VISIBLE" : "HIDDEN"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={actionId === r._id}
                        onClick={() => handleToggleVisibility(r._id, isVisible)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition ${
                          isVisible
                            ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                            : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {isVisible ? (
                          <>
                            <FiEyeOff /> Hide
                          </>
                        ) : (
                          <>
                            <FiEye /> Unhide
                          </>
                        )}
                      </button>
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
              onClick={() => fetchReviews(pagination.page - 1)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <FiChevronLeft /> Prev
            </button>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchReviews(pagination.page + 1)}
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
