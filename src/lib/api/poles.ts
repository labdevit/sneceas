import { apiGet, apiPost, apiPut, apiDelete, type Paginated, unwrap } from '../api';

// ── Types ────────────────────────────────────────────────────────────

export interface ApiPoleMember {
  id: string;
  pole: string;
  pole_name: string;
  user: number;
  username: string;
  function: string;
}

export interface ApiPole {
  id: string;
  name: string;
  description: string;
  manager: number | null;
  manager_name: string | null;
  active: boolean;
  members: ApiPoleMember[];
}

export interface CreatePolePayload {
  name: string;
  description?: string;
  manager?: number;
  active?: boolean;
}

export interface CreatePoleMemberPayload {
  pole: string;
  user: number;
  function?: string;
}

// ── Appels API ───────────────────────────────────────────────────────

export const fetchPoles = async (params?: Record<string, string | undefined>) =>
  unwrap(await apiGet<Paginated<ApiPole> | ApiPole[]>('/poles/', params));

export const fetchPole = (id: string) =>
  apiGet<ApiPole>(`/poles/${id}/`);

export const createPole = (data: CreatePolePayload) =>
  apiPost<ApiPole>('/poles/', data);

export const updatePole = (id: string, data: Partial<CreatePolePayload>) =>
  apiPut<ApiPole>(`/poles/${id}/`, data);

export const deletePole = (id: string) =>
  apiDelete(`/poles/${id}/`);

// ── Membres ──────────────────────────────────────────────────────────

export const fetchPoleMembers = async (params?: Record<string, string | undefined>) =>
  unwrap(await apiGet<Paginated<ApiPoleMember> | ApiPoleMember[]>('/pole-members/', params));

export const addPoleMember = (data: CreatePoleMemberPayload) =>
  apiPost<ApiPoleMember>('/pole-members/', data);

export const removePoleMember = (id: string) =>
  apiDelete(`/pole-members/${id}/`);
