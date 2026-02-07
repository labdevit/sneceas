import { apiGet, apiPost, type Paginated, unwrap } from '../api';

// ── Types ────────────────────────────────────────────────────────────

export interface ApiConversation {
  id: string;
  ticket: string;
  author: number;
  author_name: string;
  message: string;
  internal_only: boolean;
  created_at: string;
}

export interface CreateConversationPayload {
  ticket: string;
  message: string;
  internal_only?: boolean;
}

// ── Appels API ───────────────────────────────────────────────────────

export const fetchConversations = async (ticketId: string) =>
  unwrap(
    await apiGet<Paginated<ApiConversation> | ApiConversation[]>(
      '/conversations/',
      { ticket: ticketId },
    ),
  );

export const createConversation = (data: CreateConversationPayload) =>
  apiPost<ApiConversation>('/conversations/', data);
