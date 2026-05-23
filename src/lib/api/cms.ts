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
    const body = await res.json().catch(() => ({}));
    throw new Error((body as Record<string, unknown>).detail as string ?? `HTTP ${res.status}`);
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
    const body = await res.json().catch(() => ({}));
    throw new Error((body as Record<string, unknown>).detail as string ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function buildForm(data: Record<string, unknown>, file?: { field: string; file: File }): FormData {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') fd.append(k, String(v));
  });
  if (file) fd.append(file.field, file.file);
  return fd;
}

export interface CmsSlide {
  id: string; title: string; subtitle: string; badge_text: string;
  background: string; image_url: string;
  cta_label: string; cta_url: string;
  cta_label_secondary: string; cta_url_secondary: string; order: number;
}
export interface CmsService {
  id: string; title: string; slug: string; icon: string;
  short_description: string; body: string; order: number;
}
export interface CmsArticle {
  id: string; title: string; slug: string; excerpt: string;
  cover: string; cover_image_url: string; author_name: string;
  category: string; status: string; is_featured: boolean;
  published_at: string | null; created_at: string; body: string;
}
export interface CmsEvent {
  id: string; title: string; slug: string; description: string;
  cover: string; cover_image_url: string; location: string; address: string;
  start_date: string; end_date: string | null; status: string;
  is_featured: boolean; registration_url: string; created_at: string;
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
      ? reqForm<CmsSlide>('POST', '/cms/slides/', buildForm(data as Record<string, unknown>, { field: 'image', file }))
      : req<CmsSlide>('/cms/slides/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CmsSlide>, file?: File) =>
    file
      ? reqForm<CmsSlide>('PATCH', `/cms/slides/${id}/`, buildForm(data as Record<string, unknown>, { field: 'image', file }))
      : req<CmsSlide>(`/cms/slides/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => req<void>(`/cms/slides/${id}/`, { method: 'DELETE' }),
};

export const cmsServices = {
  list: () => req<CmsService[]>('/cms/services/'),
  create: (data: Partial<CmsService>) =>
    req<CmsService>('/cms/services/', { method: 'POST', body: JSON.stringify(data) }),
  update: (slug: string, data: Partial<CmsService>) =>
    req<CmsService>(`/cms/services/${slug}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (slug: string) => req<void>(`/cms/services/${slug}/`, { method: 'DELETE' }),
};

export const cmsArticles = {
  list: () => req<CmsArticle[]>('/cms/articles/'),
  create: (data: Partial<CmsArticle>, file?: File) =>
    file
      ? reqForm<CmsArticle>('POST', '/cms/articles/', buildForm(data as Record<string, unknown>, { field: 'cover_image', file }))
      : req<CmsArticle>('/cms/articles/', { method: 'POST', body: JSON.stringify(data) }),
  update: (slug: string, data: Partial<CmsArticle>, file?: File) =>
    file
      ? reqForm<CmsArticle>('PATCH', `/cms/articles/${slug}/`, buildForm(data as Record<string, unknown>, { field: 'cover_image', file }))
      : req<CmsArticle>(`/cms/articles/${slug}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (slug: string) => req<void>(`/cms/articles/${slug}/`, { method: 'DELETE' }),
};

export const cmsEvents = {
  list: () => req<CmsEvent[]>('/cms/events/'),
  create: (data: Partial<CmsEvent>, file?: File) =>
    file
      ? reqForm<CmsEvent>('POST', '/cms/events/', buildForm(data as Record<string, unknown>, { field: 'cover_image', file }))
      : req<CmsEvent>('/cms/events/', { method: 'POST', body: JSON.stringify(data) }),
  update: (slug: string, data: Partial<CmsEvent>, file?: File) =>
    file
      ? reqForm<CmsEvent>('PATCH', `/cms/events/${slug}/`, buildForm(data as Record<string, unknown>, { field: 'cover_image', file }))
      : req<CmsEvent>(`/cms/events/${slug}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (slug: string) => req<void>(`/cms/events/${slug}/`, { method: 'DELETE' }),
};

export const cmsTeam = {
  list: () => req<CmsTeamMember[]>('/cms/team/'),
  create: (data: Partial<CmsTeamMember>, file?: File) =>
    file
      ? reqForm<CmsTeamMember>('POST', '/cms/team/', buildForm(data as Record<string, unknown>, { field: 'photo', file }))
      : req<CmsTeamMember>('/cms/team/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CmsTeamMember>, file?: File) =>
    file
      ? reqForm<CmsTeamMember>('PATCH', `/cms/team/${id}/`, buildForm(data as Record<string, unknown>, { field: 'photo', file }))
      : req<CmsTeamMember>(`/cms/team/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => req<void>(`/cms/team/${id}/`, { method: 'DELETE' }),
};

export const cmsContact = {
  list: () => req<CmsContact[]>('/cms/contact/'),
  updateStatus: (id: string, status: string) =>
    req<CmsContact>(`/cms/contact/${id}/`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  remove: (id: string) => req<void>(`/cms/contact/${id}/`, { method: 'DELETE' }),
};
