import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiHome,
  FiSearch,
  FiMapPin,
  FiCalendar,
  FiBell,
  FiUser,
  FiLogOut,
  FiBriefcase,
  FiChevronDown,
  FiCompass,
  FiShield,
  FiGrid,
} from "react-icons/fi";
import { logoutUser } from "../../store/slices/authSlice.js";

const BRAND_NAME = "Near It...";
const BRAND_TAGLINE = "Service, by your side";

const NAV_LINKS = [
  { id: "home", path: "/", label: "Home", icon: FiHome },
  { id: "providers", path: "/providers", label: "Providers", icon: FiCompass },
  { id: "bookings", path: "/bookings", label: "My Bookings", icon: FiCalendar },
];

function Logo({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-2 focus:outline-none"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white shadow-sm">
        {BRAND_NAME.charAt(0)}
      </span>
      <span className="flex flex-col items-start leading-none">
        <span className="text-xl font-extrabold tracking-tight text-slate-900">
          {BRAND_NAME}
        </span>
        <span className="mt-0.5 hidden text-[10px] font-medium text-slate-500 lg:block">
          {BRAND_TAGLINE}
        </span>
      </span>
    </button>
  );
}

function Avatar({ user, size = "h-9 w-9" }) {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.fullName}
        className={`${size} rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      className={`${size} flex items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700`}
    >
      {user?.fullName?.charAt(0)?.toUpperCase() || <FiUser />}
    </span>
  );
}

function SearchBox({ placeholder, value, onChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="relative w-full">
      <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
      />
    </form>
  );
}

function ProfileMenu({ user, onNavigate, onLogout, className = "" }) {
  const items = [
    { label: "My Profile", path: "/profile", icon: FiUser },
    { label: "My Addresses", path: "/addresses", icon: FiMapPin },
    { label: "My Bookings", path: "/bookings", icon: FiCalendar },
  ];

  if (user?.role === "admin") {
    items.unshift({
      label: "Admin Dashboard",
      path: "/admin/dashboard",
      icon: FiShield,
    });
  } else if (user?.role === "provider") {
    items.unshift({
      label: "Provider Dashboard",
      path: "/provider/dashboard",
      icon: FiGrid,
    });
  } else {
    items.push({
      label: "Become a Provider",
      path: "/become-provider",
      icon: FiBriefcase,
    });
  }

  return (
    <div
      className={`z-[1001] w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ${className}`}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        <Avatar user={user} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{user?.fullName || "User"}</p>
          <p className="truncate text-xs text-slate-500">{user?.email}</p>
        </div>
      </div>
      <div className="my-1 h-px bg-slate-100" />
      {items.map(({ label, path, icon: Icon }) => (
        <button
          key={path}
          type="button"
          onClick={() => onNavigate(path)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <Icon className="text-base" />
          {label}
        </button>
      ))}
      <div className="my-1 h-px bg-slate-100" />
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-500 transition hover:bg-red-50"
      >
        <FiLogOut className="text-base" />
        Logout
      </button>
    </div>
  );
}

function Navbar() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchText, setSearchText] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const city = "Kolkata";
  const unreadNotifications = 0;

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const handleNav = (path) => {
    setShowProfileMenu(false);
    navigate(path);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchText.trim();
    if (!q) return;
    navigate(`/providers?search=${encodeURIComponent(q)}`);
  };

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await dispatch(logoutUser());
    navigate("/login");
  };

  const handleLocationClick = () => {
    navigate("/providers");
  };

  const bellBadge =
    unreadNotifications > 0 ? (
      <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[10px] font-bold text-white">
        {unreadNotifications > 9 ? "9+" : unreadNotifications}
      </span>
    ) : null;

  return (
    <>
      {/* ================= DESKTOP NAVBAR ================= */}
      <nav className="sticky top-0 z-50 hidden h-16 w-full items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-5 backdrop-blur md:flex">
        <Logo onClick={() => handleNav("/")} />

        {/* Location chip */}
        <button
          type="button"
          onClick={handleLocationClick}
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 lg:flex"
        >
          <FiMapPin className="text-indigo-600" />
          {city}
          <FiChevronDown className="text-slate-400" />
        </button>

        {/* Search */}
        <div className="max-w-md flex-1">
          <SearchBox
            placeholder="Search plumber, electrician, cleaning..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSubmit={handleSearch}
          />
        </div>

        {/* Links + actions */}
        <div className="flex shrink-0 items-center gap-1">
          {NAV_LINKS.filter((l) => l.id !== "home" && (isAuthenticated || l.id !== "bookings")).map(
            ({ id, path, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleNav(path)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive(path)
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            )
          )}

          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => handleNav("/notifications")}
                title="Notifications"
                className={`relative ml-1 flex h-10 w-10 items-center justify-center rounded-lg text-xl transition ${
                  isActive("/notifications")
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <FiBell />
                {bellBadge}
              </button>

              <div className="mx-2 h-6 w-px bg-slate-200" />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProfileMenu((p) => !p)}
                  className={`flex items-center gap-1 rounded-full border-2 p-0.5 transition ${
                    showProfileMenu || isActive("/profile")
                      ? "border-indigo-500"
                      : "border-transparent hover:border-slate-200"
                  }`}
                >
                  <Avatar user={user} />
                </button>

                {showProfileMenu && (
                  <>
                    <button
                      type="button"
                      aria-label="Close profile menu"
                      className="fixed inset-0 z-[1000] cursor-default"
                      onClick={() => setShowProfileMenu(false)}
                    />
                    <ProfileMenu
                      user={user}
                      onNavigate={handleNav}
                      onLogout={handleLogout}
                      className="absolute right-0 top-[calc(100%+10px)]"
                    />
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="ml-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleNav("/login")}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => handleNav("/register")}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ================= MOBILE TOP BAR ================= */}
      <div className="sticky top-0 z-50 flex w-full flex-col border-b border-slate-200 bg-white md:hidden">
        <div className="flex items-center justify-between px-4 pb-1.5 pt-2.5">
          <Logo onClick={() => handleNav("/")} />

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleLocationClick}
              className="flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700"
            >
              <FiMapPin className="text-indigo-600" />
              {city}
            </button>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => handleNav("/notifications")}
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-xl text-slate-700 active:bg-slate-100"
              >
                <FiBell />
                {bellBadge}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleNav("/login")}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Login
              </button>
            )}
          </div>
        </div>

        <div className="px-4 pb-2.5">
          <SearchBox
            placeholder="Search services..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSubmit={handleSearch}
          />
        </div>
      </div>

      {/* ================= MOBILE BOTTOM NAV ================= */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-14 items-center justify-around border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {[
          { path: "/", icon: FiHome, label: "Home" },
          { path: "/providers", icon: FiCompass, label: "Explore" },
          { path: "/bookings", icon: FiCalendar, label: "Bookings" },
          { path: "/notifications", icon: FiBell, label: "Alerts" },
        ].map(({ path, icon: Icon, label }) => (
          <button
            key={path}
            type="button"
            onClick={() => handleNav(path)}
            className={`flex h-full flex-1 flex-col items-center justify-center gap-0.5 transition ${
              isActive(path) ? "text-indigo-600" : "text-slate-500"
            }`}
          >
            <Icon className="text-[22px]" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}

        <button
          type="button"
          onClick={() =>
            isAuthenticated ? setShowProfileMenu((p) => !p) : handleNav("/login")
          }
          className={`flex h-full flex-1 flex-col items-center justify-center gap-0.5 transition ${
            showProfileMenu || isActive("/profile") ? "text-indigo-600" : "text-slate-500"
          }`}
        >
          {isAuthenticated ? <Avatar user={user} size="h-6 w-6" /> : <FiUser className="text-[22px]" />}
          <span className="text-[10px] font-medium">{isAuthenticated ? "Profile" : "Login"}</span>
        </button>

        {showProfileMenu && isAuthenticated && (
          <>
            <button
              type="button"
              aria-label="Close profile menu"
              className="fixed inset-0 z-[1000] cursor-default"
              onClick={() => setShowProfileMenu(false)}
            />
            <ProfileMenu
              user={user}
              onNavigate={handleNav}
              onLogout={handleLogout}
              className="fixed bottom-16 right-2"
            />
          </>
        )}
      </nav>
    </>
  );
}

export default Navbar;