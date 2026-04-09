'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/store/authStore';
import { useVerifiedGuard } from '@/lib/hooks/useVerifiedGuard';
import { useMount } from '@/lib/hooks/useMount';
import { getDashboard, updateAnfrage } from '@/lib/api/check';
import { listBeraterKunden, type BeraterKunde } from '@/lib/api/fund24';
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
  const { token, istBerater } = useAuth();
  const { loading: guardLoading } = useVerifiedGuard();
  const isMounted = useMount();
  const [data, setData] = useState<DashboardBerater | null>(null);
  const [kunden, setKunden] = useState<BeraterKunde[]>([]);
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
        try {
          const k = await listBeraterKunden();
          setKunden(k || []);
        } catch { /* optional */ }
      } catch (error) {
        setFehler(error instanceof Error ? error.message : 'Fehler beim Laden der Daten');
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
    } catch (error) {
      setFehler(error instanceof Error ? error.message : 'Fehler beim Akzeptieren');
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
    } catch (error) {
      setFehler(error instanceof Error ? error.message : 'Fehler beim Ablehnen');
    } finally {
      setProcessing(null);
    }
  };

  if (!isMounted || guardLoading || ladet) {
    return (
      <div className="min-h-screen bg-architect-surface font-body text-white p-6">
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
      <div className="min-h-screen bg-architect-surface font-body text-white p-6">
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
    <div className="min-h-screen bg-architect-surface font-body text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-white mb-2">Berater Dashboard</h1>
          <p className="text-white/60">Übersicht Ihrer Anfragen und Projekte</p>
        </div>

        {kunden.length > 0 && (
          <Card className="bg-architect-surface/60 border-0 text-white mb-8">
            <div className="p-6">
              <h2 className="font-display text-xl font-bold text-white">Meine Kunden ({kunden.length})</h2>
            </div>
            <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kunden.map((k) => (
                <div key={k.unternehmen_id} className="bg-architect-surface-low/30 rounded-lg p-4">
                  <p className="font-display font-semibold text-white">{k.firmenname || 'Unbenannt'}</p>
                  {k.branche && <p className="text-xs text-white/50">{k.branche}</p>}
                  <p className="text-sm text-white/60 mt-2">{k.antraege_count} Antrag/Anträge</p>
                  {k.letzte_aktivitaet && (
                    <p className="text-xs text-white/40 mt-1">
                      Zuletzt: {new Date(k.letzte_aktivitaet).toLocaleDateString('de-DE')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6 bg-architect-surface/60 border-0 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60 font-medium">Neue Anfragen</p>
                <p className="font-display text-3xl font-bold text-white mt-2">
                  {data.neueAnfragen?.length || 0}
                </p>
              </div>
              <AlertCircle className="w-10 h-10 text-architect-primary-light" />
            </div>
          </Card>

          <Card className="p-6 bg-architect-surface/60 border-0 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60 font-medium">Aktive Projekte</p>
                <p className="font-display text-3xl font-bold text-white mt-2">
                  {data.aktiveProjekte?.length || 0}
                </p>
              </div>
              <Briefcase className="w-10 h-10 text-architect-primary-light" />
            </div>
          </Card>

          <Card className="p-6 bg-architect-surface/60 border-0 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60 font-medium">Offene Provisionen</p>
                <p className="font-display text-3xl font-bold text-white mt-2">
                  {data.offeneProvisionen || 0}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-architect-tertiary-light" />
            </div>
          </Card>
        </div>

        {data.neueAnfragen && data.neueAnfragen.length > 0 && (
          <Card className="bg-architect-surface/60 border-0 text-white mb-8">
            <div className="p-6">
              <h2 className="font-display text-xl font-bold text-white">Neue Anfragen</h2>
            </div>
            <div className="space-y-1">
              {(data.neueAnfragen as AnfrageWithDetails[]).map((anfrage: AnfrageWithDetails) => (
                <div key={anfrage.id} className="p-6 hover:bg-architect-surface/40 transition">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="font-display text-lg font-semibold text-white">
                        {anfrage.vonUserName || 'Unbekannt'}
                      </h3>
                      <p className="text-sm text-white/60 mt-1">
                        Dienstleistung: {anfrage.nachricht || '-'}
                      </p>
                      <p className="text-sm text-white/50 mt-2">
                        {new Date(anfrage.createdAt).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        onClick={() => handleAccept(anfrage.id)}
                        disabled={processing === anfrage.id}
                        size="sm"
                        className="bg-architect-tertiary hover:bg-architect-tertiary/80 text-white"
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
                        className="bg-architect-surface-low/40 border-0 text-white hover:bg-architect-surface-low/60 hover:text-white"
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
          <Card className="bg-architect-surface/60 border-0 text-white">
            <div className="p-6">
              <h2 className="font-display text-xl font-bold text-white">Aktive Projekte</h2>
            </div>
            <div className="space-y-1">
              {data.aktiveProjekte.map((projekt: ProjektWithDetails) => (
                <div key={projekt.id} className="p-6 hover:bg-architect-surface/40 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-display text-lg font-semibold text-white">
                        {projekt.programmName || 'Projekt'}
                      </h3>
                      <p className="text-sm text-white/60 mt-1">
                        {projekt.phase}
                      </p>
                      <p className="text-sm text-white/50 mt-2">
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <Button asChild variant="outline" size="lg" className="bg-architect-surface/60 border-0 text-white hover:bg-architect-surface/40 hover:text-white">
            <Link href="/dashboard/berater/anfragen">Alle Anfragen</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="bg-architect-surface/60 border-0 text-white hover:bg-architect-surface/40 hover:text-white">
            <Link href="/dashboard/berater/beratungen">Meine Beratungen</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="bg-architect-surface/60 border-0 text-white hover:bg-architect-surface/40 hover:text-white">
            <Link href="/dashboard/berater/nachrichten">Nachrichten</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="bg-architect-surface/60 border-0 text-white hover:bg-architect-surface/40 hover:text-white">
            <Link href="/dashboard/berater/abwicklung">Provisionen</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
