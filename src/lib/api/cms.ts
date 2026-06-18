const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://188.245.55.173:8000/api';

function h(json = true): Record<string, string> {
  const token = localStorage.getItem('snecea_token');
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Token ${token}` } : {}),
  };
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, { headers: h(), ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg =
      typeof body.detail === 'string'
        ? body.detail
        : Object.entries(body)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? (v as string[]).join(', ') : String(v)}`)
            .join(' | ') || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json();
  if (data && typeof data === 'object' && 'results' in data) return (data as { results: T }).results;
  return data as T;
}

async function reqForm<T>(method: 'POST' | 'PATCH', path: string, form: FormData): Promise<T> {
  const token = localStorage.getItem('snecea_token');
  const res = await fetch(BASE + path, {
    method,
    headers: token ? { Authorization: `Token ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg =
      typeof body.detail === 'string'
        ? body.detail
        : Object.entries(body)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? (v as string[]).join(', ') : String(v)}`)
            .join(' | ') || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/**
 * Build FormData from a plain object.
 * alwaysSkip: fields to never include (file fields, computed/read-only props).
 */
export function buildForm(
  data: Record<string, unknown>,
  file?: { field: string; file: File; clearField?: string },
  alwaysSkip: string[] = [],
): FormData {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (alwaysSkip.includes(k)) return;
    if (file && k === file.field) return;
    if (file?.clearField && k === file.clearField) { fd.append(k, ''); return; }
    if (v !== null && v !== undefined && v !== '') fd.append(k, String(v));
  });
  if (file) fd.append(file.field, file.file);
  return fd;
}

// Fields that are file objects on the backend — never serialize as text on PATCH
const ARTICLE_SKIP = ['id', 'cover', 'cover_image', 'tag_list', 'created_at', 'updated_at'];
const EVENT_SKIP   = ['id', 'cover', 'cover_image', 'created_at', 'updated_at'];
const GALLERY_SKIP = ['id', 'image', 'src', 'created_at', 'updated_at', 'media'];

function stripKeys(data: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!keys.includes(k)) out[k] = v;
  }
  return out;
}

export interface CmsSlide {
  id: string; title: string; subtitle: string; badge_text: string;
  background: string; image_url: string;
  cta_label: string; cta_url: string;
  cta_label_secondary: string; cta_url_secondary: string; order: number;
  is_active: boolean;
}
export interface CmsService {
  id: string; title: string; slug: string; icon: string;
  short_description: string; body: string; order: number;
  is_active: boolean;
}
export interface CmsArticle {
  id: string; title: string; slug: string; excerpt: string;
  cover: string; cover_image_url: string; author_name: string;
  category: string; status: string; is_featured: boolean;
  published_at: string | null; created_at: string; body: string;
}
export interface CmsEvent {
  id: string; title: string; slug: string; description: string; body: string;
  cover: string; cover_image_url: string; location: string; address: string;
  start_date: string; end_date: string | null; status: string;
  is_featured: boolean; registration_url: string; max_attendees: number | null;
  seo_title: string; seo_description: string; created_at: string;
}
export interface CmsTeamMember {
  id: string; full_name: string; role: string; bio: string;
  avatar: string; photo_url: string; email: string; linkedin_url: string; order: number;
}
export interface CmsContact {
  id: string; full_name: string; email: string; phone: string;
  company: string; subject: string; message: string;
  status: string; created_at: string;
}

