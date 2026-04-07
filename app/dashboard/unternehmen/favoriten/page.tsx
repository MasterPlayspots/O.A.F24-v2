'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/store/authStore';
import { useVerifiedGuard } from '@/lib/hooks/useVerifiedGuard';
import { useMount } from '@/lib/hooks/useMount';
import { listFavoriten, removeFavorit, type Favorit } from '@/lib/api/fund24';
import { LadeSpinner } from '@/components/shared/LadeSpinner';
import { FehlerBox } from '@/components/shared/FehlerBox';
import { LeererZustand } from '@/components/shared/LeererZustand';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Trash2 } from 'lucide-react';

export default function FavoritenPage() {
  const { token, istUnternehmen } = useAuth();
  const { loading: guardLoading } = useVerifiedGuard();
  const isMounted = useMount();
  const [favoriten, setFavoriten] = useState<Favorit[]>([]);
  const [fehler, setFehler] = useState('');
  const [ladet, setLadet] = useState(true);
  const [loescht, setLoescht] = useState<string | null>(null);

  useEffect(() => {
    if (!isMounted || guardLoading || !istUnternehmen() || !token) return;

    const loadData = async () => {
      try {
        setFehler('');
        const data = await listFavoriten();
        setFavoriten(data || []);
      } catch (error) {
        setFehler(error instanceof Error ? error.message : 'Fehler beim Laden der Favoriten');
      } finally {
        setLadet(false);
      }
    };

    loadData();
  }, [isMounted, guardLoading, istUnternehmen, token]);

  const handleRemove = async (id: string) => {
    if (!token) return;
    try {
      setLoescht(id);
      await removeFavorit(id);
      setFavoriten(favoriten.filter((f) => f.programm_id !== id));
    } catch (error) {
      setFehler(error instanceof Error ? error.message : 'Fehler beim Löschen');
    } finally {
      setLoescht(null);
    }
  };

  if (!isMounted || guardLoading || ladet) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 w-48 mb-8" />
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (fehler) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <FehlerBox fehler={fehler} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Favoriten</h1>
          <p className="text-slate-600">Ihre gespeicherten Förderprogramme</p>
        </div>

        {favoriten.length === 0 ? (
          <LeererZustand
            titel="Keine Favoriten"
            beschreibung="Fügen Sie Förderprogramme hinzu, um sie hier zu speichern"
          />
        ) : (
          <div className="grid gap-4">
            {favoriten.map((favorit) => (
              <Card key={favorit.programm_id} className="p-6 border-slate-200 hover:border-slate-300 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <h3 className="text-lg font-semibold text-slate-900">
                        Programm {favorit.programm_id}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">
                      Gespeichert am {new Date(favorit.created_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleRemove(favorit.programm_id)}
                    disabled={loescht === favorit.programm_id}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                  >
                    {loescht === favorit.programm_id ? (
                      <LadeSpinner />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
