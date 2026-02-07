const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://backendsnecea.labdev-it.com/api";

export interface AuthResponse {
  token: string;
  role: string;
}

export interface AuthError {
  detail?: string;
  non_field_errors?: string[];
}

/**
 * POST /api/auth-token/
 * Body: { username, password }
 * Response: { token, role }
 */
export async function loginApi(
  username: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth-token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error: AuthError = await response.json().catch(() => ({}));
    throw new Error(
      error.non_field_errors?.[0] ||
        error.detail ||
        "Identifiants incorrects."
    );
  }

  return response.json();
}
