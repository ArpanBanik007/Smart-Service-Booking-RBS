import { Link } from "react-router-dom";

const BRAND_NAME = "Near It...";
const BRAND_TAGLINE = "Service, by your side";

function AuthLayout({ title, subtitle, error, success, children, footer }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white px-4 py-10">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white shadow-sm">
            {BRAND_NAME.charAt(0)}
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">
              {BRAND_NAME}
            </span>
            <span className="mt-0.5 text-[10px] font-medium text-slate-500">
              {BRAND_TAGLINE}
            </span>
          </span>
        </Link>

        {/* Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-indigo-100/50 sm:p-8">
          <h1 className="text-center text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-center text-sm text-slate-500">{subtitle}</p>
          )}

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-center text-sm font-medium text-rose-600"
            >
              {error}
            </div>
          )}
          {success && (
            <div
              role="status"
              className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center text-sm font-medium text-emerald-600"
            >
              {success}
            </div>
          )}

          <div className="mt-6">{children}</div>
        </div>

        {footer && <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>}
      </div>
    </div>
  );
}

export default AuthLayout;