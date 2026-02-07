import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { loginApi, type AuthResponse } from "@/lib/authApi";

// ── Types ────────────────────────────────────────────────────────────
export type UserRole =
  | "admin"
  | "delegue"
  | "adherent"
  | "secretaire"
  | string;

interface AuthState {
  token: string | null;
  role: UserRole | null;
}

interface AuthContextValue extends AuthState {
  /** true when a token is present */
  isAuthenticated: boolean;
  /** Call the backend, store token + role, return role */
  login: (username: string, password: string) => Promise<AuthResponse>;
  /** Clear session */
  logout: () => void;
  /** Check if current user has one of the allowed roles */
  hasRole: (...roles: UserRole[]) => boolean;
}

// ── Storage keys ─────────────────────────────────────────────────────
const TOKEN_KEY = "snecea_token";
const ROLE_KEY = "snecea_role";

// ── Context ──────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider ─────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => ({
    token: localStorage.getItem(TOKEN_KEY),
    role: localStorage.getItem(ROLE_KEY) as UserRole | null,
  }));

  // Keep localStorage in sync
  useEffect(() => {
    if (auth.token) {
      localStorage.setItem(TOKEN_KEY, auth.token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    if (auth.role) {
      localStorage.setItem(ROLE_KEY, auth.role);
    } else {
      localStorage.removeItem(ROLE_KEY);
    }
  }, [auth]);

  const login = useCallback(
    async (username: string, password: string): Promise<AuthResponse> => {
      const data = await loginApi(username, password);
      setAuth({ token: data.token, role: data.role });
      return data;
    },
    []
  );

  const logout = useCallback(() => {
    setAuth({ token: null, role: null });
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!auth.role) return false;
      return roles.includes(auth.role);
    },
    [auth.role]
  );

  return (
    <AuthContext.Provider
      value={{
        token: auth.token,
        role: auth.role,
        isAuthenticated: !!auth.token,
        login,
        logout,
        hasRole,
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
