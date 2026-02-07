const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://158.220.118.172:8800/api";

// ── Types correspondant au vrai retour de l'API ──────────────────────
export interface ApiRole {
  role_code: string;
  role_name: string;
  scope: string;
  pole_name: string | null;
  company_name: string | null;
}

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
  roles: ApiRole[];
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface AuthError {
  detail?: string;
  non_field_errors?: string[];
  username?: string[];
  password?: string[];
}

/**
 * POST /api/auth-token/
 * Body: { username, password }
 * Le backend accepte un email ou un username dans le champ "username".
 * Response: { token, user: { id, username, name, email, is_staff, is_superuser, roles: [...] } }
 */
export async function loginApi(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth-token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: email, password }),
  });

  if (!response.ok) {
    const error: AuthError = await response.json().catch(() => ({}));
    throw new Error(
      error.non_field_errors?.[0] ||
        error.detail ||
        error.username?.[0] ||
        error.password?.[0] ||
        "Identifiants incorrects."
    );
  }

  return response.json();
}
