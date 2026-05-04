import { apiGet, apiPost, apiPatch, apiPatchForm, apiDelete, type Paginated, unwrap } from '../api';

// ── Types ────────────────────────────────────────────────────────────

export interface ApiHRInteraction {
  id: string;
  ticket: string | null;
  ticket_reference: string | null;
  company: string | null;
  pole: string | null;
  pole_name: string | null;
  poles?: string[];
  activity_type: string | null;
  activity_type_label: string | null;
  hr_name: string;
  hr_contact: string;
  channel: 'call' | 'email' | 'meeting';
  status: 'planned' | 'in_progress' | 'done' | 'canceled';
  scheduled_for: string | null;
  summary: string;
  outcome: string;
  notes: string;
  interaction_date: string | null;
  extra_data?: Record<string, unknown>;
  report_template?: string | null;
  report_document?: string | null;
  report_attachment?: string | null;
  report_attachment_url?: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateHRInteractionPayload {
  ticket?: string;
  company?: string;
  pole?: string;
  poles?: string[];
  activity_type?: string;
  hr_name: string;
  hr_contact?: string;
  channel: 'call' | 'email' | 'meeting';
  status?: 'planned' | 'in_progress' | 'done' | 'canceled';
  scheduled_for?: string;
  summary: string;
  outcome?: string;
  notes?: string;
  interaction_date?: string;
  extra_data?: Record<string, unknown>;
}

// ── Appels API ───────────────────────────────────────────────────────

export const fetchHRInteractions = async (params?: Record<string, string | undefined>) =>
  unwrap(
    await apiGet<Paginated<ApiHRInteraction> | ApiHRInteraction[]>(
      '/interactions/',
      params,
    ),
  );

export const fetchTicketHRInteractions = (ticketId: string) =>
  fetchHRInteractions({ ticket: ticketId });

/** Fetch interactions created by the current user, optionally filtered by activity type */
export const fetchMyInteractions = (params?: Record<string, string | undefined>) =>
  fetchHRInteractions({ mine: '1', ...params });

export const createHRInteraction = (data: CreateHRInteractionPayload) =>
  apiPost<ApiHRInteraction>('/interactions/', data);

export const updateHRInteraction = (id: string, data: Partial<CreateHRInteractionPayload>) =>
  apiPatch<ApiHRInteraction>(`/interactions/${id}/`, data);

export const deleteHRInteraction = (id: string) =>
  apiDelete(`/interactions/${id}/`);

/**
 * Upload file attachment for an interaction (multipart/form-data PATCH)
 */
export const uploadInteractionAttachment = (id: string, file: File) => {
  const formData = new FormData();
  formData.append('report_attachment', file);
  return apiPatchForm<ApiHRInteraction>(`/interactions/${id}/`, formData);
};
