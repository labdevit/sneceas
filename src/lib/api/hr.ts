import { apiGet, apiPost, type Paginated, unwrap } from '../api';

// ── Types ────────────────────────────────────────────────────────────

export interface ApiHRInteraction {
  id: string;
  ticket: string;
  ticket_reference: string;
  hr_name: string;
  hr_contact: string;
  channel: 'call' | 'email' | 'meeting';
  summary: string;
  outcome: string;
  interaction_date: string;
  created_at: string;
}

export interface CreateHRInteractionPayload {
  ticket: string;
  hr_name: string;
  hr_contact?: string;
  channel: 'call' | 'email' | 'meeting';
  summary: string;
  outcome?: string;
  interaction_date?: string;
}

// ── Appels API ───────────────────────────────────────────────────────

export const fetchHRInteractions = async (params?: Record<string, string | undefined>) =>
  unwrap(
    await apiGet<Paginated<ApiHRInteraction> | ApiHRInteraction[]>(
      '/hr-interactions/',
      params,
    ),
  );

export const fetchTicketHRInteractions = (ticketId: string) =>
  fetchHRInteractions({ ticket: ticketId });

export const createHRInteraction = (data: CreateHRInteractionPayload) =>
  apiPost<ApiHRInteraction>('/hr-interactions/', data);
