CREATE TABLE IF NOT EXISTS comics (
  id TEXT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  series VARCHAR(255),
  volume VARCHAR(50),
  issue_number VARCHAR(50),
  author VARCHAR(255),
  publisher VARCHAR(255),
  summary TEXT,
  source_type VARCHAR(20) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  original_path TEXT NOT NULL,
  manifest_path TEXT NOT NULL,
  cover_path TEXT,
  page_count INTEGER NOT NULL DEFAULT 0,
  favorite BOOLEAN NOT NULL DEFAULT 0,
  read_status VARCHAR(20) NOT NULL DEFAULT 'unread',
  current_page INTEGER NOT NULL DEFAULT 1,
  progress_percent REAL NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT 0,
  default_reading_direction VARCHAR(3) NOT NULL DEFAULT 'ltr',
  metadata_source VARCHAR(20) NOT NULL DEFAULT 'filename',
  added_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  last_read_at DATETIME
);

CREATE INDEX IF NOT EXISTS ix_comics_title ON comics (title);
CREATE INDEX IF NOT EXISTS ix_comics_series ON comics (series);
CREATE INDEX IF NOT EXISTS ix_comics_source_type ON comics (source_type);
CREATE INDEX IF NOT EXISTS ix_comics_favorite ON comics (favorite);
CREATE INDEX IF NOT EXISTS ix_comics_read_status ON comics (read_status);
CREATE INDEX IF NOT EXISTS ix_comics_progress_percent ON comics (progress_percent);
CREATE INDEX IF NOT EXISTS ix_comics_is_completed ON comics (is_completed);
CREATE INDEX IF NOT EXISTS ix_comics_added_at ON comics (added_at);
CREATE INDEX IF NOT EXISTS ix_comics_last_read_at ON comics (last_read_at);

CREATE TABLE IF NOT EXISTS labels (
  id TEXT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  kind VARCHAR(20) NOT NULL DEFAULT 'tag',
  CONSTRAINT uq_label_name_kind UNIQUE (name, kind)
);

CREATE INDEX IF NOT EXISTS ix_labels_name ON labels (name);
CREATE INDEX IF NOT EXISTS ix_labels_kind ON labels (kind);

CREATE TABLE IF NOT EXISTS comic_labels (
  comic_id TEXT NOT NULL,
  label_id TEXT NOT NULL,
  PRIMARY KEY (comic_id, label_id),
  FOREIGN KEY (comic_id) REFERENCES comics(id) ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  comic_id TEXT NOT NULL,
  page INTEGER NOT NULL,
  note VARCHAR(255),
  created_at DATETIME NOT NULL,
  FOREIGN KEY (comic_id) REFERENCES comics(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_bookmarks_comic_id ON bookmarks (comic_id);
CREATE INDEX IF NOT EXISTS ix_bookmarks_page ON bookmarks (page);
