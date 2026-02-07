import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, type RoleCode } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  /** If provided, only users with at least one of these role_codes can access */
  allowedRoles?: RoleCode[];
  children?: React.ReactNode;
}

/**
 * Wraps routes that require authentication.
 * Optionally restricts to specific role_codes (ACL).
 *
 * Usage in App.tsx:
 *   <Route element={<ProtectedRoute />}>                             ← any authenticated user
 *   <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>    ← admin only
 *   <Route element={<ProtectedRoute allowedRoles={["delegate", "admin"]} />}> ← multiple roles
 */
export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  // Not logged in → redirect to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but wrong role → redirect to home (or a 403 page)
  if (allowedRoles && allowedRoles.length > 0 && !hasRole(...allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
