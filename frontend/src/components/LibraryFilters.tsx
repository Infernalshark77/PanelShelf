import type { ComicFilters, LibraryStats } from '../types';

interface LibraryFiltersProps {
  filters: ComicFilters;
  stats: LibraryStats;
  allTags: string[];
  allGenres: string[];
  onChange: (next: Partial<ComicFilters>) => void;
}

export function LibraryFilters({ filters, stats, allTags, allGenres, onChange }: LibraryFiltersProps) {
  return (
    <section className="panel stack">
      <div className="page-header">
        <div>
          <h1>Library</h1>
          <p className="muted">Upload archives or image folders, organize metadata, and jump back in where you left off.</p>
        </div>
        <div className="stats-grid">
          <div className="stat-chip">
            <strong>{stats.total}</strong>
            <span>Total</span>
          </div>
          <div className="stat-chip">
            <strong>{stats.in_progress}</strong>
            <span>Reading</span>
          </div>
          <div className="stat-chip">
            <strong>{stats.read}</strong>
            <span>Finished</span>
          </div>
          <div className="stat-chip">
            <strong>{stats.favorites}</strong>
            <span>Favorites</span>
          </div>
        </div>
      </div>

      <div className="filters-grid">
        <label className="form-control form-control--wide">
          <span>Search</span>
          <input
            className="input"
            placeholder="Title, series, author, publisher..."
            value={filters.q ?? ''}
            onChange={(event) => onChange({ q: event.target.value, page: 1 })}
          />
        </label>

        <label className="form-control">
          <span>Status</span>
          <select
            className="select"
            value={filters.read_status ?? 'all'}
            onChange={(event) => onChange({ read_status: event.target.value as ComicFilters['read_status'], page: 1 })}
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="in_progress">In progress</option>
            <option value="read">Read</option>
          </select>
        </label>

        <label className="form-control">
          <span>Favorite</span>
          <select
            className="select"
            value={typeof filters.favorite === 'boolean' ? String(filters.favorite) : 'all'}
            onChange={(event) => {
              const value = event.target.value;
              onChange({ favorite: value === 'all' ? undefined : value === 'true', page: 1 });
            }}
          >
            <option value="all">All</option>
            <option value="true">Favorites</option>
            <option value="false">Not favorite</option>
          </select>
        </label>

        <label className="form-control">
          <span>Tag</span>
          <select className="select" value={filters.tag ?? ''} onChange={(event) => onChange({ tag: event.target.value || undefined, page: 1 })}>
            <option value="">Any</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control">
          <span>Genre</span>
          <select
            className="select"
            value={filters.genre ?? ''}
            onChange={(event) => onChange({ genre: event.target.value || undefined, page: 1 })}
          >
            <option value="">Any</option>
            {allGenres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control">
          <span>Sort</span>
          <select
            className="select"
            value={filters.sort ?? 'recent'}
            onChange={(event) => onChange({ sort: event.target.value as ComicFilters['sort'], page: 1 })}
          >
            <option value="recent">Recently added</option>
            <option value="title">Title</option>
            <option value="series">Series</option>
            <option value="progress">Progress</option>
          </select>
        </label>
      </div>
    </section>
  );
}
