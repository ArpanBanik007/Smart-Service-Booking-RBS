import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FiMapPin,
  FiNavigation,
  FiStar,
  FiShield,
  FiClock,
  FiCreditCard,
  FiCheckCircle,
  FiTool,
} from "react-icons/fi";
import SearchBar from "../search/SearchBar.jsx";
import apiClient from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";

/* ------------------------------------------------------------------
   CITY LIST: For the city dropdown (static — these are location filters,
   not provider data).
------------------------------------------------------------------ */
const CITIES = ["Kolkata", "Howrah", "Salt Lake", "New Town", "Barasat"];

const TRUST_POINTS = [
  { icon: FiShield, label: "Verified providers" },
  { icon: FiCreditCard, label: "Secure Razorpay payment" },
  { icon: FiClock, label: "Live provider tracking" },
];

function HeroSection() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [city, setCity] = useState(CITIES[0]);
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  // Real data from database
  const [featuredProvider, setFeaturedProvider] = useState(null);
  const [featuredServices, setFeaturedServices] = useState([]);
  const [popularCategories, setPopularCategories] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Fetch real featured provider and categories from MongoDB
  useEffect(() => {
    async function loadRealData() {
      setLoadingData(true);
      try {
        // Fetch real providers
        const provRes = await apiClient.get(ENDPOINTS.PROVIDER.LIST, {
          params: { sort: "rating", limit: 1 },
        });
        const provList = provRes.data?.data?.providers || provRes.data?.data || [];
        const topProvider = Array.isArray(provList) && provList.length > 0 ? provList[0] : null;
        setFeaturedProvider(topProvider);

        // Fetch services for the featured provider
        if (topProvider?._id) {
          try {
            const svcRes = await apiClient.get(ENDPOINTS.SERVICES.BY_PROVIDER(topProvider._id));
            const svcList = svcRes.data?.data?.services || svcRes.data?.data || [];
            setFeaturedServices(Array.isArray(svcList) ? svcList.slice(0, 3) : []);
          } catch {
            setFeaturedServices([]);
          }
        }

        // Fetch real categories for "Popular" section
        try {
          const catRes = await apiClient.get(ENDPOINTS.CATEGORIES.LIST);
          const catList = catRes.data?.data || [];
          setPopularCategories(
            Array.isArray(catList) ? catList.filter((c) => c.isActive !== false).slice(0, 6) : []
          );
        } catch {
          setPopularCategories([]);
        }
      } catch (err) {
        console.error("Failed to load hero data:", err);
      } finally {
        setLoadingData(false);
      }
    }
    loadRealData();
  }, []);

  const goToProviders = (searchVal = null, extra = {}) => {
    const params = new URLSearchParams();
    const effectiveSearch = typeof searchVal === "string" ? searchVal : query;
    if (effectiveSearch && effectiveSearch.trim()) {
      params.set("search", effectiveSearch.trim());
    }
    if (coords) {
      params.set("latitude", coords.latitude);
      params.set("longitude", coords.longitude);
    } else {
      params.set("city", city);
    }
    if (typeof extra === "object" && extra !== null) {
      Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    }
    navigate(`/providers?${params.toString()}`);
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

  const handleQuickCategory = (catName) => {
    const params = new URLSearchParams({ search: catName });
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
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-indigo-100/50">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Service input with live suggestions */}
              <div className="relative flex-1 w-full">
                <SearchBar
                  placeholder="What service do you need? (e.g. AC mechanic, PC repair)"
                  initialValue={query}
                  onSearchSubmit={(val) => {
                    setQuery(val);
                    goToProviders(val);
                  }}
                  inputClassName="!rounded-xl !py-3 !bg-slate-50 border-0 focus:!bg-white"
                />
              </div>

              {/* City select */}
              <div className="relative w-full sm:w-44 shrink-0">
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
                type="button"
                onClick={() => goToProviders(query)}
                className="w-full sm:w-auto rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]"
              >
                Search
              </button>
            </div>
          </div>

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

          {/* Popular categories — from real database */}
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Popular
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {popularCategories.length > 0 ? (
                popularCategories.map((cat) => (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => handleQuickCategory(cat.name)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    {cat.name}
                  </button>
                ))
              ) : !loadingData ? (
                <span className="text-sm text-slate-400">
                  No categories available yet.
                </span>
              ) : null}
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

        {/* ================= RIGHT: REAL PROVIDER CARD ================= */}
        <div className="relative mx-auto hidden w-full max-w-md lg:block">
          {featuredProvider ? (
            /* Real provider card from database */
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-indigo-100/60">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-bold text-indigo-700">
                  {featuredProvider.businessName?.charAt(0) || "P"}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{featuredProvider.businessName}</p>
                  <div className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                    <FiStar className="text-amber-500" />
                    {featuredProvider.rating?.toFixed(1) || "5.0"} ({featuredProvider.totalReviews || 0} reviews)
                  </div>
                </div>
                {featuredProvider.isVerified !== false && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                    Verified
                  </span>
                )}
              </div>

              {featuredServices.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {featuredServices.map((s) => (
                    <div
                      key={s._id}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                        <p className="text-xs text-slate-500">{s.duration} min</p>
                      </div>
                      <p className="text-sm font-bold text-slate-900">₹{s.price}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-center">
                  <FiTool className="mx-auto text-xl text-slate-400" />
                  <p className="mt-1 text-xs text-slate-500">Services coming soon</p>
                </div>
              )}

              <Link
                to={`/providers/${featuredProvider._id}`}
                className="mt-5 block w-full rounded-xl bg-indigo-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                View Provider
              </Link>
            </div>
          ) : loadingData ? (
            /* Loading skeleton */
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-indigo-100/60">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 animate-pulse rounded-2xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <div className="h-14 animate-pulse rounded-xl bg-slate-50" />
                <div className="h-14 animate-pulse rounded-xl bg-slate-50" />
              </div>
              <div className="mt-5 h-12 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : (
            /* No providers available */
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center shadow-lg">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">
                <FiTool />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">No providers yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                Service providers will appear here once they register on the platform.
              </p>
            </div>
          )}

          {/* Floating: tracking pill (decorative — shows platform capability) */}
          <div className="absolute -left-10 -top-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-800">On the way</p>
              <p className="text-[11px] text-slate-500">Live provider tracking</p>
            </div>
          </div>

          {/* Floating: payment pill (decorative — shows platform capability) */}
          <div className="absolute -bottom-6 -right-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <FiCheckCircle />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-800">Secure Payments</p>
              <p className="text-[11px] text-slate-500">Razorpay protected</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;