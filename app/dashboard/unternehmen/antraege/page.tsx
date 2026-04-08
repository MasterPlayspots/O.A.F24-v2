'use client';

// /dashboard/unternehmen/antraege — Übersicht aller eigenen Anträge.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store/authStore';
import { listMeineAntraege, createAntrag, type Antrag } from '@/lib/api/fund24';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FehlerBox } from '@/components/shared/FehlerBox';
import { AntragStatusBadge } from '@/components/antraege/StatusBadge';
import { NeuerAntragModal } from '@/components/antraege/NeuerAntragModal';
import { Plus, FileText, ArrowRight } from 'lucide-react';

function fmtEUR(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export default function MeineAntraegePage() {
  const router = useRouter();
  const { token, nutzer, istUnternehmen } = useAuth();
  const [antraege, setAntraege] = useState<Antrag[]>([]);
  const [loading, setLoading] = useState(true);
  const [fehler, setFehler] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    if (nutzer && !istUnternehmen()) { router.replace('/dashboard/berater'); }
  }, [token, nutzer, istUnternehmen, router]);

  const load = async () => {
    if (!token) return;
    try {
      setFehler('');
      const list = await listMeineAntraege();
      setAntraege(Array.isArray(list) ? list : []);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Anträge konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleCreate = async (data: { programm_id: string; beschreibung?: string }) => {
    const res = await createAntrag(data);
    if (res?.id) {
      router.push(`/antraege/${res.id}`);
    } else {
      await load();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Meine Anträge</h1>
            <p className="text-slate-600">Übersicht deiner Förder-Anträge</p>
          </div>
          <Button onClick={() => setModalOpen(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Neuen Antrag stellen
          </Button>
        </div>

        {fehler && <div className="mb-6"><FehlerBox fehler={fehler} /></div>}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : antraege.length === 0 ? (
          <Card className="p-12 text-center border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Noch keine Anträge</h2>
            <p className="text-sm text-slate-600 mb-6">Stelle deinen ersten Förder-Antrag.</p>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Antrag erstellen
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {antraege.map((a) => (
              <Link key={a.id} href={`/antraege/${a.id}`}>
                <Card className="p-6 border-slate-200 hover:border-slate-300 hover:shadow-sm transition cursor-pointer">
                  <div className="flex items-center justify-between gap-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <AntragStatusBadge status={a.status} />
                        {a.vollstaendigkeit != null && (
                          <span className="text-xs text-slate-500">
                            {a.vollstaendigkeit}% vollständig
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 truncate">
                        {a.programm_name ?? a.programm_id ?? 'Unbenannter Antrag'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 font-mono truncate">{a.id}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Beantragt</p>
                      <p className="text-lg font-bold text-slate-900">{fmtEUR(a.foerdersumme_beantragt)}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(a.created_at).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 shrink-0" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <NeuerAntragModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
