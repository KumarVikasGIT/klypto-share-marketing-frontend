import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated, getUser } from "./protected";

export function ProtectedRoute() {
  const user = getUser();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet context={{ user }} />;
}