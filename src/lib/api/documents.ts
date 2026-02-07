import { apiGet, apiPost, apiPostForm, type Paginated, unwrap } from '../api';

// ── Types ────────────────────────────────────────────────────────────

export interface ApiDocument {
  id: string;
  template: string;
  template_name: string;
  ticket: string | null;
  ticket_reference: string | null;
  file: string;
  created_at: string;
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

// ── Appels API ───────────────────────────────────────────────────────

export const fetchDocuments = async (params?: Record<string, string | undefined>) =>
  unwrap(await apiGet<Paginated<ApiDocument> | ApiDocument[]>('/documents/', params));

export const createDocument = (data: CreateDocumentPayload) =>
  apiPost<ApiDocument>('/documents/', data);

export const uploadDocument = (formData: FormData) =>
  apiPostForm<ApiDocument>('/documents/', formData);

export const fetchTemplates = async (params?: Record<string, string | undefined>) =>
  unwrap(await apiGet<Paginated<ApiTemplate> | ApiTemplate[]>('/templates/', params));
