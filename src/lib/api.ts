/**
 * Client HTTP partagé pour l'API SNECEA.
 * Injecte automatiquement le token d'authentification.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://backendsnecea.labdev-it.com/api';

function getToken(): string | null {
  return localStorage.getItem('snecea_token');
}

function headers(json = true): Record<string, string> {
  const h: Record<string, string> = {};
  const token = getToken();
  if (token) h['Authorization'] = `Token ${token}`;
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

export async function apiDelete(path: string): Promise<void> {
  return handle<void>(
    await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: headers(),
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
