import { apiGet, apiPost, apiPatch, type Paginated, unwrap } from '../api';

// ── Types ────────────────────────────────────────────────────────────

export interface ApiUser {
  id?: number;
  username: string;
  name: string;
  email?: string;
  url: string;
}

export type ApiUserListItem = Omit<ApiUser, 'id'> & { id: number };

function stableNegativeId(seed: string): number {
  // Hash simple (djb2) → int32 signé, puis forcé négatif.
  let hash = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }
  const int32 = hash | 0;
  const negative = -Math.abs(int32 || 1);
  return negative;
}

function extractUserId(url: string): number | null {
  const match = url.match(/\/users\/(\d+)\/?$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface ApiUserDetail {
  id: number;
  username: string;
  name: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
}

export interface ApiUserProfile {
  id: string;
  user: number;
  username: string;
  phone: string;
  avatar: string | null;
  bio: string;
  preferred_language: string;
}

export interface ApiRole {
  id: string;
  code: string;
  name: string;
  description: string;
}

export interface ApiUserRole {
  id: string;
  user: number;
  username: string;
  role: string;
  role_name: string;
  scope: 'global' | 'pole' | 'company';
  pole: string | null;
  company: string | null;
}

export interface CreateUserRolePayload {
  user: number;
  role: string;
  scope?: 'global' | 'pole' | 'company';
  pole?: string;
  company?: string;
}

// ── Appels API ───────────────────────────────────────────────────────

export const fetchUsers = async (
  params?: Record<string, string | undefined>
): Promise<ApiUserListItem[]> => {
  const users = unwrap(await apiGet<Paginated<ApiUser> | ApiUser[]>('/users/', params));
  return users
    .map((user) => {
      const id = typeof user.id === 'number' ? user.id : extractUserId(user.url);
      if (id) return { ...user, id };

      // Certains backends utilisent un lookup par username (pas d'ID numérique dans l'URL).
      // On conserve l'entrée pour l'affichage avec un id synthétique (négatif).
      const seed = user.url || user.username || JSON.stringify(user);
      return { ...user, id: stableNegativeId(seed) };
    })
    .filter((u): u is ApiUserListItem => u !== null);
};

export const fetchMe = () =>
  apiGet<ApiUserDetail>('/users/me/');

export const fetchProfiles = async (params?: Record<string, string | undefined>) =>
  unwrap(await apiGet<Paginated<ApiUserProfile> | ApiUserProfile[]>('/profiles/', params));

export const fetchProfile = (id: string) =>
  apiGet<ApiUserProfile>(`/profiles/${id}/`);

export const updateProfile = (id: string, data: Partial<ApiUserProfile>) =>
  apiPatch<ApiUserProfile>(`/profiles/${id}/`, data);

export const fetchRoles = async () =>
  unwrap(await apiGet<Paginated<ApiRole> | ApiRole[]>('/roles/'));

export const fetchUserRoles = async (params?: Record<string, string | undefined>) =>
  unwrap(await apiGet<Paginated<ApiUserRole> | ApiUserRole[]>('/user-roles/', params));

export const createUserRole = (data: CreateUserRolePayload) =>
  apiPost<ApiUserRole>('/user-roles/', data);
