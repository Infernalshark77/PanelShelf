export type ReadStatus = 'unread' | 'in_progress' | 'read';
export type ReadingDirection = 'ltr' | 'rtl';
export type ReaderMode = 'single' | 'double' | 'scroll';
export type FitMode = 'width' | 'height' | 'natural';

export interface AuthStatus {
  auth_enabled: boolean;
  authenticated: boolean;
  username: string | null;
}

export interface Bookmark {
  id: string;
  page: number;
  note: string | null;
  created_at: string;
}

export interface ComicSummary {
  id: string;
  title: string;
  series: string | null;
  volume: string | null;
  issue_number: string | null;
  author: string | null;
  publisher: string | null;
  summary: string | null;
  source_type: string;
  original_filename: string;
  page_count: number;
  favorite: boolean;
  read_status: ReadStatus;
  current_page: number;
  progress_percent: number;
  is_completed: boolean;
  default_reading_direction: ReadingDirection;
  added_at: string;
  updated_at: string;
  last_read_at: string | null;
  tags: string[];
  genres: string[];
  thumbnail_url: string;
  cover_url: string;
  resume_url: string;
}

export interface ComicDetail extends ComicSummary {
  bookmarks: Bookmark[];
}

export interface LibraryStats {
  total: number;
  favorites: number;
  unread: number;
  in_progress: number;
  read: number;
}

export interface ComicListResponse {
  items: ComicSummary[];
  total: number;
  page: number;
  per_page: number;
  stats: LibraryStats;
}

export interface ComicFilters {
  q?: string;
  favorite?: boolean;
  read_status?: ReadStatus | 'all';
  tag?: string;
  genre?: string;
  sort?: 'recent' | 'title' | 'series' | 'progress';
  page?: number;
  per_page?: number;
}

export interface ComicUpdatePayload {
  title?: string | null;
  series?: string | null;
  volume?: string | null;
  issue_number?: string | null;
  author?: string | null;
  publisher?: string | null;
  summary?: string | null;
  favorite?: boolean;
  read_status?: ReadStatus;
  default_reading_direction?: ReadingDirection;
  tags?: string[];
  genres?: string[];
}

export interface LabelItem {
  name: string;
  kind: 'tag' | 'genre' | string;
}
