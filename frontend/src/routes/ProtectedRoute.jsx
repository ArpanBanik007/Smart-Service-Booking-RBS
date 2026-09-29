import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, isAuthenticated, isCheckingAuth } = useSelector(
    (state) => state.auth
  );
  const location = useLocation();

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <span className="h-9 w-9 animate-spin rounded-full border-3 border-indigo-600/30 border-t-indigo-600" />
        <p className="text-sm font-medium text-slate-500">Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && (!user?.role || !allowedRoles.includes(user.role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? children : <Outlet />;
}
