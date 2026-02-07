import { apiGet, apiPost, type Paginated, unwrap } from '../api';

// ── Types ────────────────────────────────────────────────────────────

export interface ApiDelegate {
  id: string;
  user: number;
  username: string;
  company: string;
  company_name: string;
  phone: string;
  email: string;
  active: boolean;
}

export interface CreateDelegatePayload {
  user: number;
  company: string;
  phone?: string;
  email?: string;
  active?: boolean;
}

// ── Appels API ───────────────────────────────────────────────────────

export const fetchDelegates = async (params?: Record<string, string | undefined>) =>
  unwrap(await apiGet<Paginated<ApiDelegate> | ApiDelegate[]>('/delegates/', params));

export const fetchDelegate = (id: string) =>
  apiGet<ApiDelegate>(`/delegates/${id}/`);

export const createDelegate = (data: CreateDelegatePayload) =>
  apiPost<ApiDelegate>('/delegates/', data);
