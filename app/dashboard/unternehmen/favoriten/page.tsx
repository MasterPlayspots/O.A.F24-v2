'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/store/authStore';
import { useVerifiedGuard } from '@/lib/hooks/useVerifiedGuard';
import { useMount } from '@/lib/hooks/useMount';
import { getFavoriten, removeFavorit } from '@/lib/api/check';
import { LadeSpinner } from '@/components/shared/LadeSpinner';
import { FehlerBox } from '@/components/shared/FehlerBox';
import { LeererZustand } from '@/components/shared/LeererZustand';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Trash2 } from 'lucide-react';

interface FavoritItem {
  id: string;
  programm_name?: string;
  beschreibung?: string;
  kategorien?: string[];
}

export default function FavoritenPage() {
  const { token, istUnternehmen } = useAuth();
  const { loading: guardLoading } = useVerifiedGuard();
  const isMounted = useMount();
  const [favoriten, setFavoriten] = useState<FavoritItem[]>([]);
  const [fehler, setFehler] = useState('');
  const [ladet, setLadet] = useState(true);
  const [loescht, setLoescht] = useState<string | null>(null);

  useEffect(() => {
    if (!isMounted || guardLoading || !istUnternehmen() || !token) return;

    const loadData = async () => {
      try {
        setFehler('');
        const { favoritenIds } = await getFavoriten(token);
        // Map IDs to favorit items
        setFavoriten((favoritenIds || []).map((id: number | string) => ({
          id: String(id),
          programm_name: 'Förderprogramm',
        })));
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
      await removeFavorit(parseInt(id, 10), token);
      setFavoriten(favoriten.filter((f: FavoritItem) => f.id !== id));
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
            {favoriten.map((favorit: FavoritItem) => (
              <Card key={favorit.id} className="p-6 border-slate-200 hover:border-slate-300 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <h3 className="text-lg font-semibold text-slate-900">
                        {favorit.programm_name || 'Förderprogramm'}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">
                      {favorit.beschreibung || 'Keine Beschreibung'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {favorit.kategorien && favorit.kategorien.length > 0 && (
                        <>
                          {favorit.kategorien.map((kat: string) => (
                            <Badge key={kat} variant="secondary">
                              {kat}
                            </Badge>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleRemove(favorit.id)}
                    disabled={loescht === favorit.id}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                  >
                    {loescht === favorit.id ? (
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
