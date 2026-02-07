import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, type UserRole } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  /** If provided, only these roles can access the children routes */
  allowedRoles?: UserRole[];
  children?: React.ReactNode;
}

/**
 * Wraps routes that require authentication.
 * Optionally restricts to specific roles (ACL).
 *
 * Usage in App.tsx:
 *   <Route element={<ProtectedRoute />}>          ← any authenticated user
 *   <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>  ← admin only
 */
export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  // Not logged in → redirect to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but wrong role → redirect to home (or a 403 page)
  if (allowedRoles && allowedRoles.length > 0 && role && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
