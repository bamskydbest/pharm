import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
// import React, { ReactNode } from "react";


export default function RequireRole({
  role,
  children,
}: {
  role: string;
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to="/login" />;
  if (user.role !== role) return <Navigate to="/unauthorized" />;

  return <>{children}</>;
}

