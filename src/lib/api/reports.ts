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

// ── Stats & KPIs ─────────────────────────────────────────────────────

export interface ReportStats {
  period: string;
  total: number;
  total_trend: number;
  in_progress: number;
  resolved: number;
  resolved_trend: number;
  resolution_rate: number;
  avg_resolution_days: number;
  by_urgency: { name: string; value: number; key: string }[];
  by_status: { name: string; value: number }[];
  by_company: { company_name: string; count: number }[];
  by_type: { type_label: string; count: number }[];
  by_pole: { pole_name: string; count: number }[];
  monthly_trend: { month: string; nouveaux: number; resolus: number; enCours: number }[];
  weekly_distribution: { jour: string; tickets: number }[];
  resolution_by_type: { type: string; jours: number }[];
}

export interface ReportKPI {
  id: string;
  report_type: string;
  report_type_display: string;
  label: string;
  value_expression: string;
  target_value: string;
  color: string;
  icon: string;
  order: number;
  active: boolean;
}

export const fetchReportStats = (params?: Record<string, string | undefined>) =>
  apiGet<ReportStats>('/reports/stats/', params);

export const fetchReportKPIs = () =>
  apiGet<ReportKPI[]>('/reports/kpis/');

export interface HabitatStats {
  period: string;
  total: number;
  // Types
  by_type_bien: { label: string; count: number }[];
  by_titre_foncier: { label: string; count: number }[];
  // Géographie
  by_region: { label: string; count: number }[];
  by_ville: { label: string; count: number }[];
  by_commune: { label: string; count: number }[];
  // Financier
  budget_total: number;
  budget_moyen: number;
  budget_tranches: { label: string; count: number }[];
  budget_by_type: { label: string; budget_moyen: number }[];
  mensualite_moyenne: number;
  mensualite_by_type: { label: string; mensualite_moyenne: number }[];
  nb_with_budget: number;
  // Foncier
  superficie_moyenne: number;
  nb_terrains_total: number;
  nb_with_terrains: number;
}

export const fetchHabitatStats = (params?: Record<string, string | undefined>) =>
  apiGet<HabitatStats>('/reports/habitat-stats/', params);

export interface HabitatRow {
  date: string;
  demandeur: string;
  company: string;
  type_bien: string;
  budget: string | number;
  titre_foncier: string;
  superficie: string | number;
  nb_terrains: string | number;
  mensualite: string | number;
  region: string;
  ville: string;
  commune: string;
}

export interface HabitatRowsResponse {
  rows: HabitatRow[];
  total: number;
}

export const fetchHabitatRows = (params?: Record<string, string | undefined>) =>
  apiGet<HabitatRowsResponse>('/reports/habitat-rows/', params);
