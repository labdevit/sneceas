const API_URL = import.meta.env.VITE_API_URL ?? 'https://backendsnecea.labdev-it.com/api';

/** URL de base de l’API (pour diagnostic en dev). */
export const getApiBaseUrl = () => API_URL;

/** Base URL du backend (sans /api) pour les médias (pièces jointes, etc.) */
export const MEDIA_BASE_URL =
  (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api').replace(/\/api\/?$/, '') ||
  'http://127.0.0.1:8000';

/** Construit l'URL complète d'un fichier média (pièce jointe, photo, etc.) */
export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const relative = path.startsWith('/') ? path.slice(1) : path;
  return `${MEDIA_BASE_URL}/media/${relative}`;
}

const ACCESS_TOKEN_KEY = 'cnts.accessToken';
const REFRESH_TOKEN_KEY = 'cnts.refreshToken';

export const tokenStorage = {
  getAccess(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setTokens(access: string, refresh: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export type ApiError = {
  status: number;
  data: unknown;
};

type RequestOptions = RequestInit & {
  auth?: boolean;
};

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) {
    return null;
  }

  const response = await fetch(`${API_URL}/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    // Ne déconnecter que si le refresh token est invalide ou expiré (401).
    // En cas d'erreur réseau ou 5xx, on ne supprime pas les tokens pour éviter une déconnexion intempestive.
    if (response.status === 401) {
      tokenStorage.clear();
    }
    return null;
  }

  const data = (await response.json()) as { access: string };
  tokenStorage.setTokens(data.access, refresh);
  return data.access;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(options.headers);

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!headers.has('Content-Type') && options.body && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.auth !== false) {
    const access = tokenStorage.getAccess();
    if (access) {
      headers.set('Authorization', `Bearer ${access}`);
    }
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 && options.auth !== false) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      headers.set('Authorization', `Bearer ${newAccess}`);
      const retry = await fetch(url, { ...options, headers });
      if (retry.ok) {
        return (await retry.json()) as T;
      }
      const retryData = await retry.json().catch(() => ({}));
      throw { status: retry.status, data: retryData } as ApiError;
    }
    // Refresh a échoué (token expiré ou invalide) : tokens déjà effacés par refreshAccessToken
    throw {
      status: 401,
      data: {
        detail: 'Session expirée. Veuillez vous reconnecter.',
        code: 'session_expired',
      },
    } as ApiError;
  }

  const htmlErrorDetail = (targetUrl: string) =>
    `Le serveur a renvoyé du HTML au lieu de JSON pour ${targetUrl}. Démarrez le backend Django : dans le dossier backendCnts, exécutez "python manage.py runserver" (avec le venv activé). Vérifiez aussi que cnts/.env contient VITE_API_URL=http://127.0.0.1:8000/api puis redémarrez Vite (npm run dev).`;

  if (!response.ok) {
    const text = await response.text();
    let data: unknown = {};
    try {
      data = JSON.parse(text);
    } catch {
      if (text.trimStart().toLowerCase().startsWith('<!')) {
        data = { detail: htmlErrorDetail(url) };
      }
    }
    throw { status: response.status, data } as ApiError;
  }

  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  if (text.trimStart().toLowerCase().startsWith('<!')) {
    throw {
      status: 200,
      data: { detail: htmlErrorDetail(url) },
    } as ApiError;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw { status: 200, data: { detail: 'Réponse API invalide (pas du JSON).' } } as ApiError;
  }
}

/** Événement calendrier (réunion planifiée) renvoyé par l’API */
export interface CalendarEvent {
  id: string;
  event_type?: 'reunion' | 'activite';
  title: string;
  start: string;
  end: string;
  statut?: string;
  statut_display?: string;
  type_reunion?: string;
  type_reunion_display?: string;
  dossier_id?: number;
  dossier_numero?: string;
  lieu?: string;
  ordre_du_jour?: string;
  reunion_id?: number;
  type_activite?: string;
  type_activite_display?: string;
  requete_id?: number;
  numero_reference?: string;
  description?: string;
  activite_id?: number;
}

/**
 * Récupère les événements calendrier (réunions planifiées) pour une plage de dates.
 * Utilisé par la page /calendar pour afficher les réunions issues du traitement des requêtes.
 */
export async function getCalendarEvents(params: {
  start: string;
  end: string;
  event_type?: 'activite' | 'reunion';
  debug?: boolean;
}): Promise<CalendarEvent[] | { events: CalendarEvent[]; debug: Record<string, unknown> }> {
  const sp = new URLSearchParams({ start: params.start, end: params.end });
  if (params.event_type) sp.set('event_type', params.event_type);
  if (params.debug) sp.set('debug', '1');
  return apiRequest<CalendarEvent[] | { events: CalendarEvent[]; debug: Record<string, unknown> }>(
    `/reunions/calendar-events/?${sp.toString()}`
  );
}

/** Requête (ticket) telle que retournée par GET /requetes/ (liste). */
export interface RequeteListDto {
  id: number;
  numero_reference: string;
  type_probleme: string;
  priorite: string;
  statut: string;
  titre: string;
  description?: string;
  created_at?: string;
  updated_at: string;
  travailleur: string | null;
  pole?: { id: number; nom: string } | null;
  entreprise?: { id: number; nom: string; code?: string } | null;
}

/** Entreprise (GET /entreprises/). */
export interface EntrepriseDto {
  id: number;
  nom: string;
  code?: string;
  adresse?: string;
  secteur_activite?: string;
}

/** Réponse paginée GET /requetes/. */
export interface RequetesListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: RequeteListDto[];
}

/**
 * Liste les requêtes (celles accessibles par l'utilisateur connecté).
 * Utilisé par le tableau de bord et la liste des requêtes.
 */
export async function getRequetes(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  statut?: string;
  ordering?: string;
}): Promise<RequetesListResponse> {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set('page', String(params.page));
  if (params?.page_size != null) sp.set('page_size', String(params.page_size));
  if (params?.search) sp.set('search', params.search);
  if (params?.statut) sp.set('statut', params.statut);
  if (params?.ordering) sp.set('ordering', params.ordering);
  const query = sp.toString();
  const url = `/requetes/${query ? `?${query}` : ''}`;
  const data = await apiRequest<RequetesListResponse | { results: RequeteListDto[] }>(url);
  if ('count' in data && Array.isArray(data.results)) {
    return {
      count: (data as RequetesListResponse).count ?? data.results.length,
      next: (data as RequetesListResponse).next ?? null,
      previous: (data as RequetesListResponse).previous ?? null,
      results: data.results,
    };
  }
  const results = Array.isArray(data) ? data : (data as { results?: RequeteListDto[] }).results ?? [];
  return { count: results.length, next: null, previous: null, results };
}

