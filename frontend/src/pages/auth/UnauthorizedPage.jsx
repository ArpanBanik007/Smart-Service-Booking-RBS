import { Link, useNavigate } from "react-router-dom";
import { FiShieldOff, FiArrowLeft, FiHome, FiLogOut } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../../store/slices/authSlice.js";

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/login");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white px-4 py-12">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-rose-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-indigo-100/50">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-3xl text-rose-600">
          <FiShieldOff />
        </div>

        <span className="mt-4 inline-block rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
          403 Access Denied
        </span>

        <h1 className="mt-3 text-2xl font-extrabold text-slate-900">
          Permission Restricted
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          You don&apos;t have authorization to view this section.
          {user?.role && (
            <span className="mt-1 block font-medium text-slate-700">
              Current account role: <span className="font-bold uppercase text-indigo-600">{user.role}</span>
            </span>
          )}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]"
          >
            <FiArrowLeft />
            Go Back
          </button>

          <Link
            to="/"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <FiHome />
            Return to Homepage
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
          >
            <FiLogOut />
            Switch Account
          </button>
        </div>
      </div>
    </div>
  );
}
