import { apiGet, apiPost, apiPatch, apiPatchForm, apiPostForm, apiDelete, type Paginated, unwrap } from '../api';

// ── Types ────────────────────────────────────────────────────────────

export interface ApiDocument {
  id: string;
  name: string;
  doc_type: 'pv' | 'convocation' | 'cr' | 'lettre' | 'other';
  template: string;
  template_name: string;
  ticket: string | null;
  ticket_reference: string | null;
  file: string;
  file_url: string | null;
  preview_url: string | null;
  generated_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiTemplate {
  id: string;
  name: string;
  type: 'pv' | 'convocation' | 'cr' | 'lettre' | 'other';
  pole: string | null;
  content: string;
  version: number;
  active: boolean;
}

export interface CreateDocumentPayload {
  template: string;
  ticket?: string;
}

export interface ShareDocumentPayload {
  channel: 'email' | 'whatsapp';
  user_ids: number[];
  pole_ids: string[];
}

export interface ShareDocumentResponse {
  sent: number;
  total: number;
  warnings?: string[];
}

export interface ShareDocumentError {
  detail: string;
  errors?: string[];
}

// ── Appels API ───────────────────────────────────────────────────────

export const fetchDocuments = async (params?: Record<string, string | undefined>) =>
  unwrap(await apiGet<Paginated<ApiDocument> | ApiDocument[]>('/documents/', params));

export const createDocument = (data: CreateDocumentPayload) =>
  apiPost<ApiDocument>('/documents/', data);

export const uploadDocument = (formData: FormData) =>
  apiPostForm<ApiDocument>('/documents/', formData);

export const fetchTemplates = async (params?: Record<string, string | undefined>) =>
  unwrap(await apiGet<Paginated<ApiTemplate> | ApiTemplate[]>('/templates/', params));

export const shareDocument = (id: string, data: ShareDocumentPayload) =>
  apiPost<ShareDocumentResponse>(`/documents/${id}/share/`, data);

export const deleteDocument = (id: string) =>
  apiDelete(`/documents/${id}/`);

export const updateDocument = (id: string, data: { name?: string; doc_type?: string }) =>
  apiPatch<ApiDocument>(`/documents/${id}/`, data);

export const updateDocumentFile = (id: string, formData: FormData) =>
  apiPatchForm<ApiDocument>(`/documents/${id}/`, formData);
