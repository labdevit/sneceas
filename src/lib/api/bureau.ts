import { apiGet, apiPost, apiPut, apiPatch, apiDelete, type Paginated, unwrap } from '../api';

export interface ApiBureauMember {
  id: string;
  bureau: string;
  bureau_name: string;
  user: number;
  username: string;
  function: string;
}

export interface ApiBureau {
  id: string;
  name: string;
  date_creation: string;
  secretaire_general: number | null;
  sg_name: string;
  description: string;
  active: boolean;
  members: ApiBureauMember[];
}

export interface CreateBureauPayload {
  name: string;
  date_creation: string;
  secretaire_general?: number | null;
  description?: string;
  active?: boolean;
}

export interface CreateBureauMemberPayload {
  bureau: string;
  user: number;
  function?: string;
}

export const fetchBureaux = async (params?: Record<string, string | undefined>) =>
  unwrap(await apiGet<Paginated<ApiBureau> | ApiBureau[]>('/bureaux/', params));

export const createBureau = (data: CreateBureauPayload) =>
  apiPost<ApiBureau>('/bureaux/', data);

export const updateBureau = (id: string, data: Partial<CreateBureauPayload>) =>
  apiPatch<ApiBureau>(`/bureaux/${id}/`, data);

export const deleteBureau = (id: string) =>
  apiDelete(`/bureaux/${id}/`);

export const addBureauMember = (data: CreateBureauMemberPayload) =>
  apiPost<ApiBureauMember>('/bureau-members/', data);

export const removeBureauMember = (id: string) =>
  apiDelete(`/bureau-members/${id}/`);
