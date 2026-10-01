import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import ProviderPageShell from "./ProviderPageShell.jsx";
import {
  FiBriefcase,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiSave,
  FiExternalLink,
  FiCopy,
  FiCheck,
  FiStar,
  FiMapPin,
  FiLayers,
  FiCalendar,
} from "react-icons/fi";

export default function ProviderProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api.get(ENDPOINTS.PROVIDER.ME);
      const data = res.data?.data;
      if (data) {
        setProfile(data);
        setBusinessName(data.businessName || "");
        setDescription(data.description || "");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load provider profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!businessName.trim()) {
      alert("Business name is required.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await api.patch(ENDPOINTS.PROVIDER.UPDATE_PROFILE, {
        businessName: businessName.trim(),
        description: description.trim(),
      });
      setSuccessMsg("Business profile updated successfully!");
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (!profile?._id) return;
    const url = `${window.location.origin}/providers/${profile._id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const vStatus = profile?.verificationStatus || "pending";
  const ratingVal =
    typeof profile?.rating === "number"
      ? profile.rating
      : profile?.rating?.average || 5.0;
  const reviewCount =
    typeof profile?.totalReviews === "number"
      ? profile.totalReviews
      : profile?.rating?.count || 0;

  return (
    <ProviderPageShell
      title="Business Profile & Reputation"
      subtitle="Public business representation, dispatch parameters, customer reviews, and marketplace accreditation"
    >
      {errorMsg && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          <FiAlertCircle className="text-base" /> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-700">
          <FiCheckCircle className="text-base" /> {successMsg}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Status Card */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-50/50 via-white to-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-3xl font-extrabold text-white shadow-md">
                {profile?.businessName?.charAt(0) || "B"}
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {profile?.businessName || "My Business"}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-bold uppercase ${
                      vStatus === "approved"
                        ? "bg-emerald-100 text-emerald-700"
                        : vStatus === "rejected"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    KYC: {vStatus}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600">
                    Status: <strong className="capitalize">{profile?.status || "active"}</strong>
                  </span>
                </div>
              </div>
            </div>

            {profile?._id && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
                >
                  {copied ? (
                    <>
                      <FiCheck className="text-emerald-600" /> Copied!
                    </>
                  ) : (
                    <>
                      <FiCopy /> Copy Share Link
                    </>
                  )}
                </button>
                <Link
                  to={`/providers/${profile._id}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
                >
                  View Public Profile <FiExternalLink />
                </Link>
              </div>
            )}
          </div>

          {/* Performance Snapshot Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Rating Score</span>
              <div className="mt-1.5 flex items-center gap-1.5">
                <FiStar className="fill-amber-400 text-amber-500 text-lg" />
                <span className="text-xl font-extrabold text-slate-900">
                  {Number(ratingVal).toFixed(1)}
                </span>
                <span className="text-[11px] text-slate-400">/ 5.0</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Client Reviews</span>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-xl font-extrabold text-slate-900">{reviewCount}</span>
                <span className="text-[11px] text-slate-400">verified ratings</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Completed Jobs</span>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-xl font-extrabold text-slate-900">
                  {profile?.completedBookings || 0}
                </span>
                <span className="text-[11px] text-slate-400">orders served</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Dispatch Radius</span>
              <div className="mt-1.5 flex items-center gap-1.5">
                <FiMapPin className="text-indigo-600 text-lg" />
                <span className="text-xl font-extrabold text-slate-900">
                  {profile?.serviceRadiusKm || 10}
                </span>
                <span className="text-[11px] text-slate-400">km coverage</span>
              </div>
            </div>
          </div>

          {/* KYC Status Notice */}
          <div
            className={`rounded-2xl border p-5 text-xs ${
              vStatus === "approved"
                ? "border-emerald-200 bg-emerald-50/70 text-emerald-800"
                : vStatus === "rejected"
                ? "border-rose-200 bg-rose-50/70 text-rose-800"
                : "border-amber-200 bg-amber-50/70 text-amber-800"
            }`}
          >
            <div className="flex items-start gap-3">
              <FiShield className="text-lg mt-0.5 shrink-0" />
              <div>
                <strong className="block text-sm font-bold">
                  {vStatus === "approved"
                    ? "Accreditation Active & Approved"
                    : vStatus === "rejected"
                    ? "Verification Review Required"
                    : "Verification Under Review by Admin"}
                </strong>
                <p className="mt-1 leading-relaxed">
                  {vStatus === "approved"
                    ? "Your business profile is fully verified. Customers across your coverage area can browse your catalog, schedule appointments, and pay online securely."
                    : vStatus === "rejected"
                    ? "Your partner documentation was flagged. Please review your submitted licenses and contact support to resolve any missing information."
                    : "Your application is currently queued for administrator approval. Once approved, you will be able to create new services and receive incoming bookings."}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Management Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              to="/provider/services"
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-indigo-300 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <FiLayers className="text-lg" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">Manage Services</span>
                <span className="text-[11px] text-slate-400">Publish or edit prices & timings</span>
              </div>
            </Link>

            <Link
              to="/provider/service-area"
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-indigo-300 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <FiMapPin className="text-lg" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">Coverage & Map</span>
                <span className="text-[11px] text-slate-400">Configure GPS radius & dispatch zone</span>
              </div>
            </Link>

            <Link
              to="/provider/availability"
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-indigo-300 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <FiCalendar className="text-lg" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">Working Hours</span>
                <span className="text-[11px] text-slate-400">Set daily operating schedules</span>
              </div>
            </Link>
          </div>

          {/* Edit Profile Form */}
          <form onSubmit={handleSave} className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FiBriefcase className="text-indigo-600" /> Business Details
              </h3>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Business / Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Kolkata Pro AC & Appliances"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Business Bio / Description
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your qualifications, team experience, turnaround time, and warranties..."
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs leading-relaxed text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
              >
                <FiSave /> {saving ? "Saving..." : "Update Business Profile"}
              </button>
            </div>
          </form>
        </div>
      )}
    </ProviderPageShell>
  );
}
