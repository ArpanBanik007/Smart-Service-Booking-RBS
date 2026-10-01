import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FiStar,
  FiMapPin,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowLeft,
  FiShield,
  FiDollarSign,
  FiSearch,
  FiAward,
  FiThumbsUp,
  FiCalendar,
} from "react-icons/fi";
import UserPageShell from "./UserPageShell.jsx";
import ServiceMap from "../../components/map/ServiceMap.jsx";
import apiClient from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";

export default function ProviderDetailsPage() {
  const { id } = useParams();

  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    const fetchProviderData = async () => {
      setLoading(true);
      setError("");

      try {
        // Fetch Provider Details
        const pRes = await apiClient.get(ENDPOINTS.PROVIDER.GET_BY_ID(id));
        const pData = pRes.data?.data || pRes.data;
        setProvider(pData);

        // Fetch Provider's Services
        try {
          const sRes = await apiClient.get(ENDPOINTS.SERVICES.BY_PROVIDER(id));
          const sData = sRes.data?.data || sRes.data || [];
          setServices(Array.isArray(sData) ? sData : []);
        } catch {
          setServices([]);
        }

        // Fetch Provider's Reviews
        try {
          const rRes = await apiClient.get(ENDPOINTS.REVIEWS.BY_PROVIDER(id));
          const rData = rRes.data?.data || rRes.data || [];
          setReviews(Array.isArray(rData) ? rData : []);
        } catch {
          setReviews([]);
        }
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to load provider profile."
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProviderData();
    }
  }, [id]);

  // Compute live operating status
  const openStatus = useMemo(() => {
    if (!provider?.availability) {
      return { isOpen: true, text: "Available for bookings" };
    }
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const now = new Date();
    const currentDay = days[now.getDay()];
    const todaySchedule = provider.availability[currentDay];

    if (!todaySchedule || !todaySchedule.isAvailable) {
      return { isOpen: false, text: "Closed today" };
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = (todaySchedule.startTime || "09:00")
      .split(":")
      .map(Number);
    const [endH, endM] = (todaySchedule.endTime || "18:00")
      .split(":")
      .map(Number);
    const startMinutes = (startH || 0) * 60 + (startM || 0);
    const endMinutes = (endH || 0) * 60 + (endM || 0);

    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      return {
        isOpen: true,
        text: `Open Now • Closes at ${todaySchedule.endTime}`,
      };
    } else if (currentMinutes < startMinutes) {
      return {
        isOpen: false,
        text: `Closed Now • Opens at ${todaySchedule.startTime}`,
      };
    } else {
      return {
        isOpen: false,
        text: `Closed for today • Reopens tomorrow`,
      };
    }
  }, [provider]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set();
    services.forEach((s) => {
      if (s.category?.name) set.add(s.category.name);
      else if (typeof s.category === "string" && s.category.trim())
        set.add(s.category);
    });
    return ["all", ...Array.from(set)];
  }, [services]);

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchQuery =
        !searchQuery.trim() ||
        s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const catName = s.category?.name || s.category;
      const matchCat =
        selectedCategory === "all" || catName === selectedCategory;

      return matchQuery && matchCat;
    });
  }, [services, searchQuery, selectedCategory]);

  // Rating distribution breakdown
  const ratingDistribution = useMemo(() => {
    const total = reviews.length;
    return [5, 4, 3, 2, 1].map((stars) => {
      const count = reviews.filter((r) => Math.round(r.rating) === stars).length;
      const pct = total > 0 ? (count / total) * 100 : 0;
      return { stars, count, pct };
    });
  }, [reviews]);

  if (loading) {
    return (
      <UserPageShell title="Provider Profile" subtitle="Loading service details...">
        <div className="space-y-6 animate-pulse">
          <div className="h-40 rounded-3xl bg-slate-100" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="h-48 rounded-2xl bg-slate-100" />
            <div className="h-48 rounded-2xl bg-slate-100" />
          </div>
        </div>
      </UserPageShell>
    );
  }

  if (error || !provider) {
    return (
      <UserPageShell title="Provider Profile" subtitle="Provider unavailable">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <FiAlertCircle className="mx-auto text-3xl text-rose-500" />
          <h3 className="mt-2 text-base font-bold text-rose-800">
            {error || "Provider not found"}
          </h3>
          <p className="mt-1 text-xs text-rose-600">
            This provider profile might be inactive or currently unverified.
          </p>
          <Link
            to="/providers"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <FiArrowLeft />
            Back to Providers Directory
          </Link>
        </div>
      </UserPageShell>
    );
  }

  const coords = provider.serviceArea?.coordinates;
  const hasCoords = Array.isArray(coords) && coords.length === 2;
  const ratingVal =
    typeof provider.rating === "number"
      ? provider.rating
      : provider.rating?.average || 5.0;
  const reviewCount =
    typeof provider.totalReviews === "number"
      ? provider.totalReviews
      : provider.rating?.count || reviews.length || 0;

  return (
    <UserPageShell
      title={provider.businessName}
      subtitle={`Verified service partner • ${provider.completedBookings || 0} completed orders`}
    >
      <div className="flex flex-col gap-8">
        {/* Back Link */}
        <Link
          to="/providers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 w-fit"
        >
          <FiArrowLeft />
          Back to all providers
        </Link>

        {/* ================= HERO CARD ================= */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-50/60 via-white to-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-3xl font-extrabold text-white shadow-md">
                {provider.businessName?.charAt(0) || "P"}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-slate-900">
                    {provider.businessName}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    <FiCheckCircle />
                    Verified Partner
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                      openStatus.isOpen
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        openStatus.isOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                      }`}
                    />
                    {openStatus.text}
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-bold text-amber-600">
                    <FiStar className="fill-amber-400 text-amber-500" />
                    {Number(ratingVal).toFixed(1)} ({reviewCount} reviews)
                  </span>
                  <span>•</span>
                  <span className="font-semibold text-slate-700">
                    {provider.completedBookings || 0} Jobs Completed
                  </span>
                  {provider.serviceRadiusKm && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <FiMapPin className="text-indigo-600" />
                        {provider.serviceRadiusKm} km dispatch radius
                      </span>
                    </>
                  )}
                </div>

                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600">
                  {provider.description ||
                    "Professional certified local service specialist with proven customer excellence, transparent pricing, and fast dispatch."}
                </p>
              </div>
            </div>

            {/* Quick trust metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs font-semibold lg:w-64 shrink-0">
              <div className="flex items-center gap-2 text-slate-800">
                <FiShield className="text-indigo-600 text-base shrink-0" />
                <span>Background Verified & Insured</span>
              </div>
              <div className="flex items-center gap-2 text-slate-800">
                <FiAward className="text-amber-500 text-base shrink-0" />
                <span>100% Service Quality Guarantee</span>
              </div>
              <div className="flex items-center gap-2 text-slate-800">
                <FiDollarSign className="text-emerald-600 text-base shrink-0" />
                <span>Zero Hidden Fees • Razorpay Secure</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= MAIN CONTENT: SERVICES & COVERAGE MAP ================= */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* LEFT: SERVICES CATALOG (7 cols) */}
          <div className="space-y-6 lg:col-span-7">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Available Services & Packages
                </h2>
                <p className="text-xs text-slate-500">
                  Choose a service to configure your booking and schedule a time slot.
                </p>
              </div>

              {/* Live search input */}
              <div className="relative w-full sm:w-56">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="text"
                  placeholder="Filter services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Category tabs if multiple */}
            {categories.length > 2 && (
              <div className="flex flex-wrap gap-1.5 pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition capitalize ${
                      selectedCategory === cat
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat === "all" ? "All Services" : cat}
                  </button>
                ))}
              </div>
            )}

            {filteredServices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                <p className="text-xs text-slate-500">
                  {services.length === 0
                    ? "This provider currently has no active service listings available for direct booking."
                    : "No services match your search filter."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredServices.map((service) => (
                  <div
                    key={service._id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-indigo-300 hover:shadow-md sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">
                          {service.title}
                        </h3>
                        {service.category?.name && (
                          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                            {service.category.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {service.description}
                      </p>
                      <div className="flex items-center gap-3 pt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium">
                          <FiClock className="text-indigo-600" />
                          {service.duration} mins
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-medium text-emerald-700">
                          <FiThumbsUp /> Instant Confirmation
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
                      <div className="text-left sm:text-right">
                        <span className="text-xs text-slate-400 block font-normal">Starting at</span>
                        <span className="text-2xl font-extrabold text-slate-900">
                          ₹{service.price}
                        </span>
                      </div>
                      <Link
                        to={`/book/${service._id}`}
                        className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 text-center"
                      >
                        Book Service
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* REVIEWS & RATING BREAKDOWN SECTION */}
            <div className="mt-10 border-t border-slate-200 pt-8">
              <h2 className="text-lg font-bold text-slate-900 mb-6">
                Customer Ratings & Feedback
              </h2>

              <div className="mb-6 grid grid-cols-1 md:grid-cols-12 gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                {/* Overall Score */}
                <div className="md:col-span-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4 text-center">
                  <span className="text-5xl font-extrabold text-slate-900">
                    {Number(ratingVal).toFixed(1)}
                  </span>
                  <div className="mt-2 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <FiStar
                        key={s}
                        className={`text-base ${
                          s <= Math.round(ratingVal)
                            ? "fill-amber-400 text-amber-500"
                            : "text-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="mt-1 text-xs text-slate-500 font-medium">
                    Based on {reviewCount} verified ratings
                  </span>
                </div>

                {/* Rating Distribution Bars */}
                <div className="md:col-span-8 space-y-1.5">
                  {ratingDistribution.map(({ stars, count, pct }) => (
                    <div key={stars} className="flex items-center gap-2 text-xs">
                      <span className="w-12 font-medium text-slate-600">
                        {stars} stars
                      </span>
                      <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-slate-400 font-semibold">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Cards */}
              {reviews.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                  No written reviews yet for this provider. Be the first to leave feedback after your service!
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div
                      key={r._id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 text-xs shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                            {r.user?.fullName?.charAt(0) || "U"}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {r.user?.fullName || "Verified Customer"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {r.createdAt
                                ? new Date(r.createdAt).toLocaleDateString()
                                : "Recent booking"}
                            </span>
                          </div>
                        </div>
                        <span className="flex items-center gap-1 font-bold text-amber-500">
                          <FiStar className="fill-amber-400" />
                          {r.rating}/5
                        </span>
                      </div>
                      <p className="mt-3 text-slate-600 leading-relaxed">
                        {r.comment || "Service was completed as requested."}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: SERVICE AREA MAP & OPERATING HOURS (5 cols) */}
          <div className="space-y-6 lg:col-span-5">
            {/* SERVICE AREA MAP */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-1">
                Service Dispatch Boundary
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Radius circle displays the provider&apos;s active {provider.serviceRadiusKm || 10} km dispatch perimeter.
              </p>

              {hasCoords ? (
                <div className="h-64 overflow-hidden rounded-xl border border-slate-100">
                  <ServiceMap
                    center={[coords[1], coords[0]]}
                    zoom={12}
                    providers={[provider]}
                    userLocation={{
                      latitude: coords[1],
                      longitude: coords[0],
                      radiusKm: provider.serviceRadiusKm || 10,
                    }}
                    interactive={false}
                    className="h-full w-full"
                  />
                </div>
              ) : (
                <div className="flex h-44 items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-400">
                  Service area coordinates not specified
                </div>
              )}
            </div>

            {/* OPERATING HOURS */}
            {provider.availability && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <FiCalendar className="text-indigo-600" /> Operating Schedule
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      openStatus.isOpen
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {openStatus.isOpen ? "Open Today" : "Closed Today"}
                  </span>
                </div>
                <div className="space-y-2 text-xs divide-y divide-slate-50">
                  {Object.entries(provider.availability).map(([day, schedule]) => (
                    <div
                      key={day}
                      className="flex items-center justify-between pt-2 first:pt-0"
                    >
                      <span className="capitalize font-semibold text-slate-700">
                        {day}
                      </span>
                      <span
                        className={
                          schedule?.isAvailable
                            ? "text-emerald-700 font-semibold"
                            : "text-slate-400 font-normal"
                        }
                      >
                        {schedule?.isAvailable
                          ? `${schedule.startTime} - ${schedule.endTime}`
                          : "Closed"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </UserPageShell>
  );
}
