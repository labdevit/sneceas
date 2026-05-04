/**
 * Client HTTP partagé pour l'API SNECEA.
 * Injecte automatiquement le token d'authentification.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://backendsnecea.labdev-it.com/api';

const AUTH_SCHEME = import.meta.env.VITE_AUTH_SCHEME ?? 'Token';

function getToken(): string | null {
  return localStorage.getItem('snecea_token');
}

function headers(json = true): Record<string, string> {
  const h: Record<string, string> = {};
  const token = getToken();
  if (token) h['Authorization'] = `${AUTH_SCHEME} ${token}`;
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

// ── Types génériques ─────────────────────────────────────────────────

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;

  constructor(status: number, body: Record<string, unknown>) {
    const message =
      (body.detail as string) ??
      (body.non_field_errors as string[])?.[0] ??
      `Erreur ${status}`;
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

// ── Helpers internes ─────────────────────────────────────────────────

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/**
 * Extrait le tableau de résultats, que la réponse soit paginée ou non.
 */
export function unwrap<T>(data: Paginated<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}

// ── Méthodes HTTP ────────────────────────────────────────────────────

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    });
  }
  return handle<T>(await fetch(url.toString(), { headers: headers() }));
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return handle<T>(
    await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return handle<T>(
    await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(body),
    }),
  );
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return handle<T>(
    await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(body),
    }),
  );
}

/** PATCH multipart (upload de fichiers) */
export async function apiPatchForm<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  return handle<T>(
    await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      headers: headers(false),
      body: formData,
    }),
  );
}

export async function apiDelete(path: string): Promise<void> {
  return handle<void>(
    await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: headers(),
    }),
  );
}

/** POST sans authentification (endpoints publics comme register) */
export async function apiPostPublic<T>(path: string, body?: unknown): Promise<T> {
  return handle<T>(
    await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
}

/** Upload multipart (fichiers) */
export async function apiPostForm<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  return handle<T>(
    await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: headers(false), // pas de Content-Type — le navigateur met le boundary
      body: formData,
    }),
  );
}

/**
 * Resolves a file URL to a fetchable absolute URL.
 *
 * DRF serializers build absolute URLs from the incoming request, so in HTTP
 * dev environments they emit `http://host:port/api/…`. The old `ensureHttps`
 * blindly changed `http://` → `https://`, breaking plain-HTTP setups.
 *
 * This helper uses the configured API_BASE_URL as the source of truth for the
 * scheme and host:
 *   - `https://…` URLs  → unchanged
 *   - `http://…` URLs   → scheme is matched to API_BASE_URL (http stays http
 *                          when the API is on http, https when the API is https)
 *   - Relative `/…` paths → prepend the API origin
 */
export function resolveFileUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('https://')) return url;
  if (url.startsWith('http://')) {
    return API_BASE_URL.startsWith('https://')
      ? url.replace('http://', 'https://')
      : url;
  }
  // Relative path — prepend the API origin
  try {
    const origin = new URL(API_BASE_URL).origin;
    return origin + url;
  } catch {
    return url;
  }
}

/**
 * Télécharge un fichier du backend avec authentification, puis déclenche
 * le téléchargement dans le navigateur.
 * Accepte une URL absolue ou un chemin relatif (ex. `/documents/{id}/download/`).
 */
export async function authenticatedDownload(url: string, filename?: string): Promise<void> {
  const absolute = resolveFileUrl(url);
  const res = await fetch(absolute, { headers: headers(false) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename || 'document';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

/**
 * Ouvre un fichier du backend avec authentification dans un nouvel onglet (aperçu).
 */
export async function authenticatedOpen(url: string): Promise<void> {
  const absolute = resolveFileUrl(url);
  const res = await fetch(absolute, { headers: headers(false) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
}
