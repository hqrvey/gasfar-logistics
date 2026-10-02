import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ROUTES } from "./paths.js";

export default function ProtectedAdminRoute() {
  const { loggedIn, role } = useAuth();
  const location = useLocation();

  if (!loggedIn || role !== "admin") {
    // Remember the requested admin page so the shared login can return here.
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
