import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { loginApi, type AuthResponse, type AuthUser } from "@/lib/authApi";

// ── Types ────────────────────────────────────────────────────────────
/** Role codes retournés par l'API */
export type RoleCode = string;

interface AuthState {
  token: string | null;
  user: AuthUser | null;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  /** true when a token is present */
  isAuthenticated: boolean;
  /** Call the backend, store token + user, return response */
  login: (username: string, password: string) => Promise<AuthResponse>;
  /** Clear session */
  logout: () => void;
  /** Check if current user has one of the allowed role_codes */
  hasRole: (...roleCodes: RoleCode[]) => boolean;
  /** Convenience: primary role_code (first in list) */
  primaryRole: string | null;
}

// ── Storage keys ─────────────────────────────────────────────────────
const TOKEN_KEY = "snecea_token";
const USER_KEY = "snecea_user";

// ── Helpers ──────────────────────────────────────────────────────────
function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

// ── Context ──────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider ─────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => ({
    token: localStorage.getItem(TOKEN_KEY),
    user: loadUser(),
  }));

  // Keep localStorage in sync
  useEffect(() => {
    if (auth.token) {
      localStorage.setItem(TOKEN_KEY, auth.token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    if (auth.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [auth]);

  const login = useCallback(
    async (username: string, password: string): Promise<AuthResponse> => {
      const data = await loginApi(username, password);
      setAuth({ token: data.token, user: data.user });
      return data;
    },
    []
  );

  const logout = useCallback(() => {
    setAuth({ token: null, user: null });
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const hasRole = useCallback(
    (...roleCodes: RoleCode[]) => {
      if (!auth.user?.roles?.length) return false;
      // super_admin ou is_superuser a accès à tout
      if (auth.user.is_superuser) return true;
      return auth.user.roles.some((r) => roleCodes.includes(r.role_code));
    },
    [auth.user]
  );

  const primaryRole =
    auth.user?.is_superuser
      ? "super_admin"
      : auth.user?.roles?.[0]?.role_code ?? null;

  return (
    <AuthContext.Provider
      value={{
        token: auth.token,
        user: auth.user,
        isAuthenticated: !!auth.token,
        login,
        logout,
        hasRole,
        primaryRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
