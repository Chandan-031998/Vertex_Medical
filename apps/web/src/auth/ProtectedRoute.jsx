import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider.jsx";

export default function ProtectedRoute({ children, requirePerms = [] }) {
  const auth = useAuth();
  if (!auth?.access_token) return <Navigate to="/login" replace />;
  if (requirePerms.length > 0 && !auth.canAny(requirePerms)) return <Navigate to="/" replace />;
  return children;
}
