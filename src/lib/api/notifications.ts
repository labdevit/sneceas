import { apiGet, apiPost, type Paginated, unwrap } from '../api';

// ── Types ────────────────────────────────────────────────────────────

export interface ApiNotification {
  id: number;
  user: number;
  title: string;
  message: string;
  link: string;
  read: boolean;
  created_at: string;
}

// ── Appels API ───────────────────────────────────────────────────────

export const fetchNotifications = async (params?: Record<string, string | undefined>) =>
  unwrap(await apiGet<Paginated<ApiNotification> | ApiNotification[]>('/notifications/', params));

export const markAllRead = () =>
  apiPost<void>('/notifications/mark-all-read/');
