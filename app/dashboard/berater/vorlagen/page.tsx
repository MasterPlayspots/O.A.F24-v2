'use client';

// /dashboard/berater/vorlagen — Template-Library für Berater.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store/authStore';
import { listVorlagen, createVorlage, deleteVorlage, type Vorlage } from '@/lib/api/fund24';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FehlerBox } from '@/components/shared/FehlerBox';
import { NeueVorlageModal } from '@/components/vorlagen/NeueVorlageModal';
import { Plus, Copy, Trash2, FileText, Check } from 'lucide-react';

export default function VorlagenPage() {
  const router = useRouter();
  const { token, nutzer, istBerater } = useAuth();
  const [vorlagen, setVorlagen] = useState<Vorlage[]>([]);
  const [loading, setLoading] = useState(true);
  const [fehler, setFehler] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    if (nutzer && !istBerater()) { router.replace('/dashboard/unternehmen'); }
  }, [token, nutzer, istBerater, router]);

  const load = async () => {
    if (!token) return;
    try {
      setFehler('');
      const list = await listVorlagen();
      setVorlagen(Array.isArray(list) ? list : []);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Vorlagen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleCreate = async (data: { titel: string; kategorie?: string; inhalt: string }) => {
    await createVorlage(data);
    await load();
  };

  const handleCopy = async (v: Vorlage) => {
    try {
      await navigator.clipboard.writeText(v.inhalt);
      setCopiedId(v.id);
      setTimeout(() => setCopiedId((c) => (c === v.id ? null : c)), 1500);
    } catch {
      setFehler('Kopieren fehlgeschlagen — Browser-Berechtigung prüfen.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Vorlage wirklich löschen?')) return;
    setDeletingId(id);
    try {
      await deleteVorlage(id);
      setVorlagen((prev) => prev.filter((v) => v.id !== id));
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Löschen fehlgeschlagen.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Vorlagen</h1>
            <p className="text-slate-600">Wiederverwendbare Textbausteine für deine Berichte</p>
          </div>
          <Button onClick={() => setModalOpen(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Neue Vorlage
          </Button>
        </div>

        {fehler && <div className="mb-6"><FehlerBox fehler={fehler} /></div>}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : vorlagen.length === 0 ? (
          <Card className="p-12 text-center border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Noch keine Vorlagen</h2>
            <p className="text-sm text-slate-600 mb-6">
              Lege deinen ersten Textbaustein an.
            </p>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Vorlage erstellen
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vorlagen.map((v) => (
              <Card key={v.id} className="p-5 border-slate-200 flex flex-col">
                <div className="flex-1 mb-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900 leading-tight">{v.titel}</h3>
                    {v.kategorie && (
                      <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                        {v.kategorie}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-4 whitespace-pre-wrap">{v.inhalt}</p>
                  <p className="text-xs text-slate-400 mt-3">
                    {new Date(v.created_at).toLocaleDateString('de-DE')}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleCopy(v)}
                  >
                    {copiedId === v.id ? (
                      <><Check className="w-3.5 h-3.5 mr-1.5" /> Kopiert</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5 mr-1.5" /> Verwenden</>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(v.id)}
                    disabled={deletingId === v.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <NeueVorlageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
