# PanelShelf

PanelShelf is a self-hosted web app for uploading, organizing, and reading digital comics on a personal server.

It is designed for a single-user setup, defaults to simple local disk storage and SQLite, and keeps the code modular so you can extend it later.

## Why this stack

- **Backend: FastAPI + SQLAlchemy 2.0**
  - Great fit for file-heavy personal apps.
  - Python has mature libraries for PDF rendering, archive handling, and thumbnail generation.
  - FastAPI keeps the API simple and typed.
- **Frontend: React + TypeScript + Vite**
  - Responsive SPA with a polished reader UI.
  - Vite keeps the frontend fast and lightweight for local development.
- **Database: SQLite by default, PostgreSQL optional**
  - SQLite keeps self-hosting dead simple.
  - PostgreSQL can be enabled later with a `DATABASE_URL` switch.
- **Storage model**
  - Original uploads stay on disk.
  - Pages are not fully extracted up front.
  - Thumbnails and rendered page images are cached on demand.

## MVP capabilities

### Upload and storage
- CBZ, CBR, PDF, ZIP of images, and folders of images
- Stores original files on disk under `/data/library`
- Builds a lightweight page manifest instead of duplicating extracted pages
- Generates cover thumbnails automatically
- Supports manual cover uploads

### Library
- Series / volume / issue metadata
- Tags and genres
- Favorites
- Read state and progress
- Search and filtering
- Sort by recent, title, series, and progress

### Reader
- Single page mode
- Double page spread
- Long vertical scroll mode
- Fit width / fit height / natural size
- Zoom and pan in single or double mode
- Right-to-left reading toggle
- Fullscreen mode
- Keyboard shortcuts
- Resume from last page
- Bookmark pages

## Architecture

```text
Browser (React SPA)
  ├── Library UI
  ├── Metadata editor
  └── Reader UI
          │
          ▼
FastAPI backend
  ├── Auth routes
  ├── Library / comic routes
  ├── Reader image routes
  ├── Metadata services
  ├── Storage services
  └── Thumbnail / page cache services
          │
          ├── SQLite or PostgreSQL
          └── Local disk storage (/data)
                ├── library/
                ├── cache/pages/
                ├── cache/thumbs/
                └── media/covers/
```

## Project structure

```text
panelshelf/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py
│   │   │   └── routes/
│   │   │       ├── auth.py
│   │   │       ├── comics.py
│   │   │       ├── labels.py
│   │   │       └── system.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── security.py
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   ├── init_db.py
│   │   │   └── session.py
│   │   ├── models/
│   │   │   ├── bookmark.py
│   │   │   ├── comic.py
│   │   │   └── label.py
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── bookmark.py
│   │   │   ├── comic.py
│   │   │   └── label.py
│   │   ├── services/
│   │   │   ├── comics.py
│   │   │   ├── metadata.py
│   │   │   ├── page_sources.py
│   │   │   └── storage.py
│   │   ├── utils/
│   │   │   ├── dates.py
│   │   │   ├── files.py
│   │   │   └── image.py
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── schema.sql
└── README.md
```

## Install and run

### 1. Clone and configure

```bash
cp .env.example .env
```

Edit `.env` and at minimum change:

```env
SECRET_KEY=replace-with-a-long-random-string
APP_PASSWORD=replace-with-your-password
```

### 2. Start with Docker Compose

```bash
docker compose up --build
```

Open:

```text
http://localhost:8080
```

### 3. Data persistence

By default, all persistent data is stored locally in:

```text
./data
```

That includes:
- database file when using SQLite
- original uploads
- cached reader pages
- thumbnails and manual covers

## PostgreSQL mode (optional)

1. Start the postgres profile:

```bash
docker compose --profile postgres up --build
```

2. Set this in `.env`:

```env
DATABASE_URL=postgresql+psycopg://panelshelf:panelshelf@postgres:5432/panelshelf
```

## Local development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:8000`.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `APP_NAME` | `PanelShelf` | Display name |
| `SECRET_KEY` | `change-me-in-production` | Cookie signing secret |
| `AUTH_ENABLED` | `true` | Enable simple login gate |
| `APP_USERNAME` | `admin` | Login username |
| `APP_PASSWORD` | `change-me` | Login password |
| `DATABASE_URL` | `sqlite:////data/app.db` | SQLite or PostgreSQL connection |
| `LIBRARY_ROOT` | `/data/library` | Original uploads |
| `CACHE_ROOT` | `/data/cache` | Page and thumbnail cache |
| `MEDIA_ROOT` | `/data/media` | Manual cover storage |
| `CORS_ORIGINS` | `http://localhost:8080,http://localhost:5173` | Allowed origins |
| `THUMBNAIL_WIDTH` | `400` | Cover thumbnail width |
| `THUMBNAIL_HEIGHT` | `600` | Cover thumbnail height |
| `PAGE_CACHE_MAX_DIMENSION` | `2400` | Max cached page image edge |

## API routes

### Auth
- `GET /api/auth/me`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### System
- `GET /api/health`
- `GET /api/config`

### Library / comics
- `GET /api/comics`
- `POST /api/comics/upload`
- `POST /api/comics/upload-folder`
- `GET /api/comics/{comic_id}`
- `PATCH /api/comics/{comic_id}`
- `DELETE /api/comics/{comic_id}`
- `POST /api/comics/{comic_id}/cover`
- `GET /api/comics/{comic_id}/thumbnail`
- `GET /api/comics/{comic_id}/pages/{page_number}`
- `PUT /api/comics/{comic_id}/progress`
- `POST /api/comics/{comic_id}/bookmarks`
- `DELETE /api/comics/{comic_id}/bookmarks/{bookmark_id}`
- `GET /api/labels`

## Reader shortcuts

- `Left / Right`: previous or next page depending on reading direction
- `Up / Down`: previous or next page
- `Space`: next page
- `1`: single page mode
- `2`: double spread mode
- `3`: vertical scroll mode
- `W`: fit width
- `H`: fit height
- `R`: toggle right-to-left
- `B`: bookmark current page
- `F`: fullscreen
- `?`: shortcut help

## File handling notes

- **CBZ / ZIP**: pages are read directly from the archive
- **CBR**: pages are read through `rarfile` with `unar` inside the container
- **PDF**: pages are rendered on demand with PyMuPDF
- **Image folders**: original files are stored as-is
- **Caching**: thumbnails and resized page images are generated only when needed

## Database schema

See `schema.sql` for the full SQL schema used by the MVP.

## Security notes

This app is designed for a personal, home-server workflow.

Reasonable defaults included in the MVP:
- optional login gate
- signed session cookie
- same-origin API requests by default
- no public multi-user features
- no code execution or plugin system

If you expose it to the internet, put it behind HTTPS and a reverse proxy.

## Future improvements

- Better filename parsing and metadata import from ComicInfo.xml
- OPDS-style feeds or external reader integration
- OCR / text search
- Virtualized long-scroll rendering for very large books
- Background thumbnail pre-generation jobs
- Duplicate detection via file hashing
- Per-comic reader presets and spread rules
- Multi-device sync conflict handling
- Better two-page spread handling for covers and chapter breaks
- Optional user-created collections / shelves
- Import/export of metadata backups
