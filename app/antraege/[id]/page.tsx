'use client';

// /antraege/[id] — Antrag-Detail (Unternehmen + Berater).
// Stil: "The Institutional Architect" (dark, tonal layering, no 1px borders).

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store/authStore';
import {
  getAntrag,
  updateAntragStatus,
  listAntragDokumente,
  uploadAntragDokument,
  deleteAntragDokument,
  listAntragZugriff,
  grantAntragZugriff,
  revokeAntragZugriff,
  type Antrag,
  type AntragZugriff,
} from '@/lib/api/fund24';
import { CompletenessRing } from '@/components/antraege/CompletenessRing';
import { DokumenteListe, type AntragDokument } from '@/components/antraege/DokumenteListe';
import { ACLList } from '@/components/antraege/ACLList';
import { InviteBeraterModal } from '@/components/antraege/InviteBeraterModal';

const STATUS_STYLE: Record<Antrag['status'], { bg: string; fg: string; label: string }> = {
  entwurf:     { bg: 'bg-architect-surface/40', fg: 'text-white',         label: 'Entwurf' },
  eingereicht: { bg: 'bg-architect-primary/30', fg: 'text-architect-primary-light',     label: 'Eingereicht' },
  bewilligt:   { bg: 'bg-architect-tertiary/35', fg: 'text-architect-tertiary-light',     label: 'Bewilligt' },
  abgelehnt:   { bg: 'bg-architect-error/25', fg: 'text-architect-error-container',     label: 'Abgelehnt' },
};

