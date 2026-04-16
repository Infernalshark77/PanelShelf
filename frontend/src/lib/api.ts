import type {
  AuthStatus,
  Bookmark,
  ComicDetail,
  ComicFilters,
  ComicListResponse,
  ComicUpdatePayload,
  LabelItem,
} from '../types';

class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const payload = await response.json();
      detail = payload.detail ?? JSON.stringify(payload);
    } catch {
      detail = await response.text();
    }
    throw new ApiError(response.status, detail || 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

function buildComicQuery(filters: ComicFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (typeof filters.favorite === 'boolean') params.set('favorite', String(filters.favorite));
  if (filters.read_status && filters.read_status !== 'all') params.set('read_status', filters.read_status);
  if (filters.tag) params.set('tag', filters.tag);
  if (filters.genre) params.set('genre', filters.genre);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.per_page) params.set('per_page', String(filters.per_page));
  const query = params.toString();
  return query ? `?${query}` : '';
}

export { ApiError };

export const api = {
  authStatus: () => apiFetch<AuthStatus>('/api/auth/me'),
  login: (username: string, password: string) =>
    apiFetch<AuthStatus>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),
  logout: () =>
    apiFetch<AuthStatus>('/api/auth/logout', {
      method: 'POST',
    }),
  config: () => apiFetch<{ app_name: string; auth_enabled: boolean }>('/api/config'),
  listComics: (filters: ComicFilters) => apiFetch<ComicListResponse>(`/api/comics${buildComicQuery(filters)}`),
  getComic: (id: string) => apiFetch<ComicDetail>(`/api/comics/${id}`),
  updateComic: (id: string, payload: ComicUpdatePayload) =>
    apiFetch<ComicDetail>(`/api/comics/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  deleteComic: (id: string) =>
    apiFetch<void>(`/api/comics/${id}`, {
      method: 'DELETE',
    }),
  uploadComic: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiFetch<ComicDetail>('/api/comics/upload', { method: 'POST', body: form });
  },
  uploadFolder: async (files: File[]) => {
    const form = new FormData();
    files.forEach((file) => {
      form.append('files', file);
      const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      form.append('paths', path);
    });
    return apiFetch<ComicDetail>('/api/comics/upload-folder', { method: 'POST', body: form });
  },
  uploadCover: async (comicId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiFetch<ComicDetail>(`/api/comics/${comicId}/cover`, { method: 'POST', body: form });
  },
  updateProgress: (comicId: string, currentPage: number) =>
    apiFetch<ComicDetail>(`/api/comics/${comicId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_page: currentPage }),
    }),
  addBookmark: (comicId: string, page: number, note?: string) =>
    apiFetch<Bookmark>(`/api/comics/${comicId}/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page, note }),
    }),
  deleteBookmark: (comicId: string, bookmarkId: string) =>
    apiFetch<void>(`/api/comics/${comicId}/bookmarks/${bookmarkId}`, { method: 'DELETE' }),
  listLabels: () => apiFetch<LabelItem[]>('/api/labels'),
};
