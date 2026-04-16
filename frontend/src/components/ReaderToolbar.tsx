import { Link } from 'react-router-dom';

import type { ComicDetail, FitMode, ReaderMode, ReadingDirection } from '../types';

interface ReaderToolbarProps {
  comic: ComicDetail;
  page: number;
  mode: ReaderMode;
  fit: FitMode;
  direction: ReadingDirection;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onModeChange: (mode: ReaderMode) => void;
  onFitChange: (fit: FitMode) => void;
  onDirectionChange: (direction: ReadingDirection) => void;
  onAddBookmark: () => void;
  onFullscreen: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onToggleHelp: () => void;
}

export function ReaderToolbar({
  comic,
  page,
  mode,
  fit,
  direction,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  onModeChange,
  onFitChange,
  onDirectionChange,
  onAddBookmark,
  onFullscreen,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleHelp,
}: ReaderToolbarProps) {
  return (
    <div className="reader__toolbar">
      <div className="reader__toolbar-row">
        <div className="reader__title-group">
          <Link to={`/comics/${comic.id}`} className="button button--ghost">
            Back
          </Link>
          <div>
            <strong>{comic.title}</strong>
            <div className="muted">
              Page {page} of {comic.page_count}
            </div>
          </div>
        </div>

        <div className="button-group button-group--wrap">
          <button type="button" className="button button--ghost" onClick={onPrev} disabled={!canGoPrev}>
            Prev
          </button>
          <button type="button" className="button button--ghost" onClick={onNext} disabled={!canGoNext}>
            Next
          </button>
          <button type="button" className="button button--ghost" onClick={onAddBookmark}>
            Bookmark
          </button>
          <button type="button" className="button button--ghost" onClick={onFullscreen}>
            Fullscreen
          </button>
          <button type="button" className="button button--ghost" onClick={onToggleHelp}>
            Shortcuts
          </button>
        </div>
      </div>

      <div className="reader__toolbar-row reader__toolbar-row--controls">
        <label className="form-control form-control--inline">
          <span>Mode</span>
          <select className="select" value={mode} onChange={(event) => onModeChange(event.target.value as ReaderMode)}>
            <option value="single">Single page</option>
            <option value="double">Double spread</option>
            <option value="scroll">Vertical scroll</option>
          </select>
        </label>

        <label className="form-control form-control--inline">
          <span>Fit</span>
          <select className="select" value={fit} onChange={(event) => onFitChange(event.target.value as FitMode)}>
            <option value="width">Fit width</option>
            <option value="height">Fit height</option>
            <option value="natural">Natural</option>
          </select>
        </label>

        <label className="form-control form-control--inline">
          <span>Direction</span>
          <select
            className="select"
            value={direction}
            onChange={(event) => onDirectionChange(event.target.value as ReadingDirection)}
          >
            <option value="ltr">Left → Right</option>
            <option value="rtl">Right → Left</option>
          </select>
        </label>

        {onZoomIn && onZoomOut && onResetZoom ? (
          <div className="button-group">
            <button type="button" className="button button--ghost" onClick={onZoomOut}>
              −
            </button>
            <button type="button" className="button button--ghost" onClick={onResetZoom}>
              100%
            </button>
            <button type="button" className="button button--ghost" onClick={onZoomIn}>
              +
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
