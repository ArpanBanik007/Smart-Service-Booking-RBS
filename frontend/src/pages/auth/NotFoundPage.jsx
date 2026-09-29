import { Link, useNavigate } from "react-router-dom";
import { FiAlertCircle, FiArrowLeft, FiHome, FiSearch } from "react-icons/fi";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white px-4 py-12">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-indigo-100/50">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl text-indigo-600">
          <FiAlertCircle />
        </div>

        <span className="mt-4 inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
          404 Page Not Found
        </span>

        <h1 className="mt-3 text-2xl font-extrabold text-slate-900">
          Lost in the marketplace?
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          The page you are looking for might have been moved, deleted, or does not exist.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            to="/"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]"
          >
            <FiHome />
            Back to Homepage
          </Link>

          <Link
            to="/providers"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <FiSearch />
            Browse Services
          </Link>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium text-slate-500 transition hover:text-slate-900"
          >
            <FiArrowLeft />
            Previous Page
          </button>
        </div>
      </div>
    </div>
  );
}
