'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store/authStore';
import { useVerifiedGuard } from '@/lib/hooks/useVerifiedGuard';
import { useMount } from '@/lib/hooks/useMount';
import { getDashboard, updateAnfrage } from '@/lib/api/check';
import { DashboardBerater, Anfrage, TrackerVorgang } from '@/lib/types';
import { LadeSpinner } from '@/components/shared/LadeSpinner';
import { FehlerBox } from '@/components/shared/FehlerBox';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, Briefcase, TrendingUp, AlertCircle } from 'lucide-react';

interface AnfrageWithDetails extends Anfrage {
  unternehmen_name?: string;
  dienstleistung_name?: string;
  erstellt_am: string;
}

interface ProjektWithDetails extends TrackerVorgang {
  unternehmen_name?: string;
  dienstleistung_name?: string;
  begonnen_am?: string;
}

export default function BeraterDashboardPage() {
  const router = useRouter();
  const { token, istBerater } = useAuth();
  const { loading: guardLoading } = useVerifiedGuard();
  const isMounted = useMount();
  const [data, setData] = useState<DashboardBerater | null>(null);
  const [fehler, setFehler] = useState('');
  const [ladet, setLadet] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!isMounted || guardLoading || !istBerater() || !token) return;

    const loadData = async () => {
      try {
        setFehler('');
        const result = await getDashboard('berater', token);
        setData(result as DashboardBerater);
      } catch (error: any) {
        setFehler(error?.message || 'Fehler beim Laden der Daten');
      } finally {
        setLadet(false);
      }
    };

    loadData();
  }, [isMounted, guardLoading, istBerater, token]);

  const handleAccept = async (anfrageId: string) => {
    if (!token) return;
    try {
      setProcessing(anfrageId);
      await updateAnfrage(anfrageId, 'angenommen', token);
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          neueAnfragen: ((prev.neueAnfragen as AnfrageWithDetails[]) || []).filter((a: AnfrageWithDetails) => a.id !== anfrageId),
        };
      });
    } catch (error: any) {
      setFehler(error?.message || 'Fehler beim Akzeptieren');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (anfrageId: string) => {
    if (!token) return;
    try {
      setProcessing(anfrageId);
      await updateAnfrage(anfrageId, 'abgelehnt', token);
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          neueAnfragen: ((prev.neueAnfragen as AnfrageWithDetails[]) || []).filter((a: AnfrageWithDetails) => a.id !== anfrageId),
        };
      });
    } catch (error: any) {
      setFehler(error?.message || 'Fehler beim Ablehnen');
    } finally {
      setProcessing(null);
    }
  };

  if (!isMounted || guardLoading || ladet) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-12 w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (fehler) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <FehlerBox fehler={fehler} />
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Berater Dashboard</h1>
          <p className="text-slate-600">Übersicht Ihrer Anfragen und Projekte</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6 border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Neue Anfragen</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {data.neueAnfragen?.length || 0}
                </p>
              </div>
              <AlertCircle className="w-10 h-10 text-orange-500" />
            </div>
          </Card>

          <Card className="p-6 border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Aktive Projekte</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {data.aktiveProjekte?.length || 0}
                </p>
              </div>
              <Briefcase className="w-10 h-10 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6 border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Offene Provisionen</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {data.offeneProvisionen || 0}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500" />
            </div>
          </Card>
        </div>

        {data.neueAnfragen && data.neueAnfragen.length > 0 && (
          <Card className="border-slate-200 mb-8">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Neue Anfragen</h2>
            </div>
            <div className="divide-y divide-slate-200">
              {(data.neueAnfragen as AnfrageWithDetails[]).map((anfrage: AnfrageWithDetails) => (
                <div key={anfrage.id} className="p-6 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {anfrage.vonUserName || 'Unbekannt'}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        Dienstleistung: {anfrage.nachricht || '-'}
                      </p>
                      <p className="text-sm text-slate-500 mt-2">
                        {new Date(anfrage.createdAt).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        onClick={() => handleAccept(anfrage.id)}
                        disabled={processing === anfrage.id}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processing === anfrage.id ? (
                          <LadeSpinner />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Annehmen
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleReject(anfrage.id)}
                        disabled={processing === anfrage.id}
                        variant="outline"
                        size="sm"
                      >
                        {processing === anfrage.id ? (
                          <LadeSpinner />
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-2" />
                            Ablehnen
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {data.aktiveProjekte && data.aktiveProjekte.length > 0 && (
          <Card className="border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Aktive Projekte</h2>
            </div>
            <div className="divide-y divide-slate-200">
              {data.aktiveProjekte.map((projekt: ProjektWithDetails) => (
                <div key={projekt.id} className="p-6 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {projekt.programmName || 'Projekt'}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {projekt.phase}
                      </p>
                      <p className="text-sm text-slate-500 mt-2">
                        Aktualisiert: {new Date(projekt.updatedAt).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <Badge>{projekt.phase || 'Laufend'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Button asChild variant="outline" size="lg">
            <a href="/dashboard/berater/anfragen">Alle Anfragen</a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="/dashboard/berater/nachrichten">Nachrichten</a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="/dashboard/berater/abwicklung">Provisionen</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
