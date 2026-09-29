import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

const getHomeByRole = (role) => {
  if (role === "admin") return "/admin/dashboard";
  if (role === "provider") return "/provider/dashboard";
  return "/";
};

export default function GuestRoute({ children }) {
  const { user, isAuthenticated, isCheckingAuth } = useSelector(
    (state) => state.auth
  );

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <span className="h-9 w-9 animate-spin rounded-full border-3 border-indigo-600/30 border-t-indigo-600" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to={getHomeByRole(user.role)} replace />;
  }

  return children ? children : <Outlet />;
}
