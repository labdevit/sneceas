import { apiGet, apiPost, type Paginated, unwrap } from '../api';

// ── Types ────────────────────────────────────────────────────────────

export interface ApiSetting {
  id: string;
  key: string;
  value: string;
  scope: string;
  pole: string | null;
  company: string | null;
}

export interface CreateSettingPayload {
  key: string;
  value: string;
  scope?: string;
  pole?: string;
  company?: string;
}

// ── Appels API ───────────────────────────────────────────────────────

export const fetchSettings = async (params?: Record<string, string | undefined>) =>
  unwrap(await apiGet<Paginated<ApiSetting> | ApiSetting[]>('/settings/', params));

export const createSetting = (data: CreateSettingPayload) =>
  apiPost<ApiSetting>('/settings/', data);
