import { useState, useEffect } from "react";
import api from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import ProviderPageShell from "./ProviderPageShell.jsx";
import ServiceMap from "../../components/map/ServiceMap.jsx";
import {
  FiMapPin,
  FiNavigation,
  FiCheck,
  FiAlertCircle,
  FiSave,
} from "react-icons/fi";

export default function ProviderServiceAreaPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [radiusKm, setRadiusKm] = useState(15);
  const [location, setLocation] = useState({ latitude: 22.5726, longitude: 88.3639 }); // Default Kolkata
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchProfile = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api.get(ENDPOINTS.PROVIDER.ME);
      const data = res.data?.data;
      if (data) {
        if (data.serviceRadiusKm) setRadiusKm(data.serviceRadiusKm);
        const coords = data.serviceArea?.coordinates; // [lng, lat]
        if (Array.isArray(coords) && coords.length === 2) {
          setLocation({ latitude: coords[1], longitude: coords[0] });
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load provider service area.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation not supported by your browser.");
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
        setErrorMsg("Location access denied. Please click on the map to place your pin.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const payload = {
        serviceRadiusKm: Number(radiusKm),
        serviceArea: {
          type: "Point",
          coordinates: [Number(location.longitude), Number(location.latitude)],
        },
      };

      await api.patch(ENDPOINTS.PROVIDER.UPDATE_SERVICE_AREA, payload);
      setSuccessMsg("Service coverage area updated successfully! Nearby customers can now discover your services.");
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to update service area.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProviderPageShell
      title="Service Coverage Area & Geofence"
      subtitle="Define your central operating base pin and maximum travel radius for customer orders"
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
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Service Radius: <span className="text-indigo-600 text-sm">{radiusKm} km</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="60"
                  step="1"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <p className="mt-2 text-xs text-slate-500">
                  You will receive service notifications and show up in customer searches within a {radiusKm} km radius from your base location.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Base Operational Coordinates
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={locating}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <FiNavigation className={locating ? "animate-spin" : ""} />
                    {locating ? "Locating..." : "Use Current GPS"}
                  </button>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-slate-700">
                    Lat: {location.latitude}
                  </span>
                  <span className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-slate-700">
                    Lng: {location.longitude}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Map */}
            <div className="mt-6">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Interactive Coverage Map (Click anywhere on map to reposition your base)
              </label>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <ServiceMap
                  center={[location.latitude, location.longitude]}
                  zoom={12}
                  selectedLocation={location}
                  userLocation={{ ...location, radiusKm: radiusKm }}
                  onSelectLocation={(picked) => setLocation(picked)}
                  className="h-[420px] w-full"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
            >
              <FiSave /> {saving ? "Saving Changes..." : "Save Service Coverage"}
            </button>
          </div>
        </form>
      )}
    </ProviderPageShell>
  );
}
