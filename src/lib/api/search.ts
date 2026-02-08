import { apiGet } from '../api';

// ── Types ────────────────────────────────────────────────────────────

export interface SearchTicketResult {
  id: string;
  reference: string;
  subject: string;
  status_label: string;
  company_name: string;
  urgency: string;
  created_at: string;
}

export interface SearchCompanyResult {
  id: string;
  name: string;
  sector: string;
  active: boolean;
}

export interface SearchDocumentResult {
  id: string;
  title: string;
  document_type: string;
  file: string;
  created_at: string;
}

export interface GlobalSearchResults {
  tickets: SearchTicketResult[];
  companies: SearchCompanyResult[];
  documents: SearchDocumentResult[];
}

export interface PaginatedSearchResults<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── API ──────────────────────────────────────────────────────────────

export async function searchTickets(
  query: string,
  page = 1,
): Promise<PaginatedSearchResults<SearchTicketResult>> {
  return apiGet<PaginatedSearchResults<SearchTicketResult>>(
    `/search/tickets/?q=${encodeURIComponent(query)}&page=${page}`,
  );
}

export async function searchCompanies(
  query: string,
  page = 1,
): Promise<PaginatedSearchResults<SearchCompanyResult>> {
  return apiGet<PaginatedSearchResults<SearchCompanyResult>>(
    `/search/companies/?q=${encodeURIComponent(query)}&page=${page}`,
  );
}

export async function searchDocuments(
  query: string,
  page = 1,
): Promise<PaginatedSearchResults<SearchDocumentResult>> {
  return apiGet<PaginatedSearchResults<SearchDocumentResult>>(
    `/search/documents/?q=${encodeURIComponent(query)}&page=${page}`,
  );
}

/**
 * Recherche globale — interroge les 3 endpoints en parallèle.
 * Retourne les premiers résultats de chaque catégorie.
 * Si un endpoint est indisponible (404/500), on retourne un tableau vide
 * pour cette catégorie afin de ne pas casser l'UX.
 */
export async function searchGlobal(query: string): Promise<GlobalSearchResults> {
  const safe = <T,>(promise: Promise<PaginatedSearchResults<T>>): Promise<T[]> =>
    promise.then((r) => r.results).catch(() => []);

  const [tickets, companies, documents] = await Promise.all([
    safe(searchTickets(query)),
    safe(searchCompanies(query)),
    safe(searchDocuments(query)),
  ]);

  return { tickets, companies, documents };
}
