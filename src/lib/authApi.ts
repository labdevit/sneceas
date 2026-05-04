const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://backendsnecea.labdev-it.com/api";

const LOGIN_PATH = import.meta.env.VITE_LOGIN_PATH ?? "/auth/login/";

function buildRoleName(roleCode: string | null | undefined): string {
  switch (roleCode) {
    case "super_admin":
      return "Super Admin";
    case "admin":
      return "Administrateur";
    case "delegate":
      return "Délégué syndical";
    case "member":
      return "Adhérent";
    case "comptable":
      return "Comptable";
    default:
      return roleCode || "Utilisateur";
  }
}

// ── Types correspondant au vrai retour de l'API ──────────────────────
export interface ApiRole {
  role_code: string;
  role_name: string;
  scope: string;
  pole_id: string | null;
  pole_name: string | null;
  company_id: string | null;
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
  refresh?: string;
}

export interface AuthError {
  detail?: string;
  non_field_errors?: string[];
  username?: string[];
  password?: string[];
}

interface JwtLoginResponse {
  access: string;
  refresh: string;
}

interface LegacyLoginResponse {
  token: string;
  user: AuthUser;
}

interface ProfileMeResponse {
  user_id_read?: number;
  username?: string;
  user_email?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  nom?: string;
  prenom?: string;
  role?: string;
  is_active?: boolean;
}

function isLegacyLoginResponse(value: unknown): value is LegacyLoginResponse {
  return Boolean(
    value &&
      typeof value === "object" &&
      "token" in value &&
      "user" in value
  );
}

function isJwtLoginResponse(value: unknown): value is JwtLoginResponse {
  return Boolean(
    value &&
      typeof value === "object" &&
      "access" in value &&
      "refresh" in value
  );
}

function mapProfileToAuthUser(profile: ProfileMeResponse): AuthUser {
  const roleCode = profile.role || "member";
  const first = profile.prenom || profile.first_name || "";
  const last = profile.nom || profile.last_name || "";
  const name = `${first} ${last}`.trim() || profile.username || "";

  return {
    id: profile.user_id_read ?? 0,
    username: profile.username || "",
    name,
    email: profile.user_email || profile.email || "",
    is_staff: roleCode === "admin" || roleCode === "super_admin",
    is_superuser: roleCode === "super_admin",
    roles: [
      {
        role_code: roleCode,
        role_name: buildRoleName(roleCode),
        scope: "global",
        pole_name: null,
        company_name: null,
      },
    ],
  };
}

/**
 * POST login endpoint
 * Body: { username, password }
 * Supporte soit l'ancien contrat { token, user }, soit le JWT { access, refresh }
 * puis enrichit avec GET /profils/me/.
 */
export async function loginApi(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${LOGIN_PATH}`, {
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

  const data: unknown = await response.json();

  if (isLegacyLoginResponse(data)) {
    return data;
  }

  if (!isJwtLoginResponse(data)) {
    throw new Error("Réponse d'authentification inattendue.");
  }

  const profileResponse = await fetch(`${API_BASE_URL}/profils/me/`, {
    headers: {
      Authorization: `Bearer ${data.access}`,
    },
  });

  if (!profileResponse.ok) {
    throw new Error("Connexion réussie, mais profil utilisateur introuvable.");
  }

  const profile = (await profileResponse.json()) as ProfileMeResponse;

  return {
    token: data.access,
    refresh: data.refresh,
    user: mapProfileToAuthUser(profile),
  };
}
