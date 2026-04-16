import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ComicCard } from '../components/ComicCard';
import { LibraryFilters } from '../components/LibraryFilters';
import { UploadPanel } from '../components/UploadPanel';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import { api, ApiError } from '../lib/api';
import type { ComicFilters, ComicSummary } from '../types';

const DEFAULT_FILTERS: ComicFilters = {
  q: '',
  read_status: 'all',
  sort: 'recent',
  page: 1,
  per_page: 24,
};

export function LibraryPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useLocalStorageState<ComicFilters>('panelshelf-library-filters', DEFAULT_FILTERS);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const comicsQuery = useQuery({
    queryKey: ['comics', filters],
    queryFn: () => api.listComics(filters),
  });

  const labelsQuery = useQuery({
    queryKey: ['labels'],
    queryFn: api.listLabels,
  });

  const toggleFavorite = useMutation({
    mutationFn: (comic: ComicSummary) => api.updateComic(comic.id, { favorite: !comic.favorite }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comics'] });
      setMessage('Favorite status updated.');
    },
    onError: (error) => {
      setErrorMessage(error instanceof ApiError ? error.detail : 'Could not update favorite.');
    },
  });

  const uploadArchive = useMutation({
    mutationFn: api.uploadComic,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comics'] });
      setMessage('Comic uploaded successfully.');
    },
    onError: (error) => {
      setErrorMessage(error instanceof ApiError ? error.detail : 'Upload failed.');
    },
  });

  const uploadFolder = useMutation({
    mutationFn: api.uploadFolder,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comics'] });
      setMessage('Folder imported successfully.');
    },
    onError: (error) => {
      setErrorMessage(error instanceof ApiError ? error.detail : 'Folder import failed.');
    },
  });

  const allTags = useMemo(
    () => (labelsQuery.data ?? []).filter((item) => item.kind === 'tag').map((item) => item.name),
    [labelsQuery.data],
  );
  const allGenres = useMemo(
    () => (labelsQuery.data ?? []).filter((item) => item.kind === 'genre').map((item) => item.name),
    [labelsQuery.data],
  );

  const data = comicsQuery.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.per_page)) : 1;

  function patchFilters(next: Partial<ComicFilters>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  return (
    <div className="page stack">
      <LibraryFilters
        filters={filters}
        stats={data?.stats ?? { total: 0, favorites: 0, unread: 0, in_progress: 0, read: 0 }}
        allTags={allTags}
        allGenres={allGenres}
        onChange={patchFilters}
      />

      <UploadPanel
        onUploadArchive={async (file) => {
          setMessage(null);
          setErrorMessage(null);
          await uploadArchive.mutateAsync(file);
        }}
        onUploadFolder={async (files) => {
          setMessage(null);
          setErrorMessage(null);
          await uploadFolder.mutateAsync(files);
        }}
      />

      {message ? <div className="alert alert--success">{message}</div> : null}
      {errorMessage ? <div className="alert alert--error">{errorMessage}</div> : null}

      {comicsQuery.isLoading ? <div className="panel">Loading library...</div> : null}

      {!comicsQuery.isLoading && data?.items.length === 0 ? (
        <div className="panel empty-state">
          <h2>No comics yet</h2>
          <p className="muted">Upload a CBZ, PDF, or a folder of images to get started.</p>
        </div>
      ) : null}

      <section className="library-grid">
        {data?.items.map((comic) => (
          <ComicCard key={comic.id} comic={comic} onToggleFavorite={(item) => toggleFavorite.mutate(item)} />
        ))}
      </section>

      {data && data.total > data.per_page ? (
        <div className="panel pagination-bar">
          <button
            type="button"
            className="button button--ghost"
            disabled={(filters.page ?? 1) <= 1}
            onClick={() => patchFilters({ page: Math.max(1, (filters.page ?? 1) - 1) })}
          >
            Previous page
          </button>
          <span className="muted">
            Page {filters.page ?? 1} of {totalPages}
          </span>
          <button
            type="button"
            className="button button--ghost"
            disabled={(filters.page ?? 1) >= totalPages}
            onClick={() => patchFilters({ page: Math.min(totalPages, (filters.page ?? 1) + 1) })}
          >
            Next page
          </button>
        </div>
      ) : null}
    </div>
  );
}
