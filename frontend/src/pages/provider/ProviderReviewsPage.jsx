import { useState, useEffect } from "react";
import api from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import ProviderPageShell from "./ProviderPageShell.jsx";
import {
  FiStar,
  FiMessageSquare,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiUser,
} from "react-icons/fi";

export default function ProviderReviewsPage() {
  const [providerProfile, setProviderProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchReviews = async (page = 1) => {
    setLoading(true);
    setErrorMsg("");
    try {
      let provId = providerProfile?._id;
      if (!provId) {
        const pRes = await api.get(ENDPOINTS.PROVIDER.ME);
        provId = pRes.data?.data?._id;
        setProviderProfile(pRes.data?.data);
      }

      if (!provId) {
        setLoading(false);
        return;
      }

      const res = await api.get(
        `${ENDPOINTS.REVIEWS.BY_PROVIDER(provId)}?page=${page}&limit=10`
      );
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
  }, []);

  return (
    <ProviderPageShell
      title="Customer Reviews & Ratings"
      subtitle="Client testimonials, performance ratings, and feedback on completed service jobs"
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
          {/* Rating Summary Card */}
          <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl font-extrabold text-amber-600 shadow-xs">
                {providerProfile?.rating?.average?.toFixed(1) || "5.0"}
              </div>
              <div>
                <div className="flex items-center gap-1 text-lg text-amber-500">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <FiStar key={s} className="fill-amber-400" />
                  ))}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Based on {pagination.total || providerProfile?.totalReviews || 0} customer reviews
                </p>
              </div>
            </div>
          </div>

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FiMessageSquare className="text-4xl text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-700">No reviews yet</p>
              <p className="text-xs text-slate-400">
                Customer reviews and ratings will appear here once you complete jobs.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div
                  key={r._id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-700">
                        {r.user?.fullName?.charAt(0) || <FiUser />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {r.user?.fullName || "Verified Customer"}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Job #{r.booking?.bookingNumber || r.booking?._id?.slice(-6) || "—"} •{" "}
                          {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-sm font-bold text-amber-500">
                      <FiStar className="fill-amber-400" />
                      {r.rating}.0
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-slate-700">
                    &ldquo;{r.comment || "Great service, highly satisfied!"}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500">
              <span>
                Page {pagination.page} of {pagination.pages}
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
        </div>
      )}
    </ProviderPageShell>
  );
}
