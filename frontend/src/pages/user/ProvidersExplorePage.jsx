import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FiNavigation,
  FiStar,
  FiCheckCircle,
  FiSliders,
  FiAlertCircle,
  FiCompass,
  FiTool,
  FiClock,
  FiFilter,
  FiX,
  FiMap,
  FiGrid,
  FiArrowRight,
} from "react-icons/fi";
import UserPageShell from "./UserPageShell.jsx";
import ServiceMap from "../../components/map/ServiceMap.jsx";
import SearchBar from "../../components/search/SearchBar.jsx";
import apiClient from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";

export default function ProvidersExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const initialSearch = searchParams.get("search") || "";
  const initialCategory = searchParams.get("category") || "All";
  const initialAvailable = searchParams.get("available") === "today";
  const initialMinRating = searchParams.get("minRating") || "";
  const initialSort = searchParams.get("sort") || "rating";
  const initialLat = parseFloat(searchParams.get("latitude")) || 22.5726; // Default Kolkata
  const initialLng = parseFloat(searchParams.get("longitude")) || 88.3639;

  // Local filter states
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [availableTodayOnly, setAvailableTodayOnly] = useState(initialAvailable);
  const [minRating, setMinRating] = useState(initialMinRating);
  const [sortBy, setSortBy] = useState(initialSort);
  const [activeTab, setActiveTab] = useState("providers"); // 'providers' | 'services'
  const [showMap, setShowMap] = useState(true);

  // Geo state
  const [radius, setRadius] = useState(25); // km
  const [coords, setCoords] = useState({
    latitude: initialLat,
    longitude: initialLng,
  });
  const [hasCustomLocation, setHasCustomLocation] = useState(
    Boolean(searchParams.get("latitude"))
  );
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState("");

  // Data states
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Keep search term state in sync with URL searchParams
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    const urlCat = searchParams.get("category") || "All";
    const urlAvail = searchParams.get("available") === "today";
    const urlRating = searchParams.get("minRating") || "";
    const urlSort = searchParams.get("sort") || "rating";

    setSearchTerm(urlSearch);
    setSelectedCategory(urlCat);
    setAvailableTodayOnly(urlAvail);
    setMinRating(urlRating);
    setSortBy(urlSort);
  }, [searchParams]);

  // Load Categories once
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await apiClient.get(ENDPOINTS.CATEGORIES.LIST);
        const list = res.data?.data || [];
        setCategories(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    }
    loadCategories();
  }, []);

  // Fetch Providers and Services
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // 1. Fetch real providers from marketplace endpoint
      const providerParams = {
        search: searchTerm.trim() || undefined,
        category: selectedCategory !== "All" ? selectedCategory : undefined,
        availability: availableTodayOnly ? "today" : undefined,
        minRating: minRating || undefined,
        sort: sortBy || "rating",
      };

      if (hasCustomLocation && coords.latitude && coords.longitude) {
        providerParams.latitude = coords.latitude;
        providerParams.longitude = coords.longitude;
        providerParams.radius = radius;
      }

      const pRes = await apiClient.get(ENDPOINTS.PROVIDER.LIST, {
        params: providerParams,
      });

      const pData = pRes.data?.data?.providers || pRes.data?.data || [];
      const loadedProviders = Array.isArray(pData) ? pData : [];
      setProviders(loadedProviders);

      // 2. Fetch matching services (with intelligent synonym expansion)
      const serviceSearchQuery =
        searchTerm.trim() || (selectedCategory !== "All" ? selectedCategory : "");

      try {
        const sRes = await apiClient.get(
          serviceSearchQuery ? ENDPOINTS.SERVICES.SEARCH : ENDPOINTS.SERVICES.LIST,
          {
            params: serviceSearchQuery
              ? { q: serviceSearchQuery }
              : { category: selectedCategory !== "All" ? selectedCategory : undefined },
          }
        );
        const sData = sRes.data?.data?.services || sRes.data?.data || [];
        setServices(Array.isArray(sData) ? sData : []);
      } catch {
        setServices([]);
      }
    } catch (err) {
      console.error("Marketplace explore error:", err);
      setProviders([]);
      setServices([]);
      if (err.response?.status !== 404 && err.response?.status !== 400) {
        setError(err.response?.data?.message || "Failed to load real providers.");
      }
    } finally {
      setLoading(false);
    }
  }, [
    searchTerm,
    selectedCategory,
    availableTodayOnly,
    minRating,
    sortBy,
    hasCustomLocation,
    coords.latitude,
    coords.longitude,
    radius,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync state changes to URL
  const updateUrlFilters = (updates = {}) => {
    const next = {
      search: searchTerm,
      category: selectedCategory,
      available: availableTodayOnly ? "today" : "",
      minRating,
      sort: sortBy,
      ...(hasCustomLocation
        ? { latitude: coords.latitude, longitude: coords.longitude }
        : {}),
      ...updates,
    };

    const params = new URLSearchParams();
    if (next.search) params.set("search", next.search);
    if (next.category && next.category !== "All") params.set("category", next.category);
    if (next.available === "today") params.set("available", "today");
    if (next.minRating) params.set("minRating", next.minRating);
    if (next.sort && next.sort !== "rating") params.set("sort", next.sort);
    if (next.latitude) params.set("latitude", next.latitude);
    if (next.longitude) params.set("longitude", next.longitude);

    setSearchParams(params);
  };

  const handleSearchSubmit = (newSearch) => {
    setSearchTerm(newSearch);
    updateUrlFilters({ search: newSearch });
  };

  const handleCategorySelect = (catName) => {
    const nextCat = selectedCategory === catName ? "All" : catName;
    setSelectedCategory(nextCat);
    updateUrlFilters({ category: nextCat });
  };

  const handleToggleAvailableToday = () => {
    const nextAvail = !availableTodayOnly;
    setAvailableTodayOnly(nextAvail);
    updateUrlFilters({ available: nextAvail ? "today" : "" });
  };

  const handleRatingChange = (ratingVal) => {
    setMinRating(ratingVal);
    updateUrlFilters({ minRating: ratingVal });
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    updateUrlFilters({ sort: newSort });
  };

  const handleClearAllFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    setAvailableTodayOnly(false);
    setMinRating("");
    setSortBy("rating");
    setHasCustomLocation(false);
    setSearchParams(new URLSearchParams());
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationNote("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    setLocationNote("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords = {
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        };
        setCoords(newCoords);
        setHasCustomLocation(true);
        setLocationNote("Filtered to providers near your current GPS location.");
        setLocating(false);
        updateUrlFilters({
          latitude: newCoords.latitude,
          longitude: newCoords.longitude,
        });
      },
      () => {
        setLocationNote("Location access denied. Showing all verified providers.");
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const isFiltered =
    Boolean(searchTerm) ||
    selectedCategory !== "All" ||
    availableTodayOnly ||
    Boolean(minRating) ||
    sortBy !== "rating" ||
    hasCustomLocation;

  return (
    <UserPageShell
      title="Explore Verified Service Professionals"
      subtitle="Find trusted local providers, view real-time availability, and book on demand"
    >
      <div className="flex flex-col gap-6">
        {/* ================= TOP SEARCH & FILTER BAR ================= */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-xs">
          {/* Main Search with Autocomplete */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <SearchBar
                placeholder="Search AC mechanic, PC repair, electrician, cleaning..."
                initialValue={searchTerm}
                onSearchSubmit={handleSearchSubmit}
                inputClassName="!py-3 !bg-white !text-slate-900 shadow-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={locating}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition ${
                  hasCustomLocation
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700 shadow-xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <FiNavigation
                  className={`text-indigo-600 ${locating ? "animate-pulse" : ""}`}
                />
                {locating
                  ? "Locating..."
                  : hasCustomLocation
                  ? "Nearby Mode Active"
                  : "Use My Location"}
              </button>

              <button
                type="button"
                onClick={() => setShowMap((prev) => !prev)}
                className={`hidden shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition lg:inline-flex ${
                  showMap
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <FiMap className="text-sm" />
                {showMap ? "Hide Map" : "Show Map"}
              </button>
            </div>
          </div>

          {locationNote && (
            <p className="mt-2 text-xs font-medium text-indigo-600 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 inline-block" />
              {locationNote}
            </p>
          )}

          {/* Dynamic Category Chips */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => handleCategorySelect("All")}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                selectedCategory === "All"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-700 hover:border-indigo-300"
              }`}
            >
              All Categories
            </button>

            {categories.map((cat) => (
              <button
                key={cat._id || cat.name}
                type="button"
                onClick={() => handleCategorySelect(cat.name)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  selectedCategory === cat.name
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:border-indigo-300"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Secondary Quick Filters & Sorting */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Availability Filter Toggle */}
              <button
                type="button"
                onClick={handleToggleAvailableToday}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  availableTodayOnly
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:border-emerald-300"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    availableTodayOnly
                      ? "bg-white animate-pulse"
                      : "bg-emerald-500"
                  }`}
                />
                Available Today
              </button>

              {/* Rating Dropdown */}
              <div className="flex items-center gap-1.5 text-xs">
                <FiStar className="text-amber-500" />
                <select
                  value={minRating}
                  onChange={(e) => handleRatingChange(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="">Any Rating</option>
                  <option value="4.5">4.5+ Stars</option>
                  <option value="4.0">4.0+ Stars</option>
                  <option value="3.5">3.5+ Stars</option>
                </select>
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-1.5 text-xs">
                <FiFilter className="text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="rating">Top Rated</option>
                  <option value="startingPrice">Starting Price: Low to High</option>
                  <option value="reviews">Most Reviewed</option>
                </select>
              </div>

              {/* Clear Filters Button */}
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="inline-flex items-center gap-1 rounded-xl bg-slate-200/80 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 transition"
                >
                  <FiX /> Reset
                </button>
              )}
            </div>

            {/* Radius slider if custom location active */}
            {hasCustomLocation && (
              <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <FiSliders className="text-indigo-600" />
                <span>Radius:</span>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="h-1.5 w-20 cursor-pointer accent-indigo-600"
                />
                <span className="font-bold text-slate-900 w-10">{radius} km</span>
              </div>
            )}
          </div>
        </div>

        {/* Error notification if any */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">
            <FiAlertCircle />
            {error}
          </div>
        )}

        {/* View Selection Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("providers")}
              className={`flex items-center gap-2 pb-2 text-sm font-bold transition border-b-2 -mb-2.5 ${
                activeTab === "providers"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <FiGrid />
              <span>Providers</span>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                {providers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("services")}
              className={`flex items-center gap-2 pb-2 text-sm font-bold transition border-b-2 -mb-2.5 ${
                activeTab === "services"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <FiTool />
              <span>Services</span>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                {services.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            {searchTerm && (
              <span>
                Results for &ldquo;<strong>{searchTerm}</strong>&rdquo;
              </span>
            )}
          </div>
        </div>

        {/* ================= CONTENT & MAP GRID ================= */}
        <div
          className={`grid grid-cols-1 gap-6 ${
            showMap ? "lg:grid-cols-12" : "lg:grid-cols-1"
          }`}
        >
          {/* LEFT: PROVIDERS / SERVICES LIST */}
          <div className={showMap ? "lg:col-span-6 xl:col-span-5" : "w-full"}>
            {loading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-44 animate-pulse rounded-2xl bg-slate-100 p-5"
                  />
                ))}
              </div>
            )}

            {/* TAB 1: PROVIDERS LIST */}
            {!loading && activeTab === "providers" && (
              <div className="space-y-4">
                {providers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                    <FiCompass className="mx-auto text-4xl text-slate-300" />
                    <h4 className="mt-3 text-base font-bold text-slate-800">
                      No service providers match your criteria
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      Try searching with broader terms like &ldquo;AC&rdquo;, &ldquo;mechanic&rdquo;, &ldquo;PC&rdquo;, or reset active filters.
                    </p>
                    <button
                      type="button"
                      onClick={handleClearAllFilters}
                      className="mt-4 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : (
                  providers.map((p) => {
                    const ratingVal = p.ratings?.average || p.rating || 5.0;
                    const reviewCount = p.ratings?.count || p.totalReviews || 0;
                    const activeServices = p.services || [];

                    return (
                      <div
                        key={p._id}
                        className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-indigo-300 hover:shadow-md"
                      >
                        {/* Top: Avatar, Name, Verified, Rating */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3.5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-lg font-bold text-white shadow-sm">
                              {p.businessName?.charAt(0) || "P"}
                            </div>
                            <div className="min-w-0">
                              <h3 className="truncate font-bold text-slate-900 group-hover:text-indigo-600 transition text-base">
                                {p.businessName}
                              </h3>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                <span className="flex items-center gap-1 font-bold text-amber-500">
                                  <FiStar className="fill-amber-400 text-amber-400" />
                                  {Number(ratingVal).toFixed(1)}
                                </span>
                                <span>({reviewCount} reviews)</span>
                                <span>•</span>
                                <span>{p.completedBookings || 0} completed</span>
                              </div>
                            </div>
                          </div>

                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                            <FiCheckCircle className="text-emerald-600" />
                            Verified
                          </span>
                        </div>

                        {/* Description */}
                        <p className="mt-3 line-clamp-2 text-xs text-slate-600 leading-relaxed">
                          {p.description ||
                            "Trusted professional providing expert doorstep servicing, repair, and maintenance."}
                        </p>

                        {/* Live Availability Badge & Operating Hours */}
                        <div className="mt-3 flex items-center gap-3">
                          {p.isAvailableToday ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Available Today ({p.operatingHours || "09:00 - 20:00"})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                              <FiClock className="text-slate-400" />
                              Closed Today
                            </span>
                          )}

                          {p.serviceRadiusKm && (
                            <span className="text-[11px] text-slate-500">
                              Serves within {p.serviceRadiusKm} km
                            </span>
                          )}
                        </div>

                        {/* Top Active Services Offered */}
                        {activeServices.length > 0 && (
                          <div className="mt-3.5 border-t border-slate-100 pt-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                              Available Services:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {activeServices.slice(0, 3).map((srv) => (
                                <Link
                                  key={srv._id}
                                  to={`/book/${srv._id}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 transition font-medium"
                                  title="Click to book service"
                                >
                                  <span>{srv.title}</span>
                                  <span className="font-bold text-indigo-600">
                                    ₹{srv.price}
                                  </span>
                                </Link>
                              ))}
                              {activeServices.length > 3 && (
                                <Link
                                  to={`/providers/${p._id}`}
                                  className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 transition"
                                >
                                  +{activeServices.length - 3} more
                                </Link>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Card Actions Footer */}
                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5">
                          <div>
                            {p.startingPrice > 0 ? (
                              <p className="text-xs text-slate-500">
                                Starting at{" "}
                                <strong className="text-sm font-extrabold text-slate-900">
                                  ₹{p.startingPrice}
                                </strong>
                              </p>
                            ) : (
                              <p className="text-xs font-semibold text-emerald-600">
                                Best Rates Guaranteed
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Link
                              to={`/providers/${p._id}`}
                              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:border-indigo-300 hover:bg-indigo-50/50 transition"
                            >
                              View Services
                            </Link>

                            <Link
                              to={
                                activeServices[0]
                                  ? `/book/${activeServices[0]._id}`
                                  : `/providers/${p._id}`
                              }
                              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
                            >
                              <span>Book Now</span>
                              <FiArrowRight className="text-xs" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: SERVICES LIST */}
            {!loading && activeTab === "services" && (
              <div className="space-y-3">
                {services.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                    <FiTool className="mx-auto text-4xl text-slate-300" />
                    <h4 className="mt-3 text-base font-bold text-slate-800">
                      No matching services found
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      Try searching for &ldquo;AC repair&rdquo;, &ldquo;fan&rdquo;, &ldquo;plumbing&rdquo;, or &ldquo;laptop&rdquo;.
                    </p>
                  </div>
                ) : (
                  services.map((s) => (
                    <div
                      key={s._id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-indigo-300 hover:shadow-md transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">
                            {s.title}
                          </h4>
                          {s.category?.name && (
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                              {s.category.name}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                          {s.description}
                        </p>

                        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                          {s.duration && (
                            <span className="flex items-center gap-1">
                              <FiClock className="text-slate-400" />
                              {s.duration} mins
                            </span>
                          )}
                          {s.provider?.businessName && (
                            <span>by {s.provider.businessName}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                        <span className="text-base font-extrabold text-indigo-600">
                          ₹{s.price}
                        </span>
                        <Link
                          to={`/book/${s._id}`}
                          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
                        >
                          Book Service &rarr;
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* RIGHT: INTERACTIVE MAP (COLLAPSIBLE) */}
          {showMap && (
            <div className="lg:col-span-6 xl:col-span-7">
              <div className="sticky top-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-md">
                <div className="flex items-center justify-between bg-white px-4 py-3 border-b border-slate-200 text-xs font-medium text-slate-600">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
                      Center: {hasCustomLocation ? "Your GPS" : "Kolkata"}
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                      {providers.length} Providers on Map
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    Click pin to view provider info
                  </span>
                </div>

                <div className="h-[560px] w-full">
                  <ServiceMap
                    center={[coords.latitude, coords.longitude]}
                    zoom={12}
                    userLocation={{
                      latitude: coords.latitude,
                      longitude: coords.longitude,
                      radiusKm: hasCustomLocation ? radius : undefined,
                    }}
                    providers={providers}
                    interactive={true}
                    className="h-full w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </UserPageShell>
  );
}
