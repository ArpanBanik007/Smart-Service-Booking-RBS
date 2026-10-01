import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiArrowLeft,
  FiCheckCircle,
  FiAlertCircle,
  FiPlus,
} from "react-icons/fi";
import UserPageShell from "./UserPageShell.jsx";
import apiClient from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";

const TIME_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

export default function BookServicePage() {
  const { serviceId } = useParams();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Booking Form State
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState(defaultDateStr);
  const [selectedStartTime, setSelectedStartTime] = useState("10:00");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        // Fetch Service details
        const sRes = await apiClient.get(ENDPOINTS.SERVICES.GET_BY_ID(serviceId));
        const sData = sRes.data?.data || sRes.data;
        setService(sData);

        // Fetch User's Addresses
        const aRes = await apiClient.get(ENDPOINTS.ADDRESSES.LIST);
        const aList = aRes.data?.data || aRes.data || [];
        setAddresses(Array.isArray(aList) ? aList : []);

        // Pick default address if available
        const defaultAddr = aList.find((a) => a.isDefault) || aList[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr._id);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load booking details.");
      } finally {
        setLoading(false);
      }
    };

    if (serviceId) {
      fetchData();
    }
  }, [serviceId]);

  // Calculate End Time by adding duration in minutes
  const calculateEndTime = (startStr, durationMinutes = 60) => {
    const [h, m] = startStr.split(":").map(Number);
    const startMins = h * 60 + m;
    const endMins = startMins + durationMinutes;
    const endH = Math.floor(endMins / 60) % 24;
    const endM = endMins % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  };

  const handleProceedToSummary = (e) => {
    e.preventDefault();
    setFormError("");

    if (!selectedDate) {
      setFormError("Please choose a scheduled service date.");
      return;
    }

    if (!selectedStartTime) {
      setFormError("Please select a convenient time slot.");
      return;
    }

    if (!selectedAddressId) {
      setFormError("Please select or add a delivery address.");
      return;
    }

    const scheduledEndTime = calculateEndTime(
      selectedStartTime,
      service?.duration || 60
    );

    const chosenAddress = addresses.find((a) => a._id === selectedAddressId);

    // Navigate to summary with state payload
    navigate("/booking/summary", {
      state: {
        service,
        serviceId: service._id,
        addressId: selectedAddressId,
        address: chosenAddress,
        scheduledDate: selectedDate,
        scheduledStartTime: selectedStartTime,
        scheduledEndTime,
        notes: notes.trim(),
      },
    });
  };

  if (loading) {
    return (
      <UserPageShell title="Book Service" subtitle="Preparing booking form...">
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </UserPageShell>
    );
  }

  if (error || !service) {
    return (
      <UserPageShell title="Book Service" subtitle="Service unavailable">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <FiAlertCircle className="mx-auto text-3xl text-rose-500" />
          <h3 className="mt-2 text-base font-bold text-rose-800">
            {error || "Service listing not found"}
          </h3>
          <Link
            to="/providers"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <FiArrowLeft />
            Explore Other Services
          </Link>
        </div>
      </UserPageShell>
    );
  }

  return (
    <UserPageShell
      title="Book Service Appointment"
      subtitle={`Schedule an appointment for ${service.title}`}
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          to={`/providers/${service.provider?._id || ""}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          <FiArrowLeft />
          Back to Provider Profile
        </Link>

        {/* Selected Service Card */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 sm:flex-row sm:items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Selected Service
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-1">{service.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Provider: <span className="font-semibold text-slate-800">{service.provider?.businessName || "Certified Partner"}</span>
            </p>
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <FiClock className="text-indigo-600" />
                Est. Duration: {service.duration} mins
              </span>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-400">Fixed Rate</span>
            <p className="text-2xl font-extrabold text-slate-900">₹{service.price}</p>
          </div>
        </div>

        {formError && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">
            <FiAlertCircle />
            {formError}
          </div>
        )}

        <form onSubmit={handleProceedToSummary} className="space-y-6">
          {/* STEP 1: DATE & TIME */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <FiCalendar className="text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">Select Date & Time</h3>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Appointment Date
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Start Time Slot
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedStartTime(slot)}
                      className={`rounded-xl py-2 text-xs font-medium transition ${
                        selectedStartTime === slot
                          ? "bg-indigo-600 text-white font-semibold shadow-xs"
                          : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: ADDRESS SELECTION */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FiMapPin className="text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Service Location</h3>
              </div>
              <Link
                to="/addresses"
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <FiPlus />
                Add New Address
              </Link>
            </div>

            {addresses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center">
                <p className="text-xs text-slate-500">
                  You don&apos;t have any saved addresses. Please add an address to continue.
                </p>
                <Link
                  to="/addresses"
                  className="mt-3 inline-block rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
                >
                  Manage & Add Address
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {addresses.map((addr) => (
                  <label
                    key={addr._id}
                    className={`relative flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                      selectedAddressId === addr._id
                        ? "border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-100"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="selectedAddress"
                      value={addr._id}
                      checked={selectedAddressId === addr._id}
                      onChange={() => setSelectedAddressId(addr._id)}
                      className="mt-1 h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{addr.addressLine || addr.street || "Service Address"}</span>
                        {addr.label && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 capitalize">
                            {addr.label}
                          </span>
                        )}
                        {addr.isDefault && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        {addr.city}, {addr.state} - {addr.pincode || addr.postalCode}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* STEP 3: SPECIAL INSTRUCTIONS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Special Instructions or Notes for Provider (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Ring the doorbell twice, park behind the building..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* SUBMIT BUTTON */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <span className="text-xs text-slate-500">
              No immediate charge. Review booking summary on next step.
            </span>
            <button
              type="submit"
              disabled={addresses.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
            >
              <FiCheckCircle />
              Continue to Summary
            </button>
          </div>
        </form>
      </div>
    </UserPageShell>
  );
}
