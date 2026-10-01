import { useState, useEffect } from "react";
import api from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import ProviderPageShell from "./ProviderPageShell.jsx";
import {
  FiLayers,
  FiPlus,
  FiSearch,
  FiEdit,
  FiTrash2,
  FiToggleLeft,
  FiToggleRight,
  FiCheck,
  FiAlertCircle,
  FiClock,
  FiX,
} from "react-icons/fi";

export default function ProviderServicesPage() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState(60);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [sRes, cRes] = await Promise.all([
        api.get(ENDPOINTS.SERVICES.MY_SERVICES),
        api.get(ENDPOINTS.CATEGORIES.LIST),
      ]);

      const sList = sRes.data?.data?.services || sRes.data?.data || [];
      setServices(Array.isArray(sList) ? sList : []);

      const cList = cRes.data?.data?.categories || cRes.data?.data || [];
      setCategories(Array.isArray(cList) ? cList : []);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load services.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setEditingService(null);
    setTitle("");
    setDescription("");
    setCategoryId(categories[0]?._id || "");
    setPrice("");
    setDuration(60);
    setModalOpen(true);
  };

  const handleOpenEdit = (srv) => {
    setEditingService(srv);
    setTitle(srv.title);
    setDescription(srv.description || "");
    setCategoryId(srv.category?._id || srv.category || "");
    setPrice(srv.price);
    setDuration(srv.duration || 60);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim() || !categoryId || !price) {
      alert("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    const payload = {
      title: title.trim(),
      description: description.trim(),
      category: categoryId,
      price: Number(price),
      duration: Number(duration),
    };

    try {
      if (editingService) {
        await api.patch(ENDPOINTS.SERVICES.UPDATE(editingService._id), payload);
        setSuccessMsg("Service updated successfully!");
      } else {
        await api.post(ENDPOINTS.SERVICES.CREATE, payload);
        setSuccessMsg("New service created and added to your catalog!");
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to save service.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (srvId) => {
    try {
      await api.patch(ENDPOINTS.SERVICES.TOGGLE_STATUS(srvId));
      setServices((prev) =>
        prev.map((s) => (s._id === srvId ? { ...s, isActive: !s.isActive } : s))
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to toggle status.");
    }
  };

  const handleDelete = async (srvId) => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;
    try {
      await api.delete(ENDPOINTS.SERVICES.DELETE(srvId));
      setServices((prev) => prev.filter((s) => s._id !== srvId));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete service.");
    }
  };

  const filtered = services.filter((s) =>
    s.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ProviderPageShell
      title="Offered Services Catalog"
      subtitle="Manage your bookable services, pricing rates, and turn availability on/off"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search your services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
        >
          <FiPlus className="text-sm" /> Add New Service
        </button>
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
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FiLayers className="text-4xl text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">No services yet</p>
          <p className="text-xs text-slate-400">Click &ldquo;Add New Service&rdquo; to build your service catalog.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((srv) => (
            <div
              key={srv._id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                    {srv.category?.name || "Service"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(srv._id)}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      srv.isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {srv.isActive ? <FiToggleRight className="text-sm" /> : <FiToggleLeft className="text-sm" />}
                    {srv.isActive ? "ACTIVE" : "OFF"}
                  </button>
                </div>

                <h3 className="mt-3 text-base font-bold text-slate-900">
                  {srv.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                  {srv.description || "No description provided."}
                </p>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-base font-extrabold text-slate-900">
                    ₹{srv.price}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <FiClock /> {srv.duration || 60} mins
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(srv)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <FiEdit /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(srv._id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <FiTrash2 /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Service Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingService ? "Edit Service" : "Add New Service"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Service Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Ceiling Fan Repair & Installation"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Category *
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="499"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Est. Duration (Mins)
                  </label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="60"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details of what's included, diagnostic steps, parts info..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingService ? "Update Service" : "Create Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProviderPageShell>
  );
}
