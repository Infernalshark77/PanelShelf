import { ChangeEvent, useState } from 'react';

interface UploadPanelProps {
  onUploadArchive: (file: File) => Promise<void>;
  onUploadFolder: (files: File[]) => Promise<void>;
}

export function UploadPanel({ onUploadArchive, onUploadFolder }: UploadPanelProps) {
  const [busyLabel, setBusyLabel] = useState<string | null>(null);

  async function handleArchiveChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusyLabel(`Uploading ${file.name}...`);
    try {
      await onUploadArchive(file);
    } finally {
      setBusyLabel(null);
      event.target.value = '';
    }
  }

  async function handleFolderChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (!files.length) return;
    setBusyLabel(`Uploading ${files.length} page files...`);
    try {
      await onUploadFolder(files);
    } finally {
      setBusyLabel(null);
      event.target.value = '';
    }
  }

  return (
    <section className="panel upload-panel">
      <div className="panel__header">
        <div>
          <h2>Add comics</h2>
          <p className="muted">Supports CBZ, CBR, PDF, ZIP, and image folders from your browser.</p>
        </div>
        {busyLabel ? <span className="chip chip--accent">{busyLabel}</span> : null}
      </div>

      <div className="upload-grid">
        <label className="upload-card">
          <span className="upload-card__title">Upload archive or PDF</span>
          <span className="muted">One file at a time. Good for CBZ, CBR, ZIP, or PDF.</span>
          <input type="file" accept=".cbz,.cbr,.pdf,.zip" onChange={handleArchiveChange} hidden />
          <span className="button button--primary">Choose file</span>
        </label>

        <label className="upload-card">
          <span className="upload-card__title">Upload a folder of images</span>
          <span className="muted">Select a directory from disk and PanelShelf will keep the folder structure.</span>
          <input type="file" onChange={handleFolderChange} hidden multiple {...({ webkitdirectory: "true", directory: "true" } as any)} />
          <span className="button button--ghost">Choose folder</span>
        </label>
      </div>
    </section>
  );
}
