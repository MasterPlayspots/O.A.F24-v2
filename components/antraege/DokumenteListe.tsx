'use client';

// DokumenteListe — read-only Liste der Antrag-Dokumente.

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

export function DokumenteListe({ dokumente }: { dokumente: AntragDokument[] }) {
  if (dokumente.length === 0) {
    return (
      <div className="bg-[#637c74]/30 rounded-lg p-8 text-center">
        <p className="font-[family-name:var(--font-inter)] text-sm text-white/50">
          Keine Dokumente hochgeladen.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {dokumente.map((d) => (
        <div
          key={d.id}
          className="flex items-center justify-between gap-4 bg-[#637c74]/40 hover:bg-[#637c74]/60 rounded-md px-5 py-3 transition"
        >
          <div className="min-w-0 flex-1">
            <p className="font-[family-name:var(--font-inter)] text-sm text-white truncate">{d.filename}</p>
            {d.mime_type && (
              <p className="font-[family-name:var(--font-inter)] text-xs text-white/40 truncate">{d.mime_type}</p>
            )}
          </div>
          <div className="text-right shrink-0 font-[family-name:var(--font-inter)] text-xs text-white/60">
            <div>{fmtSize(d.size_bytes)}</div>
            {d.uploaded_at && (
              <div className="text-white/40">{new Date(d.uploaded_at).toLocaleDateString('de-DE')}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
