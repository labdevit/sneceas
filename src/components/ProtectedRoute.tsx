import { Navigate, Outlet, useLocation, useOutletContext } from "react-router-dom";
import { useAuth, type RoleCode } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  /** If provided, only users with at least one of these role_codes can access */
  allowedRoles?: RoleCode[];
  children?: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { isAuthenticated, hasRole } = useAuth();
  const location = useLocation();
  // Forward the parent outlet context so nested pages (e.g. Cms) can still
  // call useLayoutContext() even when wrapped by a role-gated ProtectedRoute.
  const outletContext = useOutletContext();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(...allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet context={outletContext} />;
}
