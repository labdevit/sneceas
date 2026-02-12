const API_URL = import.meta.env.VITE_API_URL ?? 'http://158.220.118.172/:8000/api';

const ACCESS_TOKEN_KEY = 'cnts.accessToken';
const REFRESH_TOKEN_KEY = 'cnts.refreshToken';

export const tokenStorage = {
  getAccess(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setTokens(access: string, refresh: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export type ApiError = {
  status: number;
  data: unknown;
};

type RequestOptions = RequestInit & {
  auth?: boolean;
};

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) {
    return null;
  }

  const response = await fetch(`${API_URL}/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    tokenStorage.clear();
    return null;
  }

  const data = (await response.json()) as { access: string };
  tokenStorage.setTokens(data.access, refresh);
  return data.access;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(options.headers);

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!headers.has('Content-Type') && options.body && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.auth !== false) {
    const access = tokenStorage.getAccess();
    if (access) {
      headers.set('Authorization', `Bearer ${access}`);
    }
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 && options.auth !== false) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      headers.set('Authorization', `Bearer ${newAccess}`);
      const retry = await fetch(url, { ...options, headers });
      if (retry.ok) {
        return (await retry.json()) as T;
      }
      const retryData = await retry.json().catch(() => ({}));
      throw { status: retry.status, data: retryData } as ApiError;
    }
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw { status: response.status, data } as ApiError;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}
