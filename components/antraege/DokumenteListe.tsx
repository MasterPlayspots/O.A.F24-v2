'use client';

// DokumenteListe — Liste + Upload + Delete von Antrag-Dokumenten.
import { useRef, useState } from 'react';

export interface AntragDokument {
  id: string;
  filename: string;
  size_bytes?: number | null;
  mime_type?: string | null;
  uploaded_at?: string | null;
}

function fmtSize(bytes?: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface Props {
  dokumente: AntragDokument[];
  onUpload?: (file: File) => Promise<void>;
  onDelete?: (dokId: string) => Promise<void>;
}

export function DokumenteListe({ dokumente, onUpload, onDelete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUpload) return;
    if (file.size > 25 * 1024 * 1024) {
      setError('Datei zu gross (max 25 MB).');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDelete) return;
    if (!confirm('Dokument wirklich löschen?')) return;
    setDeleting(id);
    setError('');
    try {
      await onDelete(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-3">
      {onUpload && (
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleSelect}
            disabled={busy}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="px-5 py-2.5 rounded-md font-display font-semibold text-sm text-white tracking-wide
                       bg-gradient-to-br from-architect-primary to-architect-primary-container hover:brightness-110
                       shadow-[0_10px_40px_rgba(101,117,173,0.25)] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Lädt hoch …' : 'Dokument hochladen'}
          </button>
          <span className="text-xs text-white/40">PDF, Bilder, Office — max 25 MB</span>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-md bg-architect-error/20 text-architect-error-container text-sm">
          {error}
        </div>
      )}

      {dokumente.length === 0 ? (
        <div className="bg-[#637c74]/30 rounded-lg p-8 text-center">
          <p className="font-body text-sm text-white/50">Keine Dokumente hochgeladen.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {dokumente.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-4 bg-[#637c74]/40 hover:bg-[#637c74]/60 rounded-md px-5 py-3 transition"
            >
              <div className="min-w-0 flex-1">
                <p className="font-body text-sm text-white truncate">{d.filename}</p>
                {d.mime_type && (
                  <p className="font-body text-xs text-white/40 truncate">{d.mime_type}</p>
                )}
              </div>
              <div className="text-right shrink-0 font-body text-xs text-white/60">
                <div>{fmtSize(d.size_bytes)}</div>
                {d.uploaded_at && (
                  <div className="text-white/40">
                    {new Date(d.uploaded_at).toLocaleDateString('de-DE')}
                  </div>
                )}
              </div>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(d.id)}
                  disabled={deleting === d.id}
                  className="shrink-0 px-3 py-1.5 rounded-md font-body text-xs text-architect-error-container
                             hover:bg-architect-error/20 transition disabled:opacity-40"
                  aria-label={`${d.filename} löschen`}
                >
                  {deleting === d.id ? '…' : 'Löschen'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
