import { Link } from 'react-router-dom';

import type { ComicSummary } from '../types';

interface ComicCardProps {
  comic: ComicSummary;
  onToggleFavorite: (comic: ComicSummary) => void;
}

function formatSubline(comic: ComicSummary) {
  const parts = [comic.series, comic.volume ? `Vol. ${comic.volume}` : null, comic.issue_number ? `#${comic.issue_number}` : null];
  return parts.filter(Boolean).join(' • ');
}

export function ComicCard({ comic, onToggleFavorite }: ComicCardProps) {
  const progressLabel = comic.page_count > 0 ? `${comic.current_page}/${comic.page_count}` : '0/0';
  return (
    <article className="comic-card panel">
      <Link to={`/comics/${comic.id}`} className="comic-card__cover-link">
        <img className="comic-card__cover" src={comic.thumbnail_url} alt={`${comic.title} cover`} loading="lazy" />
      </Link>
      <div className="comic-card__body">
        <div className="comic-card__header">
          <div>
            <Link to={`/comics/${comic.id}`} className="comic-card__title">
              {comic.title}
            </Link>
            <div className="muted">{formatSubline(comic) || comic.original_filename}</div>
          </div>
          <button
            type="button"
            className={`icon-button ${comic.favorite ? 'icon-button--active' : ''}`}
            onClick={() => onToggleFavorite(comic)}
            aria-label={comic.favorite ? 'Remove favorite' : 'Add favorite'}
            title={comic.favorite ? 'Remove favorite' : 'Add favorite'}
          >
            ★
          </button>
        </div>

        <div className="chip-row">
          <span className="chip">{comic.read_status.replace('_', ' ')}</span>
          <span className="chip">{progressLabel}</span>
          {comic.genres[0] ? <span className="chip chip--accent">{comic.genres[0]}</span> : null}
        </div>

        {comic.summary ? <p className="comic-card__summary">{comic.summary}</p> : null}

        <div className="progress">
          <div className="progress__bar" style={{ width: `${comic.progress_percent}%` }} />
        </div>

        <div className="comic-card__footer">
          <div className="tag-list">
            {comic.tags.slice(0, 3).map((tag) => (
              <span className="chip chip--subtle" key={tag}>
                {tag}
              </span>
            ))}
          </div>
          <Link to={`/reader/${comic.id}`} className="button button--ghost">
            {comic.current_page > 1 ? 'Resume' : 'Read'}
          </Link>
        </div>
      </div>
    </article>
  );
}
