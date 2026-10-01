import { useState, useEffect } from "react";
import {
  FiMapPin,
  FiPlus,
  FiTrash2,
  FiCheck,
  FiNavigation,
  FiX,
  FiAlertCircle,
} from "react-icons/fi";
import UserPageShell from "./UserPageShell.jsx";
import ServiceMap from "../../components/map/ServiceMap.jsx";
import apiClient from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";

export default function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Form Fields
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("Kolkata");
  const [state, setState] = useState("West Bengal");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("India");
  const [isDefault, setIsDefault] = useState(false);
  const [coordinates, setCoordinates] = useState({
    latitude: 22.5726,
    longitude: 88.3639,
  });
  const [locating, setLocating] = useState(false);

  // Fetch Addresses
  const fetchAddresses = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get(ENDPOINTS.ADDRESSES.LIST);
      const list = res.data?.data || res.data || [];
      setAddresses(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load saved addresses."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  // Detect GPS
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setFormError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setFormError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordinates({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        });
        setLocating(false);
      },
      () => {
        setFormError("Could not retrieve GPS coordinates. Please click on the map to pin.");
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Add Address Submit
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!street.trim() || !city.trim() || !postalCode.trim()) {
      setFormError("Street address, city, and postal code are required.");
      return;
    }

    setSaving(true);
    try {
      await apiClient.post(ENDPOINTS.ADDRESSES.CREATE, {
        label: "home",
        street: street.trim(),
        addressLine: street.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        pincode: postalCode.trim(),
        country: country.trim(),
        isDefault,
        coordinates: [coordinates.longitude, coordinates.latitude], // GeoJSON order [lng, lat]
      });

      setShowAddModal(false);
      setStreet("");
      setPostalCode("");
      fetchAddresses();
    } catch (err) {
      setFormError(
        err.response?.data?.message || "Failed to save address. Please check all fields."
      );
    } finally {
      setSaving(false);
    }
  };

  // Set as Default
  const handleSetDefault = async (addressId) => {
    try {
      await apiClient.patch(ENDPOINTS.ADDRESSES.SET_DEFAULT(addressId));
      fetchAddresses();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update default address.");
    }
  };

  // Delete Address
  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm("Are you sure you want to remove this address?")) return;
    try {
      await apiClient.delete(ENDPOINTS.ADDRESSES.DELETE(addressId));
      setAddresses((prev) => prev.filter((a) => a._id !== addressId));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete address.");
    }
  };

  return (
    <UserPageShell
      title="Saved Addresses"
      subtitle="Manage your primary service locations for quick and accurate booking dispatch"
    >
      <div className="flex flex-col gap-6">
        {/* Top Header / Add Button */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <p className="text-sm text-slate-600">
            {addresses.length} saved {addresses.length === 1 ? "location" : "locations"}
          </p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <FiPlus />
            Add New Address
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <FiAlertCircle />
            {error}
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100 p-5" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && addresses.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">
              <FiMapPin />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">No addresses saved yet</h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              Add your home or office address to discover nearby providers and enable 1-click booking.
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Add Your First Address
            </button>
          </div>
        )}

        {/* Addresses Grid */}
        {!loading && addresses.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {addresses.map((addr) => (
              <div
                key={addr._id}
                className={`relative flex flex-col justify-between rounded-2xl border p-5 transition ${
                  addr.isDefault
                    ? "border-indigo-500 bg-indigo-50/20 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                      <FiMapPin />
                    </span>
                    {addr.isDefault ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                        <FiCheck />
                        Default
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(addr._id)}
                        className="text-xs font-medium text-slate-500 hover:text-indigo-600"
                      >
                        Set as default
                      </button>
                    )}
                  </div>

                  <p className="mt-3 font-semibold text-slate-900">{addr.addressLine || addr.street || addr.label || "Service Address"}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {addr.city}, {addr.state} - {addr.pincode || addr.postalCode}
                  </p>
                  <p className="text-xs text-slate-400">{addr.country || "India"}</p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[10px] text-slate-400">
                    GPS: {addr.coordinates?.coordinates?.[1]?.toFixed(4)},{" "}
                    {addr.coordinates?.coordinates?.[0]?.toFixed(4)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(addr._id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    title="Delete address"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= ADD ADDRESS MODAL ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Service Location</h3>
                <p className="text-xs text-slate-500">
                  Enter your address details and click on the map to pin exact coordinates
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <FiX />
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">
                <FiAlertCircle />
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveAddress} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Street Address
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Apartment, building, street or locality"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Postal Code</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="700001"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Map Coordinate Picker */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    Pin Location on Map ({coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)})
                  </span>
                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={locating}
                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                  >
                    <FiNavigation className={locating ? "animate-pulse" : ""} />
                    {locating ? "Detecting GPS..." : "Detect GPS Location"}
                  </button>
                </div>

                <div className="h-56 w-full rounded-xl border border-slate-200 overflow-hidden">
                  <ServiceMap
                    center={[coordinates.latitude, coordinates.longitude]}
                    zoom={14}
                    selectedLocation={coordinates}
                    onSelectLocation={(loc) => setCoordinates(loc)}
                    className="h-full w-full"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Tip: Click anywhere on the map above to drop the pin at your exact location.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  id="default-check"
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="default-check" className="text-xs font-medium text-slate-700">
                  Set as my default booking address
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 px-6 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </UserPageShell>
  );
}