export const cmsSlides = {
  list: () => req<CmsSlide[]>('/cms/slides/'),
  create: (data: Partial<CmsSlide>, file?: File) =>
    file
      ? reqForm<CmsSlide>('POST', '/cms/slides/', buildForm(data as Record<string, unknown>, { field: 'image', file, clearField: 'image_url' }))
      : req<CmsSlide>('/cms/slides/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CmsSlide>, file?: File) =>
    file
      ? reqForm<CmsSlide>('PATCH', `/cms/slides/${id}/`, buildForm(data as Record<string, unknown>, { field: 'image', file, clearField: 'image_url' }))
      : req<CmsSlide>(`/cms/slides/${id}/`, { method: 'PATCH', body: JSON.stringify(stripKeys(data as Record<string, unknown>, ['id', 'background', 'image', 'created_at', 'updated_at'])) }),
  remove: (id: string) => req<void>(`/cms/slides/${id}/`, { method: 'DELETE' }),
};

export const cmsServices = {
  list: () => req<CmsService[]>('/cms/services/'),
  create: (data: Partial<CmsService>) =>
    req<CmsService>('/cms/services/', { method: 'POST', body: JSON.stringify(data) }),
  update: (slug: string, data: Partial<CmsService>) =>
    req<CmsService>(`/cms/services/${slug}/`, { method: 'PATCH', body: JSON.stringify(stripKeys(data as Record<string, unknown>, ['id', 'created_at', 'updated_at'])) }),
  remove: (slug: string) => req<void>(`/cms/services/${slug}/`, { method: 'DELETE' }),
};

export const cmsArticles = {
  list: () => req<CmsArticle[]>('/cms/articles/'),
  create: (data: Partial<CmsArticle>, file?: File) =>
    file
      ? reqForm<CmsArticle>('POST', '/cms/articles/', buildForm(data as Record<string, unknown>, { field: 'cover_image', file, clearField: 'cover_image_url' }))
      : req<CmsArticle>('/cms/articles/', { method: 'POST', body: JSON.stringify(data) }),
  update: (slug: string, data: Partial<CmsArticle>, file?: File) =>
    file
      ? reqForm<CmsArticle>('PATCH', `/cms/articles/${slug}/`, buildForm(data as Record<string, unknown>, { field: 'cover_image', file, clearField: 'cover_image_url' }, ARTICLE_SKIP))
      : req<CmsArticle>(`/cms/articles/${slug}/`, { method: 'PATCH', body: JSON.stringify(stripKeys(data as Record<string, unknown>, ARTICLE_SKIP)) }),
  remove: (slug: string) => req<void>(`/cms/articles/${slug}/`, { method: 'DELETE' }),
};

export const cmsEvents = {
  list: () => req<CmsEvent[]>('/cms/events/'),
  create: (data: Partial<CmsEvent>, file?: File) =>
    file
      ? reqForm<CmsEvent>('POST', '/cms/events/', buildForm(data as Record<string, unknown>, { field: 'cover_image', file, clearField: 'cover_image_url' }))
      : req<CmsEvent>('/cms/events/', { method: 'POST', body: JSON.stringify(data) }),
  update: (slug: string, data: Partial<CmsEvent>, file?: File) =>
    file
      ? reqForm<CmsEvent>('PATCH', `/cms/events/${slug}/`, buildForm(data as Record<string, unknown>, { field: 'cover_image', file, clearField: 'cover_image_url' }, EVENT_SKIP))
      : req<CmsEvent>(`/cms/events/${slug}/`, { method: 'PATCH', body: JSON.stringify(stripKeys(data as Record<string, unknown>, EVENT_SKIP)) }),
  remove: (slug: string) => req<void>(`/cms/events/${slug}/`, { method: 'DELETE' }),
};

export const cmsTeam = {
  list: () => req<CmsTeamMember[]>('/cms/team/'),
  create: (data: Partial<CmsTeamMember>, file?: File) =>
    file
      ? reqForm<CmsTeamMember>('POST', '/cms/team/', buildForm(data as Record<string, unknown>, { field: 'photo', file, clearField: 'photo_url' }))
      : req<CmsTeamMember>('/cms/team/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CmsTeamMember>, file?: File) =>
    file
      ? reqForm<CmsTeamMember>('PATCH', `/cms/team/${id}/`, buildForm(data as Record<string, unknown>, { field: 'photo', file, clearField: 'photo_url' }, ['id', 'avatar', 'photo']))
      : req<CmsTeamMember>(`/cms/team/${id}/`, { method: 'PATCH', body: JSON.stringify(stripKeys(data as Record<string, unknown>, ['id', 'avatar', 'photo'])) }),
  remove: (id: string) => req<void>(`/cms/team/${id}/`, { method: 'DELETE' }),
};

export const cmsContact = {
  list: () => req<CmsContact[]>('/cms/contact/'),
  updateStatus: (id: string, status: string) =>
    req<CmsContact>(`/cms/contact/${id}/`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  remove: (id: string) => req<void>(`/cms/contact/${id}/`, { method: 'DELETE' }),
};


// ── Partenaires ──────────────────────────────────────────────────────────────

export type CmsPartner = {
  id: string;
  name: string;
  logo?: string;
  logo_url: string;
  logo_src: string;
  website_url: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const cmsPartners = {
  list: () => req<CmsPartner[]>('/cms/partners/'),
  create: (data: Partial<CmsPartner>, file?: File) =>
    reqForm<CmsPartner>('POST', '/cms/partners/', buildForm(data as Record<string, unknown>, file ? { field: 'logo', file, clearField: 'logo_url' } : undefined)),
  update: (id: string, data: Partial<CmsPartner>, file?: File) =>
    reqForm<CmsPartner>('PATCH', `/cms/partners/${id}/`, buildForm(
      data as Record<string, unknown>,
      file ? { field: 'logo', file, clearField: 'logo_url' } : undefined,
      ['id', 'logo', 'logo_src', 'created_at', 'updated_at'],
    )),
  remove: (id: string) => req<void>(`/cms/partners/${id}/`, { method: 'DELETE' }),
  reorder: (ordered_ids: string[]) => req<void>('/cms/partners/reorder/', { method: 'POST', body: JSON.stringify({ ordered_ids }) }),
};


// -- Documents publics ---------------------------------------------------------

export type CmsPublicDocument = {
  id: string;
  title: string;
  description: string;
  category: string;
  file?: File;
  file_url: string;
  download_url: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const cmsPublicDocuments = {
  list: () => req<CmsPublicDocument[]>("/cms/public-documents/"),
  create: (data: Partial<CmsPublicDocument>, file?: File) => {
    const form = buildForm(data as Record<string, unknown>, file ? { field: "file", file } : undefined);
    return reqForm<CmsPublicDocument>("POST", "/cms/public-documents/", form);
  },
  update: (id: string, data: Partial<CmsPublicDocument>, file?: File) => {
    const form = buildForm(
      data as Record<string, unknown>,
      file ? { field: "file", file } : undefined,
      ['id', 'file', 'download_url', 'created_at', 'updated_at'],
    );
    return reqForm<CmsPublicDocument>("PATCH", `/cms/public-documents/${id}/`, form);
  },
  remove: (id: string) => req<void>(`/cms/public-documents/${id}/`, { method: "DELETE" }),
};

// -- Galerie ------------------------------------------------------------------

export type CmsGalleryMedia = {
  id: string;
  src: string;
  order: number;
};

export type CmsGalleryImage = {
  id: string;
  title: string;
  description: string;
  image: string;
  image_url: string;
  src: string;
  category: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  media: CmsGalleryMedia[];
};

export const cmsGallery = {
  list: () => req<CmsGalleryImage[]>("/cms/gallery/"),
  create: (data: Partial<CmsGalleryImage>, file?: File) => {
    const form = buildForm(data as Record<string, unknown>, file ? { field: "image", file, clearField: "image_url" } : undefined);
    return reqForm<CmsGalleryImage>("POST", "/cms/gallery/", form);
  },
  update: (id: string, data: Partial<CmsGalleryImage>, file?: File) => {
    const form = buildForm(
      data as Record<string, unknown>,
      file ? { field: "image", file, clearField: "image_url" } : undefined,
      GALLERY_SKIP,
    );
    return reqForm<CmsGalleryImage>("PATCH", `/cms/gallery/${id}/`, form);
  },
  remove: (id: string) => req<void>(`/cms/gallery/${id}/`, { method: "DELETE" }),
  addMedia: (id: string, files: File[]): Promise<CmsGalleryMedia[]> => {
    const token = localStorage.getItem('snecea_token');
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    return fetch(`${BASE}/cms/gallery/${id}/add_media/`, {
      method: 'POST',
      headers: token ? { Authorization: `Token ${token}` } : {},
      body: form,
    }).then(async r => {
      if (!r.ok) {
        const body = await r.json().catch(() => ({})) as Record<string, unknown>;
        throw new Error(typeof body.detail === 'string' ? body.detail : `HTTP ${r.status}`);
      }
      return r.json();
    });
  },
  removeMedia: (id: string, mediaId: string) =>
    req<void>(`/cms/gallery/${id}/remove_media/${mediaId}/`, { method: 'DELETE' }),
};

export const cmsMedia = {
  uploadImage: (file: File): Promise<string> => {
    const token = localStorage.getItem('snecea_token');
    const form = new FormData();
    form.append('file', file);
    return fetch(`${BASE}/cms/media/upload/`, {
      method: 'POST',
      headers: token ? { Authorization: `Token ${token}` } : {},
      body: form,
    }).then(async r => {
      if (!r.ok) {
        const body = await r.json().catch(() => ({})) as Record<string, unknown>;
        throw new Error(typeof body.detail === 'string' ? body.detail : `HTTP ${r.status}`);
      }
      const data = await r.json() as { url: string };
      return data.url;
    });
  },
};
