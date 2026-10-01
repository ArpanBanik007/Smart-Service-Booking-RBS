import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import AdminPageShell from "./AdminPageShell.jsx";
import {
  FiBriefcase,
  FiSearch,
  FiStar,
  FiUserX,
  FiUserCheck,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiMapPin,
} from "react-icons/fi";

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchProviders = async (page = 1) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);

      const res = await api.get(`${ENDPOINTS.ADMIN.PROVIDERS}?${params.toString()}`);
      setProviders(res.data?.data?.providers || []);
      if (res.data?.data?.pagination) {
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load service partners.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProviders(1);
  };

  const handleToggleSuspend = async (providerId, currentStatus) => {
    setActionLoadingId(providerId);
    try {
      const isSuspended = currentStatus === "suspended";
      if (isSuspended) {
        await api.patch(ENDPOINTS.ADMIN.ACTIVATE_PROVIDER(providerId));
      } else {
        await api.patch(ENDPOINTS.ADMIN.SUSPEND_PROVIDER(providerId));
      }
      setProviders((prev) =>
        prev.map((p) =>
          p._id === providerId
            ? { ...p, status: isSuspended ? "active" : "suspended" }
            : p
        )
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update provider status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApproveProvider = async (providerId) => {
    setActionLoadingId(providerId);
    try {
      await api.patch(ENDPOINTS.ADMIN.APPROVE_PROVIDER(providerId));
      setProviders((prev) =>
        prev.map((p) =>
          p._id === providerId
            ? { ...p, verificationStatus: "approved", status: "active" }
            : p
        )
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve provider.");
    } finally {
      setActionLoadingId(null);
    }
  };


  return (
    <AdminPageShell
      title="Service Providers"
      subtitle="Directory of registered businesses, KYC verifications, service radius, and status controls"
    >
      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-sm">
          <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search business name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
        </form>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500"
          >
            <option value="">All Partner Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          <FiAlertCircle className="text-base" /> {errorMsg}
        </div>
      )}

      {/* Providers Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FiBriefcase className="text-4xl text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">No service providers found</p>
          <p className="text-xs text-slate-400">Try changing your search query or filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 font-semibold text-slate-600">
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Owner Contact</th>
                <th className="px-4 py-3">Radius</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">KYC Status</th>
                <th className="px-4 py-3">Account Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {providers.map((p) => {
                const isSuspended = p.status === "suspended";
                const vStatus = p.verificationStatus || "pending";
                return (
                  <tr key={p._id} className="transition hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-bold text-slate-900">{p.businessName}</p>
                        <p className="line-clamp-1 max-w-xs text-[11px] text-slate-500">
                          {p.description || "No description"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{p.user?.fullName || "—"}</p>
                      <p className="text-[11px] text-slate-500">{p.user?.email || "—"}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      <span className="flex items-center gap-1">
                        <FiMapPin className="text-slate-400" />
                        {p.serviceRadiusKm || 10} km
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 font-bold text-amber-600">
                        <FiStar className="fill-amber-400 text-amber-400" />
                        {p.rating?.average?.toFixed(1) || "5.0"}
                        <span className="font-normal text-slate-400">
                          ({p.rating?.count || 0})
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          vStatus === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : vStatus === "rejected"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {vStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isSuspended ? (
                        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                          SUSPENDED
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/providers/${p._id}`}
                          target="_blank"
                          className="rounded-lg border border-slate-200 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Public Profile
                        </Link>
                        {vStatus !== "approved" && (
                          <button
                            type="button"
                            disabled={actionLoadingId === p._id}
                            onClick={() => handleApproveProvider(p._id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <FiCheckCircle /> Approve
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={actionLoadingId === p._id}
                          onClick={() => handleToggleSuspend(p._id, p.status)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition ${
                            isSuspended
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                          }`}
                        >
                          {isSuspended ? (
                            <>
                              <FiUserCheck /> Activate
                            </>
                          ) : (
                            <>
                              <FiUserX /> Suspend
                            </>
                          )}
                        </button>
                      </div>
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
              onClick={() => fetchProviders(pagination.page - 1)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <FiChevronLeft /> Prev
            </button>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchProviders(pagination.page + 1)}
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
