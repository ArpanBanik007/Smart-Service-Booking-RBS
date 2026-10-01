import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import { fetchCurrentUser } from "../../store/slices/authSlice.js";
import UserPageShell from "./UserPageShell.jsx";
import ServiceMap from "../../components/map/ServiceMap.jsx";
import {
  FiBriefcase,
  FiFileText,
  FiUploadCloud,
  FiCheckCircle,
  FiClock,
  FiAlertTriangle,
  FiNavigation,
  FiArrowRight,
  FiTrash2,
  FiShield,
} from "react-icons/fi";

const DOC_TYPES = [
  { value: "identity", label: "Government ID / Passport / Driving License" },
  { value: "business_license", label: "Business / Trade License" },
  { value: "address_proof", label: "Address Proof (Utility Bill / Rent Agreement)" },
  { value: "certificate", label: "Trade / Skill Certificate" },
  { value: "other", label: "Other Supporting Document" },
];

export default function BecomeProviderPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(true);
  const [providerProfile, setProviderProfile] = useState(null);
  const [verification, setVerification] = useState(null);
  const [step, setStep] = useState(1); // 1 = Business Info, 2 = Documents

  // Step 1: Business Details state
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [serviceRadiusKm, setServiceRadiusKm] = useState(15);
  const [location, setLocation] = useState({ latitude: 22.5726, longitude: 88.3639 }); // Default Kolkata
  const [locating, setLocating] = useState(false);

  // Step 2: KYC Documents state
  const [selectedDocType, setSelectedDocType] = useState("identity");
  const [docFiles, setDocFiles] = useState([]); // [{ file, type, name }]
  const [notes, setNotes] = useState("");

  // Submission feedback states
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Check current provider & verification status
  const checkStatus = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const pRes = await api.get(ENDPOINTS.PROVIDER.ME);
      if (pRes.data?.data) {
        setProviderProfile(pRes.data.data);
      }
    } catch {
      // 404 means user hasn't registered as provider yet
      setProviderProfile(null);
    }

    try {
      const vRes = await api.get(ENDPOINTS.PROVIDER_VERIFICATION.ME);
      if (vRes.data?.data) {
        setVerification(vRes.data.data);
      }
    } catch {
      setVerification(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  // GPS Location detector
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        });
        setLocating(false);
      },
      () => {
        setErrorMsg("Could not detect location. Please click on the map to set your base.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Step 1 Submit: Create Provider profile
  const handleCreateProvider = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!businessName.trim()) {
      setErrorMsg("Business name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        businessName: businessName.trim(),
        description: description.trim(),
        serviceRadiusKm: Number(serviceRadiusKm),
        serviceArea: {
          type: "Point",
          coordinates: [Number(location.longitude), Number(location.latitude)],
        },
      };

      const res = await api.post(ENDPOINTS.PROVIDER.BECOME, payload);
      setProviderProfile(res.data?.data);
      setSuccessMsg("Business profile created! Please now upload your verification documents.");
      setStep(2);
      dispatch(fetchCurrentUser());
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to create provider profile.");
    } finally {
      setSubmitting(false);
    }
  };

  // Document file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newDocs = files.map((f) => ({
      file: f,
      type: selectedDocType,
      name: f.name,
    }));

    setDocFiles((prev) => [...prev, ...newDocs].slice(0, 10));
    e.target.value = "";
  };

  const removeDoc = (index) => {
    setDocFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Step 2 Submit: Upload KYC Verification
  const handleSubmitDocuments = async (isResubmit = false) => {
    setErrorMsg("");
    setSuccessMsg("");

    if (docFiles.length === 0) {
      setErrorMsg("Please select at least one document before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      docFiles.forEach((d) => {
        formData.append("documents", d.file);
        formData.append("documentTypes[]", d.type);
      });
      if (notes.trim()) {
        formData.append("notes", notes.trim());
      }

      const endpoint = isResubmit
        ? ENDPOINTS.PROVIDER_VERIFICATION.RESUBMIT
        : ENDPOINTS.PROVIDER_VERIFICATION.SUBMIT;

      const res = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setVerification(res.data?.data);
      setSuccessMsg("Verification submitted successfully! Our team will review it shortly.");
      setDocFiles([]);
      dispatch(fetchCurrentUser());
      checkStatus();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to submit verification documents.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <UserPageShell title="Become a Service Partner" subtitle="Join our verified provider network">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      </UserPageShell>
    );
  }

  // Case 1: Provider is already APPROVED
  const isApproved =
    user?.role === "provider" ||
    providerProfile?.verificationStatus === "approved" ||
    verification?.status === "APPROVED";

  if (isApproved) {
    return (
      <UserPageShell title="Service Partner Dashboard" subtitle="Manage your marketplace operations">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-3xl text-emerald-600 shadow-sm">
            <FiCheckCircle />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-900">
            You are a Verified Service Partner!
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
            Your partner profile is fully active. You can manage your service catalog, respond to incoming bookings, and track daily earnings.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/provider/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Go to Provider Dashboard <FiArrowRight />
            </Link>
            <Link
              to="/provider/services"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Manage Services
            </Link>
          </div>
        </div>
      </UserPageShell>
    );
  }

  // Case 2: Verification is PENDING
  const isPending =
    verification?.status === "PENDING" ||
    verification?.status === "IN_REVIEW" ||
    providerProfile?.verificationStatus === "pending";

  if (isPending) {
    return (
      <UserPageShell title="Partner Verification Status" subtitle="Your application is under review">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl text-amber-600 shadow-sm">
            <FiClock />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Verification Under Review
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            We have received your verification documents. Our compliance team verifies provider credentials within 24 to 48 hours.
          </p>

          <div className="mx-auto mt-6 max-w-md rounded-xl border border-amber-200 bg-white p-4 text-left shadow-xs">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Application Details
            </h3>
            <div className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Business Name:</span>
                <span className="font-semibold text-slate-800">
                  {providerProfile?.businessName || "Pending Setup"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                  PENDING REVIEW
                </span>
              </div>
              {verification?.submittedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Submitted:</span>
                  <span className="text-slate-700">
                    {new Date(verification.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={checkStatus}
            className="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Refresh Status
          </button>
        </div>
      </UserPageShell>
    );
  }

  // Case 3: Rejected & Allows Resubmission
  const isRejected =
    verification?.status === "REJECTED" ||
    providerProfile?.verificationStatus === "rejected";

  return (
    <UserPageShell
      title="Become a Service Partner"
      subtitle="Expand your business and reach thousands of local customers"
    >
      {/* Messages */}
      {errorMsg && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <FiAlertTriangle className="mt-0.5 shrink-0 text-base text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <FiCheckCircle className="mt-0.5 shrink-0 text-base text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Rejection Notice Banner */}
      {isRejected && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 font-bold text-rose-700">
            <FiAlertTriangle />
            Previous Application Needs Revision
          </div>
          <p className="mt-1 text-sm text-rose-600">
            Reason: {verification?.rejectionReason || "Verification documents were invalid or unreadable."}
          </p>
          <p className="mt-2 text-xs text-rose-700">
            Please re-upload valid identity or business documents below to resubmit.
          </p>
        </div>
      )}

      {/* Multi-step progress tabs */}
      {!providerProfile && (
        <div className="mb-8 flex items-center justify-center gap-4">
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
              step === 1
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
              1
            </span>
            Business Details
          </div>
          <div className="h-0.5 w-8 bg-slate-200" />
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
              step === 2
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
              2
            </span>
            KYC Verification
          </div>
        </div>
      )}

      {/* STEP 1: BUSINESS PROFILE CREATION */}
      {(!providerProfile || step === 1) && !isRejected && (
        <form onSubmit={handleCreateProvider} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <FiBriefcase className="text-indigo-600" /> 1. Business Information
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Tell customers who you are and where you can provide services.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Business / Brand Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Electrical & Appliance Repair"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  About Your Business & Experience
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your background, team, warranty, and specializations..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Service Radius: <span className="text-indigo-600">{serviceRadiusKm} km</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="60"
                  step="1"
                  value={serviceRadiusKm}
                  onChange={(e) => setServiceRadiusKm(e.target.value)}
                  className="w-full accent-indigo-600"
                />
                <span className="text-xs text-slate-400">
                  Customers within this radius from your base pin can discover you.
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Base Operational Coordinates
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={locating}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <FiNavigation className={locating ? "animate-spin" : ""} />
                    {locating ? "Locating..." : "Use My GPS"}
                  </button>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-slate-700">
                    Lat: {location.latitude}
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-slate-700">
                    Lng: {location.longitude}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Map Pin Selection */}
            <div className="mt-5">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Pin Your Base Location on Map (Click on map to position)
              </label>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <ServiceMap
                  center={[location.latitude, location.longitude]}
                  zoom={13}
                  selectedLocation={location}
                  onSelectLocation={(picked) => setLocation(picked)}
                  className="h-[320px] w-full"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Saving Profile..." : "Next: Upload Documents"} <FiArrowRight />
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: KYC DOCUMENT UPLOADS */}
      {(providerProfile || step === 2 || isRejected) && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <FiShield className="text-indigo-600" />
              {isRejected ? "Resubmit Verification Documents" : "2. KYC Verification Documents"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              To ensure customer trust, upload official government identification and professional certifications.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Document Type
                </label>
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
                >
                  {DOC_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Upload Document File (PDF, JPG, PNG)
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-4 text-center transition hover:border-indigo-400 hover:bg-indigo-50/30">
                  <FiUploadCloud className="text-xl text-indigo-600" />
                  <span className="text-xs font-semibold text-slate-700">
                    Click to browse files (up to 10 files)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Selected Documents List */}
            {docFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Selected Documents ({docFiles.length}/10)
                </h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {docFiles.map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FiFileText className="shrink-0 text-base text-indigo-600" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">{doc.name}</p>
                          <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                            {doc.type}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDoc(idx)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Additional Notes or License Numbers (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Include registration/license numbers or references if applicable..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            {step === 2 && !providerProfile && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Back
              </button>
            )}
            <button
              type="button"
              disabled={submitting || docFiles.length === 0}
              onClick={() => handleSubmitDocuments(isRejected)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Uploading & Submitting..." : isRejected ? "Resubmit Application" : "Submit for Verification"}
            </button>
          </div>
        </div>
      )}
    </UserPageShell>
  );
}
