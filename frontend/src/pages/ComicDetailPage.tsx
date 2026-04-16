import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { MetadataEditor, type MetadataForm } from '../components/MetadataEditor';
import { api, ApiError } from '../lib/api';
import type { ReadStatus, ReadingDirection } from '../types';

function toCommaSeparated(values: string[]) {
  return values.join(', ');
}

function splitCsv(input: string) {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ComicDetailPage() {
  const { comicId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<MetadataForm>({
    title: '',
    series: '',
    volume: '',
    issue_number: '',
    author: '',
    publisher: '',
    summary: '',
    read_status: 'unread' as ReadStatus,
    default_reading_direction: 'ltr' as ReadingDirection,
    tags: '',
    genres: '',
  });

  const comicQuery = useQuery({
    queryKey: ['comic', comicId],
    queryFn: () => api.getComic(comicId),
    enabled: Boolean(comicId),
  });

  useEffect(() => {
    if (!comicQuery.data) return;
    const comic = comicQuery.data;
    setForm({
      title: comic.title ?? '',
      series: comic.series ?? '',
      volume: comic.volume ?? '',
      issue_number: comic.issue_number ?? '',
      author: comic.author ?? '',
      publisher: comic.publisher ?? '',
      summary: comic.summary ?? '',
      read_status: comic.read_status,
      default_reading_direction: comic.default_reading_direction,
      tags: toCommaSeparated(comic.tags),
      genres: toCommaSeparated(comic.genres),
    });
  }, [comicQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.updateComic(comicId, {
        title: form.title || null,
        series: form.series || null,
        volume: form.volume || null,
        issue_number: form.issue_number || null,
        author: form.author || null,
        publisher: form.publisher || null,
        summary: form.summary || null,
        read_status: form.read_status,
        default_reading_direction: form.default_reading_direction,
        tags: splitCsv(form.tags),
        genres: splitCsv(form.genres),
      }),
    onSuccess: (comic) => {
      setMessage('Metadata saved.');
      setErrorMessage(null);
      queryClient.setQueryData(['comic', comicId], comic);
      void queryClient.invalidateQueries({ queryKey: ['comics'] });
    },
    onError: (error) => {
      setErrorMessage(error instanceof ApiError ? error.detail : 'Could not save comic metadata.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteComic(comicId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comics'] });
      navigate('/');
    },
    onError: (error) => {
      setErrorMessage(error instanceof ApiError ? error.detail : 'Could not delete comic.');
    },
  });

  const coverMutation = useMutation({
    mutationFn: (file: File) => api.uploadCover(comicId, file),
    onSuccess: (comic) => {
      setMessage('Cover updated.');
      queryClient.setQueryData(['comic', comicId], comic);
      void queryClient.invalidateQueries({ queryKey: ['comics'] });
    },
    onError: (error) => {
      setErrorMessage(error instanceof ApiError ? error.detail : 'Could not upload cover.');
    },
  });

  const bookmarkDelete = useMutation({
    mutationFn: ({ bookmarkId }: { bookmarkId: string }) => api.deleteBookmark(comicId, bookmarkId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comic', comicId] });
    },
  });

  const comic = comicQuery.data;

  if (comicQuery.isLoading) {
    return <div className="page panel">Loading comic...</div>;
  }

  if (!comic) {
    return <div className="page panel">Comic not found.</div>;
  }

  return (
    <div className="page stack">
      {message ? <div className="alert alert--success">{message}</div> : null}
      {errorMessage ? <div className="alert alert--error">{errorMessage}</div> : null}

      <MetadataEditor
        comic={comic}
        form={form}
        saving={saveMutation.isPending}
        onChange={(name, value) => setForm((current) => ({ ...current, [name]: value } as MetadataForm))}
        onSave={() => saveMutation.mutate()}
        onDelete={() => {
          if (window.confirm(`Delete ${comic.title}? This removes the file from disk and the library database.`)) {
            deleteMutation.mutate();
          }
        }}
        onCoverUpload={async (file) => {
          await coverMutation.mutateAsync(file);
        }}
      />

      <section className="panel stack">
        <div className="panel__header">
          <div>
            <h2>Bookmarks</h2>
            <p className="muted">Quick jump points saved from the reader.</p>
          </div>
          <Link className="button button--ghost" to={`/reader/${comic.id}`}>
            Open reader
          </Link>
        </div>

        {comic.bookmarks.length === 0 ? (
          <p className="muted">No bookmarks yet. Press B inside the reader to add one.</p>
        ) : (
          <div className="bookmark-list">
            {comic.bookmarks.map((bookmark) => (
              <div className="bookmark-item" key={bookmark.id}>
                <div>
                  <Link className="bookmark-item__link" to={`/reader/${comic.id}?page=${bookmark.page}`}>
                    Page {bookmark.page}
                  </Link>
                  {bookmark.note ? <div className="muted">{bookmark.note}</div> : null}
                </div>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => bookmarkDelete.mutate({ bookmarkId: bookmark.id })}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
