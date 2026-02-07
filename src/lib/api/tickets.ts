import { apiGet, apiPost, apiPatch, type Paginated, unwrap } from '../api';

// ── Types ────────────────────────────────────────────────────────────

export interface ApiTicket {
  id: string;
  reference: string;
  subject: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  status_label: string;
  ticket_type: string;
  ticket_type_label: string;
  company: string;
  company_name: string;
  pole: string | null;
  pole_name: string | null;
  worker: number | null;
  worker_name: string | null;
  delegate: string | null;
  delegate_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiTicketType {
  id: string;
  code: string;
  label: string;
  pole: string;
  pole_name: string;
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
  company: string;
  pole?: string;
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

export const fetchTicketTypes = async () =>
  unwrap(await apiGet<Paginated<ApiTicketType> | ApiTicketType[]>('/ticket-types/'));

export const fetchTicketStatuses = async () =>
  unwrap(await apiGet<Paginated<ApiTicketStatus> | ApiTicketStatus[]>('/ticket-statuses/'));
