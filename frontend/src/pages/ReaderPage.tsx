import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';

import { ReaderToolbar } from '../components/ReaderToolbar';
import { ShortcutHelp } from '../components/ShortcutHelp';
import { useDebouncedEffect } from '../hooks/useDebouncedEffect';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import { api, ApiError } from '../lib/api';
import type { ComicDetail, FitMode, ReaderMode, ReadingDirection } from '../types';

interface ReaderPrefs {
  mode: ReaderMode;
  fit: FitMode;
  direction: ReadingDirection;
}

const DEFAULT_PREFS: ReaderPrefs = {
  mode: 'single',
  fit: 'width',
  direction: 'ltr',
};

function clampPage(page: number, maxPage: number) {
  return Math.max(1, Math.min(page, maxPage));
}

export function ReaderPage() {
  const { comicId = '' } = useParams();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageFromQuery = Number(searchParams.get('page') || '0');
  const readerRootRef = useRef<HTMLDivElement | null>(null);
  const pageElementMap = useRef<Record<number, HTMLDivElement | null>>({});
  const scrollInitializedRef = useRef(false);

  const [prefs, setPrefs] = useLocalStorageState<ReaderPrefs>(`panelshelf-reader-prefs-${comicId}`, DEFAULT_PREFS);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const comicQuery = useQuery({
    queryKey: ['comic', comicId],
    queryFn: () => api.getComic(comicId),
    enabled: Boolean(comicId),
  });

  const progressMutation = useMutation({
    mutationFn: (currentPage: number) => api.updateProgress(comicId, currentPage),
    onSuccess: (comic) => {
      queryClient.setQueryData(['comic', comicId], comic);
      void queryClient.invalidateQueries({ queryKey: ['comics'] });
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: (currentPage: number) => api.addBookmark(comicId, currentPage),
    onSuccess: () => {
      setMessage('Bookmark saved.');
      void queryClient.invalidateQueries({ queryKey: ['comic', comicId] });
    },
    onError: (error) => {
      setErrorMessage(error instanceof ApiError ? error.detail : 'Could not save bookmark.');
    },
  });

  const comic = comicQuery.data;
  const maxPage = comic?.page_count ?? 1;

  useEffect(() => {
    if (!message && !errorMessage) return;
    const timeout = window.setTimeout(() => {
      setMessage(null);
      setErrorMessage(null);
    }, 2200);
    return () => window.clearTimeout(timeout);
  }, [message, errorMessage]);
  const direction = prefs.direction || comic?.default_reading_direction || 'ltr';
  const step = prefs.mode === 'double' ? 2 : 1;

  useEffect(() => {
    if (!comic) return;
    const initialPage = clampPage(pageFromQuery || comic.current_page || 1, comic.page_count || 1);
    setPage(initialPage);
    setPrefs((current) => ({
      ...current,
      direction: current.direction || comic.default_reading_direction || 'ltr',
    }));
  }, [comic, pageFromQuery, setPrefs]);

  useEffect(() => {
    if (!page) return;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('page', String(page));
      return next;
    }, { replace: true });
  }, [page, setSearchParams]);

  useDebouncedEffect(
    () => {
      if (!comic) return;
      if (page === comic.current_page) return;
      progressMutation.mutate(page);
    },
    400,
    [page, comicId, comic?.current_page],
  );

  useEffect(() => {
    if (!comic) return;
    if (prefs.mode !== 'scroll') {
      scrollInitializedRef.current = false;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio);
        if (!visible.length) return;
        const nextPage = Number((visible[0].target as HTMLElement).dataset.page || '1');
        setPage((current) => (current === nextPage ? current : nextPage));
      },
      { threshold: [0.45, 0.7, 0.9] },
    );

    Object.values(pageElementMap.current).forEach((element) => {
      if (element) observer.observe(element);
    });

    if (!scrollInitializedRef.current) {
      pageElementMap.current[page]?.scrollIntoView({ block: 'start', behavior: 'auto' });
      scrollInitializedRef.current = true;
    }

    return () => observer.disconnect();
  }, [comic, page, prefs.mode]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!comic) return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      const nextAction = () => {
        event.preventDefault();
        goNext();
      };
      const prevAction = () => {
        event.preventDefault();
        goPrev();
      };

      if (event.key === '?') {
        event.preventDefault();
        setShowHelp((current) => !current);
        return;
      }
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        void toggleFullscreen();
        return;
      }
      if (event.key.toLowerCase() === 'b') {
        event.preventDefault();
        bookmarkMutation.mutate(page);
        return;
      }
      if (event.key === '1') {
        setPrefs((current) => ({ ...current, mode: 'single' }));
        return;
      }
      if (event.key === '2') {
        setPrefs((current) => ({ ...current, mode: 'double' }));
        return;
      }
      if (event.key === '3') {
        setPrefs((current) => ({ ...current, mode: 'scroll' }));
        return;
      }
      if (event.key.toLowerCase() === 'w') {
        setPrefs((current) => ({ ...current, fit: 'width' }));
        return;
      }
      if (event.key.toLowerCase() === 'h') {
        setPrefs((current) => ({ ...current, fit: 'height' }));
        return;
      }
      if (event.key.toLowerCase() === 'r') {
        setPrefs((current) => ({ ...current, direction: current.direction === 'rtl' ? 'ltr' : 'rtl' }));
        return;
      }

      if (direction === 'rtl') {
        if (event.key === 'ArrowLeft' || event.key === ' ') nextAction();
        if (event.key === 'ArrowRight') prevAction();
      } else {
        if (event.key === 'ArrowRight' || event.key === ' ') nextAction();
        if (event.key === 'ArrowLeft') prevAction();
      }
      if (event.key === 'ArrowDown') nextAction();
      if (event.key === 'ArrowUp') prevAction();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bookmarkMutation, comic, direction, page, prefs.mode, setPrefs]);

  function scrollToPage(nextPage: number) {
    const bounded = clampPage(nextPage, maxPage);
    setPage(bounded);
    if (prefs.mode === 'scroll') {
      pageElementMap.current[bounded]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function goNext() {
    if (prefs.mode === "double" && page + 1 >= maxPage) return;
    scrollToPage(page + step);
  }

  function goPrev() {
    scrollToPage(page - step);
  }

  async function toggleFullscreen() {
    const root = readerRootRef.current;
    if (!root) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await root.requestFullscreen();
    }
  }

  const visiblePages = useMemo(() => {
    if (!comic) return [] as number[];
    if (prefs.mode === 'double') {
      const secondPage = Math.min(page + 1, comic.page_count);
      return secondPage === page ? [page] : [page, secondPage];
    }
    return [page];
  }, [comic, page, prefs.mode]);

  if (comicQuery.isLoading) {
    return <div className="reader reader--loading">Loading reader...</div>;
  }

  if (!comic) {
    return <div className="reader reader--loading">Comic not found.</div>;
  }

  return (
    <div className="reader" ref={readerRootRef}>
      <ReaderToolbar
        comic={comic}
        page={page}
        mode={prefs.mode}
        fit={prefs.fit}
        direction={direction}
        canGoPrev={page > 1}
        canGoNext={prefs.mode === "double" ? page + 1 < maxPage : page < maxPage}
        onPrev={goPrev}
        onNext={goNext}
        onModeChange={(mode) => setPrefs((current) => ({ ...current, mode }))}
        onFitChange={(fit) => setPrefs((current) => ({ ...current, fit }))}
        onDirectionChange={(nextDirection) => setPrefs((current) => ({ ...current, direction: nextDirection }))}
        onAddBookmark={() => bookmarkMutation.mutate(page)}
        onFullscreen={() => void toggleFullscreen()}
        onToggleHelp={() => setShowHelp((current) => !current)}
      />

      <div className="reader__bookmark-strip">
        <Link className="chip chip--subtle" to={`/comics/${comic.id}`}>
          Library details
        </Link>
        {comic.bookmarks.slice(0, 10).map((bookmark) => (
          <button
            key={bookmark.id}
            type="button"
            className="chip chip--subtle"
            onClick={() => scrollToPage(bookmark.page)}
          >
            Page {bookmark.page}
          </button>
        ))}
      </div>

      {message ? <div className="reader__flash reader__flash--success">{message}</div> : null}
      {errorMessage ? <div className="reader__flash reader__flash--error">{errorMessage}</div> : null}

      {showHelp ? (
        <div className="reader__overlay">
          <ShortcutHelp />
        </div>
      ) : null}

      <div className="reader__viewport">
        {prefs.mode === 'scroll' ? (
          <div className={`reader__scroll reader__scroll--${prefs.fit}`}>
            {Array.from({ length: comic.page_count }, (_, index) => index + 1).map((pageNumber) => (
              <div
                className="reader__scroll-page"
                key={pageNumber}
                data-page={pageNumber}
                ref={(element) => {
                  pageElementMap.current[pageNumber] = element;
                }}
              >
                <img
                  className={`reader__image reader__image--${prefs.fit}`}
                  src={`/api/comics/${comic.id}/pages/${pageNumber}?max_dimension=2400`}
                  alt={`${comic.title} page ${pageNumber}`}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        ) : (
          <TransformWrapper minScale={0.6} maxScale={5} centerOnInit>
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="reader__zoom-toolbar">
                  <button type="button" className="button button--ghost" onClick={() => zoomOut()}>
                    −
                  </button>
                  <button type="button" className="button button--ghost" onClick={() => resetTransform()}>
                    Reset zoom
                  </button>
                  <button type="button" className="button button--ghost" onClick={() => zoomIn()}>
                    +
                  </button>
                </div>
                <TransformComponent wrapperClass="reader__transform-wrapper" contentClass="reader__transform-content">
                  <div className={`reader__spread reader__spread--${prefs.fit} ${direction === 'rtl' ? 'reader__spread--rtl' : ''}`}>
                    {visiblePages.map((pageNumber) => (
                      <div className="reader__spread-page" key={pageNumber}>
                        <img
                          className={`reader__image reader__image--${prefs.fit}`}
                          src={`/api/comics/${comic.id}/pages/${pageNumber}?max_dimension=2800`}
                          alt={`${comic.title} page ${pageNumber}`}
                        />
                      </div>
                    ))}
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        )}
      </div>

      <div className="reader__footer">
        <button type="button" className="button button--ghost" disabled={page <= 1} onClick={goPrev}>
          Previous
        </button>
        <div className="reader__footer-center">
          <div className="progress progress--reader">
            <div className="progress__bar" style={{ width: `${(page / maxPage) * 100}%` }} />
          </div>
          <span className="muted">
            {page} / {maxPage}
          </span>
        </div>
        <button type="button" className="button button--ghost" disabled={prefs.mode === "double" ? page + 1 >= maxPage : page >= maxPage} onClick={goNext}>
          Next
        </button>
      </div>
    </div>
  );
}
