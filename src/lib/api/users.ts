import { apiGet, apiPost, apiPostPublic, apiPostForm, apiPatch, apiPatchForm, apiDelete, type Paginated, unwrap } from '../api';

// ── Types ────────────────────────────────────────────────────────────

export interface ApiUser {
  id?: number;
  username: string;
  name: string;
  email?: string;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
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

export type UpdateUserPayload = Partial<Pick<ApiUser, 'name' | 'email' | 'is_active' | 'is_staff' | 'is_superuser'>>;

export interface ApiUserProfile {
  id: string;
  user: number;
  username: string;
  phone: string;
  avatar: string | null;
  bio: string;
  preferred_language: string;

  // Champs étendus (alignés sur backend syndic)
  first_name: string;
  last_name: string;
  birth_date: string | null;
  birth_place: string;
  gender: string;
  nationality: string;
  id_number: string;
  residential_address: string;

  job_title: string;
  department: string;
  contract_type: string;
  hire_date: string | null;
  employee_id: string;
  workplace: string;

  first_membership: boolean;
  previous_union: boolean;
  previous_union_name: string;
  membership_motivation: string;
  accepted_rules: boolean;
  consent_data: boolean;
  membership_date: string | null;

  signature: string | null;
  id_document: string | null;
  work_contract: string | null;
  id_photo: string | null;
  last_payslip: string | null;
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

export const updateUser = (username: string, data: UpdateUserPayload) =>
  apiPatch<ApiUser>(`/users/${encodeURIComponent(username)}/`, data);

export const fetchProfiles = async (params?: Record<string, string | undefined>) =>
  unwrap(await apiGet<Paginated<ApiUserProfile> | ApiUserProfile[]>('/profiles/', params));

export const fetchMyProfile = () =>
  apiGet<ApiUserProfile>('/profiles/me/');

export const updateMyProfileForm = (formData: FormData) =>
  apiPatchForm<ApiUserProfile>('/profiles/me/', formData);

export const fetchProfile = (id: string) =>
  apiGet<ApiUserProfile>(`/profiles/${id}/`);

export const updateProfile = (id: string, data: Partial<ApiUserProfile>) =>
  apiPatch<ApiUserProfile>(`/profiles/${id}/`, data);

export const updateProfileForm = (id: string, formData: FormData) =>
  apiPatchForm<ApiUserProfile>(`/profiles/${id}/`, formData);

// ── Registration (public, no auth) ───────────────────────────────────

export interface RegisterPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  company?: string;
}

export const registerUser = (data: RegisterPayload) =>
  apiPostPublic<{ detail: string; username: string }>('/auth/register/', data);

// ── Password reset (public, no auth) ────────────────────────────────

export const requestPasswordReset = (email: string) =>
  apiPostPublic<{ detail: string }>('/auth/password-reset/', { email });

export const confirmPasswordReset = (uid: string, token: string, new_password: string) =>
  apiPostPublic<{ detail: string }>('/auth/password-reset-confirm/', { uid, token, new_password });

// ── Admin: set password for a profile's user ─────────────────────────

export const setPassword = (profileId: string, newPassword: string) =>
  apiPost<{ detail: string }>(`/profiles/${profileId}/set-password/`, { new_password: newPassword });

// ── Admin: create user + profile in one shot ─────────────────────────

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  is_active?: boolean;
  company?: string;
}

export const createUserFromAdmin = (data: CreateUserPayload) =>
  apiPost<ApiUserProfile>('/profiles/create-user/', data);

export const createProfile = (data: Partial<ApiUserProfile> & { user: number }) =>
  apiPost<ApiUserProfile>('/profiles/', data);

export const createProfileForm = (formData: FormData) =>
  apiPostForm<ApiUserProfile>('/profiles/', formData);

export const fetchRoles = async () =>
  unwrap(await apiGet<Paginated<ApiRole> | ApiRole[]>('/roles/'));

export const fetchUserRoles = async (params?: Record<string, string | undefined>) =>
  unwrap(await apiGet<Paginated<ApiUserRole> | ApiUserRole[]>('/user-roles/', params));

export const createUserRole = (data: CreateUserRolePayload) =>
  apiPost<ApiUserRole>('/user-roles/', data);

export const deleteUserRole = (id: string) =>
  apiDelete(`/user-roles/${id}/`);
