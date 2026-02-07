import { apiGet, apiPost, apiPut, apiDelete, type Paginated, unwrap } from '../api';

// ── Types ────────────────────────────────────────────────────────────

export interface ApiCompany {
  id: string;
  name: string;
  sector: string;
  active: boolean;
}

export interface CreateCompanyPayload {
  name: string;
  sector?: string;
  active?: boolean;
}

// ── Appels API ───────────────────────────────────────────────────────

export const fetchCompanies = async (params?: Record<string, string | undefined>) =>
  unwrap(await apiGet<Paginated<ApiCompany> | ApiCompany[]>('/companies/', params));

export const fetchCompany = (id: string) =>
  apiGet<ApiCompany>(`/companies/${id}/`);

export const createCompany = (data: CreateCompanyPayload) =>
  apiPost<ApiCompany>('/companies/', data);

export const updateCompany = (id: string, data: Partial<CreateCompanyPayload>) =>
  apiPut<ApiCompany>(`/companies/${id}/`, data);

export const deleteCompany = (id: string) =>
  apiDelete(`/companies/${id}/`);
