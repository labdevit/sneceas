import { apiGet, apiPost, apiPatch, type Paginated, unwrap } from '../api';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://backendsnecea.labdev-it.com/api';

function getToken(): string | null {
  return localStorage.getItem('snecea_token');
}

// ── Types ────────────────────────────────────────────────────────────

export type ModelTicket = 'requeterh' | 'interne';

export interface ApiTicket {
  id: string;
  reference: string;
  subject: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  status_label: string;
  status_code?: string;
  ticket_type: string | null;
  ticket_type_label: string | null;
  company: string | null;
  company_name: string | null;
  pole: string | null;
  pole_name: string | null;
  worker: number | null;
  worker_name: string | null;
  delegate: string | null;
  delegate_name: string | null;
  closing_report: string | null;
  closed_at: string | null;
  model_ticket: ModelTicket;
  follower_users: number[];
  follower_poles: string[];
  follower_user_names: { id: number; name: string; username: string }[];
  follower_pole_names: { id: string; name: string }[];
  created_at: string;
  updated_at: string;
}

export interface ApiTicketType {
  id: string;
  code: string;
  label: string;
  pole: string | null;
  pole_name: string | null;
  model_ticket: ModelTicket;
  active: boolean;
}

export interface ApiTicketStatus {
  id: string;
  code: string;
  label: string;
  order: number;
  is_terminal: boolean;
}

export interface CreateTicketPayload {
  subject: string;
  description: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  ticket_type?: string;
  company?: string;
  pole?: string;
  worker?: number;
  model_ticket?: ModelTicket;
}

export interface UpdateTicketPayload {
  urgency?: string;
  status?: string;
  ticket_type?: string;
  pole?: string;
  delegate?: string;
  worker?: number;
  subject?: string;
  description?: string;
  closing_report?: string;
  follower_users?: number[];
  follower_poles?: string[];
}

// ── Appels API ───────────────────────────────────────────────────────

export const fetchTickets = (params?: Record<string, string | undefined>) =>
  apiGet<Paginated<ApiTicket>>('/tickets/', params);

export const fetchTicketsList = async (params?: Record<string, string | undefined>) =>
  unwrap(await apiGet<Paginated<ApiTicket> | ApiTicket[]>('/tickets/', params));

export const fetchTicket = (id: string) =>
  apiGet<ApiTicket>(`/tickets/${id}/`);

export const createTicket = (data: CreateTicketPayload) =>
  apiPost<ApiTicket>('/tickets/', data);

export const updateTicket = (id: string, data: UpdateTicketPayload) =>
  apiPatch<ApiTicket>(`/tickets/${id}/`, data);

export const fetchTicketTypes = async (params?: Record<string, string | undefined>) =>
  unwrap(await apiGet<Paginated<ApiTicketType> | ApiTicketType[]>('/ticket-types/', params));

export const fetchTicketStatuses = async () =>
  unwrap(await apiGet<Paginated<ApiTicketStatus> | ApiTicketStatus[]>('/ticket-statuses/'));

// ── Contestation endpoints ────────────────────────────────────────────

export interface ApiContestation {
  id: string;
  ticket: string;
  reason: string;
  status: 'pending' | 'accepted' | 'rejected';
  status_label: string;
  response: string;
  responded_by: number | null;
  responded_by_name: string | null;
  responded_at: string | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
}

export const contestTicket = (ticketId: string, reason: string) =>
  apiPost<ApiContestation>(`/tickets/${ticketId}/contester/`, { reason });

export const fetchContestations = (ticketId: string) =>
  apiGet<ApiContestation[]>(`/tickets/${ticketId}/contestations/`);

export const respondContestation = (
  contestationId: string,
  data: { status: 'accepted' | 'rejected'; response?: string },
) =>
  apiPatch<ApiContestation>(`/tickets/contestations/${contestationId}/respond`, data);

// ── Closing report endpoints ─────────────────────────────────────────

export interface ClosingReportTemplate {
  id: string;
  name: string;
  content: string;
}

export const fetchClosingReportTemplate = (ticketId: string) =>
  apiGet<ClosingReportTemplate>(`/tickets/${ticketId}/closing-report-template/`);

export const downloadClosingReportPdf = async (ticketId: string, content: string): Promise<Blob> => {
  const url = `${API_BASE_URL}/tickets/${ticketId}/closing-report-pdf/`;
  const token = getToken();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Token ${token}` } : {}),
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Échec de la génération du PDF');
  return res.blob();
};