/** Profil utilisateur connecté (GET /profils/me/). */
export interface ProfileMeDto {
  id?: number;
  user?: string;
  role?: string;
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string;
  entreprise?: { id: number; nom: string; code?: string } | null;
  poles?: { pole_id: number; pole_nom: string; is_manager: boolean }[];
}

/** Récupère le profil de l'utilisateur connecté. */
export async function getProfileMe(): Promise<ProfileMeDto> {
  return apiRequest<ProfileMeDto>('/profils/me/');
}

/** Liste des entreprises (GET /entreprises/). */
export async function getEntreprises(): Promise<EntrepriseDto[]> {
  const data = await apiRequest<EntrepriseDto[] | { results: EntrepriseDto[] }>('/entreprises/');
  return Array.isArray(data) ? data : (data as { results?: EntrepriseDto[] }).results ?? [];
}

/** Critères de notation des entreprises (alignés avec le backend).
 * Section 1 : Critères d'évaluation des entreprises
 * Section 2 : Convention collective des Assurances
 */
export const CRITERES_NOTATION = [
  { value: 'conformite_contrats', label: 'Conformité des contrats', section: 1 as const },
  { value: 'remuneration_avantages', label: 'Rémunération et avantages', section: 1 as const },
  { value: 'securite_sante', label: 'Sécurité et santé', section: 1 as const },
  { value: 'relations_sociales', label: 'Relations sociales', section: 1 as const },
  { value: 'rupture_contrat', label: 'Rupture du contrat', section: 1 as const },
  { value: 'rupture_communication', label: 'Rupture de communication', section: 1 as const },
  { value: 'classification_professionnelle', label: 'Classification professionnelle', section: 2 as const },
  { value: 'primes_specifiques', label: 'Primes spécifiques', section: 2 as const },
  { value: 'conditions_travail_cca', label: 'Conditions de travail (CCA)', section: 2 as const },
  { value: 'formation', label: 'Formation', section: 2 as const },
  { value: 'traitement_equitable', label: 'Traitement équitable', section: 2 as const },
] as const;