function fmtEUR(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export default function AntragDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, nutzer } = useAuth();
  const id = params?.id ?? '';

  const [antrag, setAntrag] = useState<Antrag | null>(null);
  const [dokumente, setDokumente] = useState<AntragDokument[]>([]);
  const [zugriffe, setZugriffe] = useState<AntragZugriff[]>([]);
  const [loading, setLoading] = useState(true);
  const [fehler, setFehler] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { router.replace('/login'); }
  }, [token, router]);

  const reloadDokumente = useCallback(async () => {
    try {
      const list = await listAntragDokumente(id);
      setDokumente((list ?? []) as AntragDokument[]);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Dokumente konnten nicht geladen werden.');
    }
  }, [id]);

  const handleUpload = useCallback(async (file: File) => {
    await uploadAntragDokument(id, file);
    await reloadDokumente();
  }, [id, reloadDokumente]);

  const handleDeleteDokument = useCallback(async (dokId: string) => {
    await deleteAntragDokument(id, dokId);
    await reloadDokumente();
  }, [id, reloadDokumente]);

  const reloadACL = useCallback(async () => {
    try {
      const acl = await listAntragZugriff(id);
      setZugriffe(acl ?? []);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'ACL konnte nicht geladen werden.');
    }
  }, [id]);

  useEffect(() => {
    if (!id || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const [a, dRes, acl] = await Promise.all([
          getAntrag(id),
          listAntragDokumente(id).catch(() => [] as AntragDokument[]),
          listAntragZugriff(id).catch(() => [] as AntragZugriff[]),
        ]);
        if (cancelled) return;
        setAntrag(a);
        setDokumente((dRes ?? []) as AntragDokument[]);
        setZugriffe(acl ?? []);
      } catch (e) {
        if (!cancelled) setFehler(e instanceof Error ? e.message : 'Antrag konnte nicht geladen werden.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, token]);

  const [statusUpdating, setStatusUpdating] = useState(false);

  const handleStatusChange = async (next: Antrag['status']) => {
    if (!antrag || next === antrag.status) return;
    setStatusUpdating(true);
    setFehler('');
    try {
      await updateAntragStatus(id, next);
      setAntrag({ ...antrag, status: next });
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Status konnte nicht geändert werden.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleInvite = async (data: { berater_id: string; rolle: 'editor' | 'viewer' | 'reviewer' }) => {
    await grantAntragZugriff(id, data);
    await reloadACL();
  };

  const handleRevoke = async (zugriffId: string) => {
    setRevoking(zugriffId);
    try {
      await revokeAntragZugriff(id, zugriffId);
      await reloadACL();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Zugriff entziehen fehlgeschlagen.');
    } finally {
      setRevoking(null);
    }
  };

  const status = antrag?.status ?? 'entwurf';
  const ss = STATUS_STYLE[status];
  const completeness = antrag?.vollstaendigkeit ?? 0;

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-start justify-between gap-8 mb-12">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-3">Antrag</p>
            <h1 className="font-display font-bold text-5xl tracking-[-0.02em] leading-none truncate">
              {antrag?.programm_name ?? 'Antrag-Detail'}
            </h1>
            <div className="mt-5 flex items-center gap-4 flex-wrap">
              <span className={`px-3 py-1 rounded-md text-xs font-medium ${ss.bg} ${ss.fg}`}>{ss.label}</span>
              {antrag && (
                <select
                  value={antrag.status}
                  onChange={(e) => handleStatusChange(e.target.value as Antrag['status'])}
                  disabled={statusUpdating}
                  className="bg-architect-surface-low/40 text-white text-xs font-body px-3 py-1.5 rounded-md
                             outline-none focus:ring-1 focus:ring-architect-primary-light disabled:opacity-50"
                  aria-label="Status ändern"
                >
                  <option value="entwurf">Entwurf</option>
                  <option value="eingereicht">Eingereicht</option>
                  <option value="bewilligt">Bewilligt</option>
                  <option value="abgelehnt">Abgelehnt</option>
                </select>
              )}
              <span className="text-xs text-white/40 font-mono truncate">{id}</span>
            </div>
          </div>
          <div className="shrink-0">
            <CompletenessRing percent={completeness} />
          </div>
        </div>

        {fehler && (
          <div className="mb-8 px-5 py-4 rounded-md bg-architect-error/15 text-architect-error-container text-sm">{fehler}</div>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="bg-architect-surface-low/40 rounded-lg h-32 animate-pulse" />
            <div className="bg-architect-surface-low/40 rounded-lg h-48 animate-pulse" />
          </div>
        ) : antrag ? (
          <div className="space-y-10">
            {/* Fördersummen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-architect-surface/60 rounded-lg p-6 shadow-[0_10px_40px_rgba(101,117,173,0.06)]">
                <p className="text-xs uppercase tracking-widest text-white/50 mb-2">Beantragt</p>
                <p className="font-display text-3xl font-bold text-white tracking-tight">
                  {fmtEUR(antrag.foerdersumme_beantragt)}
                </p>
              </div>
              <div className="bg-architect-surface/60 rounded-lg p-6 shadow-[0_10px_40px_rgba(101,117,173,0.06)]">
                <p className="text-xs uppercase tracking-widest text-white/50 mb-2">Bewilligt</p>
                <p className="font-display text-3xl font-bold text-architect-tertiary-light tracking-tight">
                  {fmtEUR(antrag.foerdersumme_bewilligt)}
                </p>
              </div>
            </div>

            {/* Dokumente */}
            <section>
              <h2 className="font-display text-2xl font-bold text-white mb-4 tracking-tight">
                Dokumente
              </h2>
              <DokumenteListe
                dokumente={dokumente}
                onUpload={handleUpload}
                onDelete={handleDeleteDokument}
              />
            </section>

            {/* ACL */}
            <section>
              <div className="flex items-end justify-between mb-4">
                <h2 className="font-display text-2xl font-bold text-white tracking-tight">
                  Zugriff
                </h2>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="px-5 py-2.5 rounded-md font-display font-semibold text-sm text-white tracking-wide
                             bg-gradient-to-br from-architect-primary to-architect-primary-container hover:brightness-110
                             shadow-[0_10px_40px_rgba(101,117,173,0.25)] transition"
                >
                  Berater einladen
                </button>
              </div>
              <ACLList zugriffe={zugriffe} onRevoke={handleRevoke} revoking={revoking} />
            </section>

            <div className="text-xs text-white/40 pt-4">
              Erstellt: {new Date(antrag.created_at).toLocaleDateString('de-DE')} · Aktualisiert:{' '}
              {new Date(antrag.updated_at).toLocaleDateString('de-DE')}
              {nutzer && <> · Eingeloggt als <span className="text-white/60">{nutzer.email}</span></>}
            </div>
          </div>
        ) : null}
      </div>

      <InviteBeraterModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleInvite}
      />
    </div>
  );
}
