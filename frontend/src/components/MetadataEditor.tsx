import type { ComicDetail, ReadStatus, ReadingDirection } from '../types';

export interface MetadataForm {
  title: string;
  series: string;
  volume: string;
  issue_number: string;
  author: string;
  publisher: string;
  summary: string;
  read_status: ReadStatus;
  default_reading_direction: ReadingDirection;
  tags: string;
  genres: string;
}

interface MetadataEditorProps {
  comic: ComicDetail;
  form: MetadataForm;
  saving: boolean;
  onChange: (name: keyof MetadataForm, value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onCoverUpload: (file: File) => Promise<void>;
}

export function MetadataEditor({ comic, form, saving, onChange, onSave, onDelete, onCoverUpload }: MetadataEditorProps) {
  return (
    <section className="detail-grid">
      <aside className="panel detail-cover-panel">
        <img className="detail-cover" src={comic.cover_url} alt={`${comic.title} cover`} />
        <div className="stack stack--sm">
          <label className="button button--ghost">
            Upload cover
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void onCoverUpload(file);
                }
                event.target.value = '';
              }}
            />
          </label>
          <a className="button button--primary" href={`/reader/${comic.id}`}>
            {comic.current_page > 1 ? `Resume at page ${comic.current_page}` : 'Open reader'}
          </a>
        </div>

        <dl className="meta-list">
          <div>
            <dt>Pages</dt>
            <dd>{comic.page_count}</dd>
          </div>
          <div>
            <dt>Progress</dt>
            <dd>
              {comic.current_page}/{comic.page_count}
            </dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{comic.source_type.toUpperCase()}</dd>
          </div>
          <div>
            <dt>Filename</dt>
            <dd>{comic.original_filename}</dd>
          </div>
        </dl>
      </aside>

      <section className="panel stack">
        <div className="panel__header">
          <div>
            <h1>{comic.title}</h1>
            <p className="muted">Edit the metadata that drives your library organization and reading defaults.</p>
          </div>
          <div className="button-group">
            <button className="button button--ghost" type="button" onClick={onDelete}>
              Delete comic
            </button>
            <button className="button button--primary" type="button" onClick={onSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>

        <div className="form-grid">
          <label className="form-control form-control--wide">
            <span>Title</span>
            <input className="input" value={form.title} onChange={(event) => onChange('title', event.target.value)} />
          </label>
          <label className="form-control">
            <span>Series</span>
            <input className="input" value={form.series} onChange={(event) => onChange('series', event.target.value)} />
          </label>
          <label className="form-control">
            <span>Volume</span>
            <input className="input" value={form.volume} onChange={(event) => onChange('volume', event.target.value)} />
          </label>
          <label className="form-control">
            <span>Issue / chapter</span>
            <input className="input" value={form.issue_number} onChange={(event) => onChange('issue_number', event.target.value)} />
          </label>
          <label className="form-control">
            <span>Author</span>
            <input className="input" value={form.author} onChange={(event) => onChange('author', event.target.value)} />
          </label>
          <label className="form-control">
            <span>Publisher</span>
            <input className="input" value={form.publisher} onChange={(event) => onChange('publisher', event.target.value)} />
          </label>
          <label className="form-control">
            <span>Read state</span>
            <select className="select" value={form.read_status} onChange={(event) => onChange('read_status', event.target.value)}>
              <option value="unread">Unread</option>
              <option value="in_progress">In progress</option>
              <option value="read">Read</option>
            </select>
          </label>
          <label className="form-control">
            <span>Default reading direction</span>
            <select
              className="select"
              value={form.default_reading_direction}
              onChange={(event) => onChange('default_reading_direction', event.target.value)}
            >
              <option value="ltr">Left to right</option>
              <option value="rtl">Right to left</option>
            </select>
          </label>
          <label className="form-control form-control--wide">
            <span>Tags</span>
            <input className="input" value={form.tags} onChange={(event) => onChange('tags', event.target.value)} placeholder="favorite, sci-fi, weekly" />
          </label>
          <label className="form-control form-control--wide">
            <span>Genres</span>
            <input className="input" value={form.genres} onChange={(event) => onChange('genres', event.target.value)} placeholder="manga, horror, superhero" />
          </label>
          <label className="form-control form-control--full">
            <span>Summary</span>
            <textarea className="textarea" rows={8} value={form.summary} onChange={(event) => onChange('summary', event.target.value)} />
          </label>
        </div>
      </section>
    </section>
  );
}
