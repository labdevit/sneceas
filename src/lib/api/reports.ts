import { apiGet, apiPost, type Paginated, unwrap } from '../api';

// ── Types ────────────────────────────────────────────────────────────

export interface ApiReport {
  id: string;
  type: string;
  filters: Record<string, unknown>;
  generated_by: number;
  generated_by_name: string;
  generated_at: string;
  file: string | null;
}

export interface ApiAuditLog {
  id: string;
  user: number;
  username: string;
  action: string;
  object_type: string;
  object_id: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface CreateReportPayload {
  type: string;
  filters?: Record<string, unknown>;
}

// ── Appels API ───────────────────────────────────────────────────────

export const fetchReports = async (params?: Record<string, string | undefined>) =>
  unwrap(await apiGet<Paginated<ApiReport> | ApiReport[]>('/reports/', params));

export const createReport = (data: CreateReportPayload) =>
  apiPost<ApiReport>('/reports/', data);

export const fetchAuditLogs = async (params?: Record<string, string | undefined>) =>
  unwrap(await apiGet<Paginated<ApiAuditLog> | ApiAuditLog[]>('/audit-logs/', params));
