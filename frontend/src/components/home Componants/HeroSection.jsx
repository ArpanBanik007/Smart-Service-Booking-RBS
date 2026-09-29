import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiMapPin,
  FiNavigation,
  FiStar,
  FiShield,
  FiClock,
  FiCreditCard,
  FiCheckCircle,
} from "react-icons/fi";

/* ------------------------------------------------------------------
   MOCK DATA: pore API / constants theke replace korbe.
------------------------------------------------------------------ */
const CITIES = ["Kolkata", "Howrah", "Salt Lake", "New Town", "Barasat"];

const POPULAR_SERVICES = [
  "Plumber",
  "Electrician",
  "Cleaning",
  "AC Repair",
  "Painter",
  "Carpenter",
];

const TRUST_POINTS = [
  { icon: FiShield, label: "Verified providers" },
  { icon: FiCreditCard, label: "Secure Razorpay payment" },
  { icon: FiClock, label: "Live provider tracking" },
];

function HeroSection() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [city, setCity] = useState(CITIES[0]);
  const [coords, setCoords] = useState(null); // { latitude, longitude }
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const goToProviders = (extra = {}) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    if (coords) {
      params.set("latitude", coords.latitude);
      params.set("longitude", coords.longitude);
    } else {
      params.set("city", city);
    }
    Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    navigate(`/providers?${params.toString()}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    goToProviders();
  };

  const handleDetectLocation = () => {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Your browser does not support location.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLocating(false);
      },
      () => {
        setLocationError("Location permission denied. Please select a city.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleQuickService = (service) => {
    const params = new URLSearchParams({ search: service });
    if (coords) {
      params.set("latitude", coords.latitude);
      params.set("longitude", coords.longitude);
    } else {
      params.set("city", city);
    }
    navigate(`/providers?${params.toString()}`);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-40 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-2 lg:px-8 lg:py-24">
        {/* ================= LEFT: TEXT + SEARCH ================= */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm">
            <FiCheckCircle />
            Trusted local professionals
          </span>

          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Book trusted services{" "}
            <span className="text-indigo-600">near you</span>
          </h1>

          <p className="mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
            Find verified plumbers, electricians, cleaners and more in your
            area. Book in minutes, pay securely and track your provider live.
          </p>

          {/* Search card */}
          <form
            onSubmit={handleSubmit}
            className="mt-8 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-indigo-100/50"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              {/* Service input */}
              <div className="relative flex-1">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What service do you need?"
                  className="w-full rounded-xl bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              {/* City select */}
              <div className="relative sm:w-44">
                <FiMapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-indigo-600" />
                <select
                  value={coords ? "current" : city}
                  onChange={(e) => {
                    setCoords(null);
                    setCity(e.target.value);
                  }}
                  className="w-full appearance-none rounded-xl bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo-200"
                >
                  {coords && <option value="current">Current location</option>}
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]"
              >
                Search
              </button>
            </div>
          </form>

          {/* Detect location */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={locating}
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiNavigation className={locating ? "animate-pulse" : ""} />
              {locating
                ? "Detecting location..."
                : coords
                ? "Location detected. Detect again"
                : "Use my current location"}
            </button>
            {locationError && (
              <span className="text-sm text-rose-500">{locationError}</span>
            )}
          </div>

          {/* Popular services */}
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Popular
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {POPULAR_SERVICES.map((service) => (
                <button
                  key={service}
                  type="button"
                  onClick={() => handleQuickService(service)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {service}
                </button>
              ))}
            </div>
          </div>

          {/* Trust points */}
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            {TRUST_POINTS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 text-sm font-medium text-slate-600"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <Icon />
                </span>
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* ================= RIGHT: VISUAL MOCKUP ================= */}
        <div className="relative mx-auto hidden w-full max-w-md lg:block">
          {/* Main provider card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-indigo-100/60">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-bold text-indigo-700">
                R
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Rahim Plumbing</p>
                <div className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                  <FiStar className="text-amber-500" />
                  4.8 (120 reviews)
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                Verified
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {[
                { name: "Tap Repair", time: "45 min", price: "₹300" },
                { name: "Pipe Fitting", time: "90 min", price: "₹800" },
              ].map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.time}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{s.price}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="mt-5 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white"
            >
              Book Now
            </button>
          </div>

          {/* Floating: tracking pill */}
          <div className="absolute -left-10 -top-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-800">On the way</p>
              <p className="text-[11px] text-slate-500">Arriving in 8 min</p>
            </div>
          </div>

          {/* Floating: payment pill */}
          <div className="absolute -bottom-6 -right-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <FiCheckCircle />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-800">Payment successful</p>
              <p className="text-[11px] text-slate-500">₹350 paid via Razorpay</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;