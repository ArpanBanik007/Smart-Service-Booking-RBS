import { useState, useEffect } from "react";
import api from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import ProviderPageShell from "./ProviderPageShell.jsx";
import {
  FiClock,
  FiCheck,
  FiAlertCircle,
  FiSave,
  FiToggleLeft,
  FiToggleRight,
} from "react-icons/fi";

const DAYS = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
  { id: "sunday", label: "Sunday" },
];

export default function ProviderAvailabilityPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState({
    monday: { isAvailable: true, startTime: "09:00", endTime: "18:00" },
    tuesday: { isAvailable: true, startTime: "09:00", endTime: "18:00" },
    wednesday: { isAvailable: true, startTime: "09:00", endTime: "18:00" },
    thursday: { isAvailable: true, startTime: "09:00", endTime: "18:00" },
    friday: { isAvailable: true, startTime: "09:00", endTime: "18:00" },
    saturday: { isAvailable: true, startTime: "10:00", endTime: "16:00" },
    sunday: { isAvailable: false, startTime: "10:00", endTime: "14:00" },
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchAvailability = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api.get(ENDPOINTS.PROVIDER.ME);
      if (res.data?.data?.availability) {
        setAvailability((prev) => ({
          ...prev,
          ...res.data.data.availability,
        }));
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load schedule.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  const handleToggleDay = (day) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        isAvailable: !prev[day].isAvailable,
      },
    }));
  };

  const handleTimeChange = (day, field, val) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: val,
      },
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await api.patch(ENDPOINTS.PROVIDER.UPDATE_AVAILABILITY, { availability });
      setSuccessMsg("Weekly operating hours updated successfully!");
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to update availability.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProviderPageShell
      title="Weekly Working Hours & Availability"
      subtitle="Configure days and hours when your business is available to accept bookings"
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
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            {DAYS.map(({ id, label }) => {
              const dayConfig = availability[id] || {
                isAvailable: false,
                startTime: "09:00",
                endTime: "18:00",
              };
              return (
                <div
                  key={id}
                  className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleDay(id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${
                        dayConfig.isAvailable
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {dayConfig.isAvailable ? (
                        <FiToggleRight className="text-base" />
                      ) : (
                        <FiToggleLeft className="text-base" />
                      )}
                      {dayConfig.isAvailable ? "OPEN" : "CLOSED"}
                    </button>
                    <span className="text-sm font-bold text-slate-900">{label}</span>
                  </div>

                  {dayConfig.isAvailable ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">Hours:</span>
                      <input
                        type="time"
                        value={dayConfig.startTime || "09:00"}
                        onChange={(e) => handleTimeChange(id, "startTime", e.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 font-semibold text-slate-800 outline-none focus:border-indigo-500"
                      />
                      <span className="text-slate-400">to</span>
                      <input
                        type="time"
                        value={dayConfig.endTime || "18:00"}
                        onChange={(e) => handleTimeChange(id, "endTime", e.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 font-semibold text-slate-800 outline-none focus:border-indigo-500"
                      />
                    </div>
                  ) : (
                    <span className="text-xs font-semibold italic text-slate-400">
                      Not accepting appointments
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
            >
              <FiSave /> {saving ? "Saving Schedule..." : "Save Availability"}
            </button>
          </div>
        </form>
      )}
    </ProviderPageShell>
  );
}
