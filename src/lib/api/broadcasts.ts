import { apiGet, apiPost, apiPatch, apiDelete, apiPostForm, type Paginated, unwrap } from '../api';

// ── Types ────────────────────────────────────────────────────────────

export interface ApiBroadcastAttachment {
  id: string;
  file: string;
  filename: string;
  created_at: string;
}

export interface ApiBroadcast {
  id: string;
  subject: string;
  html_content: string;
  plain_content: string;
  channel: 'email' | 'whatsapp';
  audience: 'all' | 'poles' | 'companies';
  target_poles: string[];
  target_companies: string[];
  author: number;
  author_name: string;
  target_pole_names: string[];
  target_company_names: string[];
  attachments: ApiBroadcastAttachment[];
  status: 'draft' | 'sending' | 'sent' | 'failed';
  sent_at: string | null;
  recipient_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBroadcastPayload {
  subject: string;
  html_content?: string;
  plain_content?: string;
  channel: 'email' | 'whatsapp';
  audience: 'all' | 'poles' | 'companies' | 'delegates' | 'bureau';
  target_poles?: string[];
  target_companies?: string[];
  target_bureaux?: string[];
}

// ── Appels API ───────────────────────────────────────────────────────

export const fetchBroadcasts = async (params?: Record<string, string | undefined>) =>
  unwrap(await apiGet<Paginated<ApiBroadcast> | ApiBroadcast[]>('/broadcasts/', params));

export const fetchBroadcastsPaginated = (params?: Record<string, string | undefined>) =>
  apiGet<Paginated<ApiBroadcast>>('/broadcasts/', params);

export const fetchBroadcast = (id: string) =>
  apiGet<ApiBroadcast>(`/broadcasts/${id}/`);

export const createBroadcast = (data: CreateBroadcastPayload, files?: File[]) => {
  const fd = new FormData();
  fd.append('subject', data.subject);
  fd.append('channel', data.channel);
  fd.append('audience', data.audience);
  if (data.html_content) fd.append('html_content', data.html_content);
  if (data.plain_content) fd.append('plain_content', data.plain_content);
  for (const id of data.target_poles ?? []) fd.append('target_poles', id);
  for (const id of data.target_companies ?? []) fd.append('target_companies', id);
  for (const id of data.target_bureaux ?? []) fd.append('target_bureaux', id);
  for (const f of files ?? []) fd.append('files', f);
  return apiPostForm<ApiBroadcast>('/broadcasts/', fd);
};

export const updateBroadcast = (id: string, data: Partial<CreateBroadcastPayload>) =>
  apiPatch<ApiBroadcast>(`/broadcasts/${id}/`, data);

export const deleteBroadcast = (id: string) =>
  apiDelete(`/broadcasts/${id}/`);

export const sendBroadcast = (id: string) =>
  apiPost<ApiBroadcast>(`/broadcasts/${id}/send/`);