export type CritereNotationValue = (typeof CRITERES_NOTATION)[number]['value'];

/** Une notation (un critère) pour une entreprise. */
export interface NotationEntrepriseDto {
  id: number;
  entreprise: { id: number; nom: string; code?: string };
  entreprise_id?: number;
  critere: string;
  critere_display: string;
  note: number;
  commentaire: string;
  created_by: number;
  created_by_display: string | null;
  updated_at: string;
}

/** Liste les notations (GET /notations-entreprises/). Optionnel : ?entreprise=<id>. */
export async function getNotationsEntreprise(params?: {
  entreprise?: number;
  critere?: string;
}): Promise<NotationEntrepriseDto[]> {
  const sp = new URLSearchParams();
  if (params?.entreprise != null) sp.set('entreprise', String(params.entreprise));
  if (params?.critere) sp.set('critere', params.critere);
  const query = sp.toString();
  const data = await apiRequest<NotationEntrepriseDto[] | { results: NotationEntrepriseDto[] }>(
    `/notations-entreprises/${query ? `?${query}` : ''}`
  );
  return Array.isArray(data) ? data : (data as { results?: NotationEntrepriseDto[] }).results ?? [];
}

/** Crée ou met à jour une notation (POST = upsert par user + entreprise + critère). */
export async function upsertNotationEntreprise(payload: {
  entreprise_id: number;
  critere: string;
  note: number;
  commentaire?: string;
}): Promise<NotationEntrepriseDto> {
  return apiRequest<NotationEntrepriseDto>('/notations-entreprises/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Notation automatique calculée à partir des requêtes clôturées (résolu / non résolu). GET /entreprises/:id/notation-automatique/ */
export async function getNotationAutomatique(entrepriseId: number): Promise<Record<string, number>> {
  const data = await apiRequest<Record<string, number>>(
    `/entreprises/${entrepriseId}/notation-automatique/`
  );
  return data ?? {};
}

/** Activité planifiée sur une requête (suivi d'activités, date affichée au calendrier) */
export interface ActiviteRequeteDto {
  id: number;
  requete_id: number;
  type_activite: string;
  type_activite_display?: string;
  titre: string;
  description: string;
  date_planifiee: string;
  statut: string;
  date_realisation: string | null;
  commentaire: string;
  /** Chemin ou URL de la pièce jointe du compte rendu (si présente) */
  piece_jointe_compte_rendu?: string | null;
  extra_data?: Record<string, unknown>;
  created_by_id?: number;
  created_at: string;
}

/** Champ optionnel lié à un type d'activité (selon le pôle) */
export interface ActivityTypeFieldDef {
  name: string;
  label: string;
  type: 'text' | 'date' | 'datetime' | 'number' | 'textarea';
  required?: boolean;
}

/** Type d'activité proposé pour un pôle */
export interface ActivityTypeChoice {
  value: string;
  label: string;
  fields: ActivityTypeFieldDef[];
}

/** Réponse GET /requetes/:id/activity-type-choices/ */
export interface RequeteActivityTypeChoicesDto {
  pole_code: string;
  pole_name: string | null;
  types: ActivityTypeChoice[];
}

export async function getRequeteActivites(requeteId: string): Promise<ActiviteRequeteDto[]> {
  return apiRequest<ActiviteRequeteDto[]>(`/requetes/${requeteId}/activites/`);
}

export async function getRequeteActivityTypeChoices(
  requeteId: string
): Promise<RequeteActivityTypeChoicesDto> {
  return apiRequest<RequeteActivityTypeChoicesDto>(
    `/requetes/${requeteId}/activity-type-choices/`
  );
}

export async function createRequeteActivite(
  requeteId: string,
  data: {
    type_activite?: string;
    activite_template_id?: number | null;
    titre: string;
    description?: string;
    date_planifiee: string;
    extra_data?: Record<string, unknown>;
  }
): Promise<ActiviteRequeteDto> {
  return apiRequest<ActiviteRequeteDto>(`/requetes/${requeteId}/activites/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Met à jour une activité (statut, date de réalisation, commentaire, pièce jointe).
 * Utilisé pour « Marquer comme terminée » et « Annuler ».
 * Si piece_jointe_compte_rendu est un File, la requête est envoyée en multipart/form-data.
 */
export async function updateRequeteActivite(
  requeteId: string,
  activiteId: number | string,
  data: {
    statut?: string;
    date_realisation?: string | null;
    commentaire?: string;
    piece_jointe_compte_rendu?: File | null;
  }
): Promise<ActiviteRequeteDto> {
  const hasFile = data.piece_jointe_compte_rendu instanceof File;
  if (hasFile) {
    const form = new FormData();
    if (data.statut != null) form.append('statut', data.statut);
    if (data.date_realisation != null) form.append('date_realisation', data.date_realisation);
    if (data.commentaire != null) form.append('commentaire', data.commentaire);
    form.append('piece_jointe_compte_rendu', data.piece_jointe_compte_rendu!);
    return apiRequest<ActiviteRequeteDto>(
      `/requetes/${requeteId}/activites/${activiteId}/`,
      { method: 'PATCH', body: form }
    );
  }
  const { piece_jointe_compte_rendu: _, ...jsonData } = data;
  return apiRequest<ActiviteRequeteDto>(
    `/requetes/${requeteId}/activites/${activiteId}/`,
    {
      method: 'PATCH',
      body: JSON.stringify(jsonData),
    }
  );
}

// ---------- Modèles d'activité dynamiques (admin + workflow) ----------

export interface ChampActiviteTemplateDto {
  id?: number;
  nom: string;
  label: string;
  type_champ: string;
  type_champ_display?: string;
  required: boolean;
  ordre: number;
  options: { value: string; label: string }[];
  is_active: boolean;
}

export interface ActiviteTemplateDto {
  id: number;
  nom: string;
  code: string;
  description: string;
  is_active: boolean;
  ordre: number;
  champs: ChampActiviteTemplateDto[];
  pole_ids: number[];
  created_at?: string;
  updated_at?: string;
}

export interface ActiviteTemplateListeDto {
  id: number;
  nom: string;
  code: string;
  is_active: boolean;
  ordre: number;
  pole_ids: number[];
  created_at?: string;
}

/** Réponse paginée de l’API (activite-templates, etc.). */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Récupère une page de modèles d’activité (pour la liste avec pagination). */
export async function getActiviteTemplatesPage(params?: {
  pole_id?: number;
  is_active?: boolean;
  page?: number;
  search?: string;
  created_after?: string;
  created_before?: string;
}): Promise<PaginatedResponse<ActiviteTemplateListeDto>> {
  const search = new URLSearchParams();
  if (params?.pole_id != null) search.set('pole', String(params.pole_id));
  if (params?.is_active != null) search.set('is_active', String(params.is_active));
  if (params?.page != null && params.page > 0) search.set('page', String(params.page));
  if (params?.search != null && params.search.trim() !== '') search.set('search', params.search.trim());
  if (params?.created_after != null && params.created_after.trim() !== '') search.set('created_after', params.created_after.trim());
  if (params?.created_before != null && params.created_before.trim() !== '') search.set('created_before', params.created_before.trim());
  const q = search.toString();
  const path = `/activite-templates/${q ? `?${q}` : ''}`;
  return apiRequest<PaginatedResponse<ActiviteTemplateListeDto>>(path);
}

/** Récupère tous les modèles d’activité (toutes pages, pour listes déroulantes, etc.). */
export async function getActiviteTemplates(params?: {
  pole_id?: number;
  is_active?: boolean;
}): Promise<ActiviteTemplateListeDto[]> {
  const search = new URLSearchParams();
  if (params?.pole_id != null) search.set('pole', String(params.pole_id));
  if (params?.is_active != null) search.set('is_active', String(params.is_active));
  const q = search.toString();
  const path = `/activite-templates/${q ? `?${q}` : ''}`;
  const first = await apiRequest<PaginatedResponse<ActiviteTemplateListeDto> | ActiviteTemplateListeDto[]>(path);
  if (Array.isArray(first)) return first;
  const all: ActiviteTemplateListeDto[] = [...(first.results ?? [])];
  let nextUrl: string | null = first.next ?? null;
  while (nextUrl) {
    const u = new URL(nextUrl);
    const nextPath = u.pathname.replace(/^\/api/, '') + u.search;
    const page = await apiRequest<PaginatedResponse<ActiviteTemplateListeDto>>(nextPath);
    all.push(...(page.results ?? []));
    nextUrl = page.next ?? null;
  }
  return all;
}

export async function getActiviteTemplate(id: number): Promise<ActiviteTemplateDto> {
  return apiRequest<ActiviteTemplateDto>(`/activite-templates/${id}/`);
}

/** Activités disponibles pour un pôle (workflow). */
export async function getActivitesDisponibles(poleId: number): Promise<ActiviteTemplateDto[]> {
  return apiRequest<ActiviteTemplateDto[]>(`/poles/${poleId}/activites-disponibles/`);
}

export async function createActiviteTemplate(data: {
  nom: string;
  code: string;
  description?: string;
  is_active?: boolean;
  ordre?: number;
  champs: Partial<ChampActiviteTemplateDto>[];
  pole_ids: number[];
}): Promise<ActiviteTemplateDto> {
  return apiRequest<ActiviteTemplateDto>('/activite-templates/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateActiviteTemplate(
  id: number,
  data: Partial<{
    nom: string;
    code: string;
    description: string;
    is_active: boolean;
    ordre: number;
    champs: Partial<ChampActiviteTemplateDto>[];
    pole_ids: number[];
  }>
): Promise<ActiviteTemplateDto> {
  return apiRequest<ActiviteTemplateDto>(`/activite-templates/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** Désactive un modèle (soft delete). */
export async function deleteActiviteTemplate(id: number): Promise<void> {
  return apiRequest<void>(`/activite-templates/${id}/`, { method: 'DELETE' });
}

/** Document syndical (API documents) */
export interface DocumentSyndicalDto {
  id: number;
  nom: string;
  description: string;
  pole: { id: number; nom: string } | null;
  pole_id: number | null;
  annee: number;
  categorie: string;
  fichier: string;
  version: number;
  uploaded_by?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Liste les documents syndicaux (avec recherche et tri optionnels).
 */
export async function getDocuments(params?: {
  search?: string;
  ordering?: string;
}): Promise<DocumentSyndicalDto[]> {
  const sp = new URLSearchParams();
  if (params?.search) sp.set('search', params.search);
  if (params?.ordering) sp.set('ordering', params.ordering);
  const query = sp.toString();
  const url = `/documents/${query ? `?${query}` : ''}`;
  const data = await apiRequest<DocumentSyndicalDto[] | { results: DocumentSyndicalDto[] }>(url);
  return Array.isArray(data) ? data : (data.results ?? []);
}

// ——— Gestion des documents (API /api/gestion-documents/) ———

export interface GestionDocumentDto {
  id: number;
  titre: string;
  description: string;
  fichier: string | null;
  is_suivi_requete: boolean;
  pole: number | null;
  pole_nom: string | null;
  confidentialite: string;
  confidentialite_display: string;
  requete: number | null;
  requete_numero: string | null;
  statut: string;
  statut_display: string;
  created_by: number;
  created_by_username: string;
  created_at: string;
  updated_at: string;
}

export interface GestionDocumentListDto {
  id: number;
  titre: string;
  fichier: string | null;
  is_suivi_requete: boolean;
  pole: number | null;
  pole_nom: string | null;
  confidentialite: string;
  confidentialite_display: string;
  requete: number | null;
  requete_numero: string | null;
  statut: string;
  statut_display: string;
  created_at: string;
}

export interface GestionDocumentHistoriqueDto {
  id: number;
  action: string;
  action_display: string;
  champ_modifie: string | null;
  ancienne_valeur: string | null;
  nouvelle_valeur: string | null;
  commentaire: string;
  timestamp: string;
  utilisateur: number;
  utilisateur_display: string | null;
}

export interface GestionDocumentChoicesDto {
  confidentialite: { value: string; label: string }[];
  statut: { value: string; label: string }[];
  type_action: { value: string; label: string }[];
}

const GESTION_DOCS_BASE = 'gestion-documents';

export async function getGestionDocuments(params?: {
  search?: string;
  pole?: number;
  confidentialite?: string;
  statut?: string;
  requete?: number;
  ordering?: string;
}): Promise<GestionDocumentListDto[]> {
  const sp = new URLSearchParams();
  if (params?.search) sp.set('search', params.search);
  if (params?.pole != null) sp.set('pole', String(params.pole));
  if (params?.confidentialite) sp.set('confidentialite', params.confidentialite);
  if (params?.statut) sp.set('statut', params.statut);
  if (params?.requete != null) sp.set('requete', String(params.requete));
  if (params?.ordering) sp.set('ordering', params.ordering);
  const query = sp.toString();
  const url = `/${GESTION_DOCS_BASE}/${query ? `?${query}` : ''}`;
  const data = await apiRequest<GestionDocumentListDto[] | { count?: number; results?: GestionDocumentListDto[] }>(url);
  return Array.isArray(data) ? data : (data.results ?? []);
}

export async function getGestionDocument(id: number): Promise<GestionDocumentDto> {
  return apiRequest<GestionDocumentDto>(`/${GESTION_DOCS_BASE}/${id}/`);
}

export async function createGestionDocument(formData: FormData): Promise<GestionDocumentDto> {
  return apiRequest<GestionDocumentDto>(`/${GESTION_DOCS_BASE}/`, {
    method: 'POST',
    body: formData,
  });
}

export async function updateGestionDocument(
  id: number,
  payload: FormData | Record<string, unknown>
): Promise<GestionDocumentDto> {
  const isForm = payload instanceof FormData;
  return apiRequest<GestionDocumentDto>(`/${GESTION_DOCS_BASE}/${id}/`, {
    method: 'PATCH',
    body: isForm ? payload : JSON.stringify(payload),
  });
}

export async function deleteGestionDocument(id: number): Promise<void> {
  await apiRequest(`/${GESTION_DOCS_BASE}/${id}/`, { method: 'DELETE' });
}

export async function getGestionDocumentHistorique(
  id: number
): Promise<GestionDocumentHistoriqueDto[]> {
  return apiRequest<GestionDocumentHistoriqueDto[]>(`/${GESTION_DOCS_BASE}/${id}/historique/`);
}

export async function getGestionDocumentChoices(): Promise<GestionDocumentChoicesDto> {
  return apiRequest<GestionDocumentChoicesDto>(`/${GESTION_DOCS_BASE}/choices/`);
}

/** Crée les documents de suivi pour les requêtes qui n'en ont pas (réservé aux admins). */
export async function ensureGestionDocumentsSuivi(): Promise<{ created: number; detail: string }> {
  return apiRequest<{ created: number; detail: string }>(`/${GESTION_DOCS_BASE}/ensure-suivi/`, {
    method: 'POST',
  });
}

// ——— Communications (pôle Communication) ———

export interface CommunicationPieceJointeDto {
  id: number;
  fichier: string;
  description: string;
  uploaded_by: number;
  uploaded_at: string;
}

export interface CommunicationPostDto {
  id: number;
  titre: string;
  contenu: string;
  visibilite: 'global' | 'company' | 'pole';
  entreprise_cible: number | null;
  entreprise_cible_nom: string | null;
  pole_cible: number | null;
  pole_cible_nom: string | null;
  auteur: number;
  auteur_username: string;
  auteur_first_name: string;
  auteur_last_name: string;
  pieces_jointes: CommunicationPieceJointeDto[];
  created_at: string;
}

const COMMUNICATIONS_BASE = 'communications';

export interface CommunicationsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CommunicationPostDto[];
}

export async function getCommunications(params?: {
  search?: string;
  visibilite?: string;
  entreprise_cible?: number;
  pole_cible?: number;
  ordering?: string;
  page?: number;
  page_size?: number;
}): Promise<CommunicationsListResponse> {
  const sp = new URLSearchParams();
  if (params?.search) sp.set('search', params.search);
  if (params?.visibilite) sp.set('visibilite', params.visibilite);
  if (params?.entreprise_cible != null) sp.set('entreprise_cible', String(params.entreprise_cible));
  if (params?.pole_cible != null) sp.set('pole_cible', String(params.pole_cible));
  if (params?.ordering) sp.set('ordering', params.ordering);
  if (params?.page != null) sp.set('page', String(params.page));
  if (params?.page_size != null) sp.set('page_size', String(params.page_size));
  const query = sp.toString();
  const url = `/${COMMUNICATIONS_BASE}/${query ? `?${query}` : ''}`;
  const data = await apiRequest<CommunicationsListResponse>(url);
  return {
    count: data.count ?? 0,
    next: data.next ?? null,
    previous: data.previous ?? null,
    results: data.results ?? [],
  };
}

export async function getCommunication(id: number): Promise<CommunicationPostDto> {
  return apiRequest<CommunicationPostDto>(`/${COMMUNICATIONS_BASE}/${id}/`);
}

/** Indique si l'utilisateur connecté peut créer/modifier/supprimer des communications (pôle Communication ou admin). */
export async function getCommunicationCanManage(): Promise<{ can_manage: boolean }> {
  return apiRequest<{ can_manage: boolean }>(`/${COMMUNICATIONS_BASE}/can_manage/`);
}

/** Payload pour créer une publication (titre, contenu, visibilité ; cibles optionnelles selon visibilité). */
export interface CreateCommunicationPostPayload {
  titre: string;
  contenu: string;
  visibilite: 'global' | 'company' | 'pole';
  entreprise_cible?: number | null;
  pole_cible?: number | null;
}

/** Crée une nouvelle publication (pôle Communication ou admin). */
export async function createCommunicationPost(
  payload: CreateCommunicationPostPayload
): Promise<CommunicationPostDto> {
  return apiRequest<CommunicationPostDto>(`/${COMMUNICATIONS_BASE}/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Met à jour une publication (pôle Communication ou admin). */
export async function updateCommunicationPost(
  id: number,
  payload: CreateCommunicationPostPayload
): Promise<CommunicationPostDto> {
  return apiRequest<CommunicationPostDto>(`/${COMMUNICATIONS_BASE}/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** Supprime une publication (pôle Communication ou admin). */
export async function deleteCommunicationPost(id: number): Promise<void> {
  await apiRequest(`/${COMMUNICATIONS_BASE}/${id}/`, { method: 'DELETE' });
}

/** Upload une image pour l'insérer dans le contenu (éditeur riche). Retourne l'URL (chemin) à utiliser avec getMediaUrl. */
export async function uploadCommunicationInlineImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  return apiRequest<{ url: string }>(`/${COMMUNICATIONS_BASE}/upload_inline_image/`, {
    method: 'POST',
    body: form,
  });
}

/** Ajoute une pièce jointe à une publication (après création). */
export async function addCommunicationAttachment(
  communicationId: number,
  file: File,
  description?: string
): Promise<CommunicationPieceJointeDto> {
  const form = new FormData();
  form.append('file', file);
  if (description != null && description !== '') form.append('description', description);
  return apiRequest<CommunicationPieceJointeDto>(
    `/${COMMUNICATIONS_BASE}/${communicationId}/add_attachment/`,
    { method: 'POST', body: form }
  );
}

/**
 * Télécharge un fichier (ex. PDF) avec authentification et déclenche le téléchargement côté client.
 */
export async function downloadFile(
  path: string,
  filename: string,
  options: { method?: string } = {}
): Promise<void> {
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers();
  const access = tokenStorage.getAccess();
  if (access) headers.set('Authorization', `Bearer ${access}`);
  const response = await fetch(url, { method: options.method ?? 'GET', headers });
  if (response.status === 401) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      headers.set('Authorization', `Bearer ${newAccess}`);
      const retry = await fetch(url, { method: options.method ?? 'GET', headers });
      if (!retry.ok) throw { status: retry.status, data: await retry.json().catch(() => ({})) } as ApiError;
      const blob = await retry.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
      return;
    }
  }
  if (!response.ok) throw { status: response.status, data: await response.json().catch(() => ({})) } as ApiError;
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blobUrl);
}
