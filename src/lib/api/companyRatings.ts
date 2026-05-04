import { apiGet, apiPost, type Paginated, unwrap } from '../api';

// ── Critères de notation ─────────────────────────────────────────────

export const CRITERES_NOTATION = [
  // Section 1 : Critères d'évaluation des entreprises
  { value: 'conformite_contrats', label: 'Conformité des contrats', section: 1 as const },
  { value: 'remuneration_avantages', label: 'Rémunération et avantages', section: 1 as const },
  { value: 'securite_sante', label: 'Sécurité et santé', section: 1 as const },
  { value: 'relations_sociales', label: 'Relations sociales', section: 1 as const },
  { value: 'rupture_contrat', label: 'Rupture du contrat', section: 1 as const },
  { value: 'rupture_communication', label: 'Rupture de communication', section: 1 as const },
  // Section 2 : Convention collective des Assurances (CCA)
  { value: 'classification_professionnelle', label: 'Classification professionnelle', section: 2 as const },
  { value: 'primes_specifiques', label: 'Primes spécifiques', section: 2 as const },
  { value: 'conditions_travail_cca', label: 'Conditions de travail (CCA)', section: 2 as const },
  { value: 'formation', label: 'Formation', section: 2 as const },
  { value: 'traitement_equitable', label: 'Traitement équitable', section: 2 as const },
] as const;

export type CritereValue = (typeof CRITERES_NOTATION)[number]['value'];

// ── Types ────────────────────────────────────────────────────────────

export interface ApiCompanyRating {
  id: string;
  company: string;
  company_name: string;
  criterion: string;
  criterion_display: string;
  rating: number;
  comment: string;
  rated_by: number;
  rated_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertCompanyRatingPayload {
  company: string;
  criterion: string;
  rating: number;
  comment?: string;
}

// ── Appels API ───────────────────────────────────────────────────────

export const fetchCompanyRatings = async (params?: Record<string, string | undefined>) =>
  unwrap(await apiGet<Paginated<ApiCompanyRating> | ApiCompanyRating[]>('/company-ratings/', params));

export const upsertCompanyRating = (data: UpsertCompanyRatingPayload) =>
  apiPost<ApiCompanyRating>('/company-ratings/', data);

/** Notation automatique calculée à partir des tickets clôturés pour une entreprise. */
export const fetchCompanyAutoRating = async (companyId: string): Promise<Record<string, number>> => {
  const res = await apiGet<Record<string, number>>(`/companies/${companyId}/auto-rating/`);
  return res as Record<string, number>;
};
