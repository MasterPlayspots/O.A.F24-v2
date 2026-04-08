'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/store/authStore';
import { useVerifiedGuard } from '@/lib/hooks/useVerifiedGuard';
import { useMount } from '@/lib/hooks/useMount';
import { getAnfragen, updateAnfrage } from '@/lib/api/check';
import { Anfrage } from '@/lib/types';
import { LadeSpinner } from '@/components/shared/LadeSpinner';
import { FehlerBox } from '@/components/shared/FehlerBox';
import { LeererZustand } from '@/components/shared/LeererZustand';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle } from 'lucide-react';

interface AnfrageWithDetails extends Anfrage {
  unternehmen_name?: string;
  dienstleistung_name?: string;
  erstellt_am: string;
}

export default function BeraterAnfragenPage() {
  const { token, istBerater } = useAuth();
  const { loading: guardLoading } = useVerifiedGuard();
  const isMounted = useMount();
  const [anfragen, setAnfragen] = useState<AnfrageWithDetails[]>([]);
  const [fehler, setFehler] = useState('');
  const [ladet, setLadet] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!isMounted || guardLoading || !istBerater() || !token) return;

    const loadData = async () => {
      try {
        setFehler('');
        const result = await getAnfragen(token, 'berater');
        const anfrageData = Array.isArray(result) ? result : (result.anfragen || []);
        setAnfragen(anfrageData as AnfrageWithDetails[]);
      } catch (error) {
        setFehler(error instanceof Error ? error.message : 'Fehler beim Laden der Anfragen');
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
      setAnfragen(anfragen.map((a: AnfrageWithDetails) =>
        a.id === anfrageId ? { ...a, status: 'angenommen' } : a
      ));
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
      setAnfragen(anfragen.map((a: AnfrageWithDetails) =>
        a.id === anfrageId ? { ...a, status: 'abgelehnt' } : a
      ));
    } catch (error) {
      setFehler(error instanceof Error ? error.message : 'Fehler beim Ablehnen');
    } finally {
      setProcessing(null);
    }
  };

  if (!isMounted || guardLoading || ladet) {
    return (
      <div className="min-h-screen bg-architect-surface font-body text-white p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 w-48 mb-8" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (fehler) {
    return (
      <div className="min-h-screen bg-architect-surface font-body text-white p-6">
        <div className="max-w-4xl mx-auto">
          <FehlerBox fehler={fehler} />
        </div>
      </div>
    );
  }

  const getStatusBadgeColor = (status: string): BadgeProps['variant'] => {
    switch (status) {
      case 'offen':
        return 'secondary';
      case 'angenommen':
        return 'default';
      case 'abgelehnt':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'offen':
        return 'Offen';
      case 'angenommen':
        return 'Angenommen';
      case 'abgelehnt':
        return 'Abgelehnt';
      default:
        return status;
    }
  };

  const openRequests = anfragen.filter((a: AnfrageWithDetails) => a.status === 'offen');

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-white mb-2">Anfragen</h1>
          <p className="text-white/60">Übersicht aller Anfragen von Unternehmen</p>
        </div>

        {anfragen.length === 0 ? (
          <LeererZustand
            titel="Keine Anfragen"
            beschreibung="Sie haben noch keine Anfragen von Unternehmen erhalten"
          />
        ) : (
          <>
            {openRequests.length > 0 && (
              <Card className="bg-architect-surface/60 border-0 text-white mb-8 overflow-hidden">
                <div className="p-6 bg-architect-primary/20">
                  <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                    <span className="w-3 h-3 bg-architect-primary-light rounded-full"></span>
                    Offene Anfragen ({openRequests.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-0 bg-architect-surface-low/30 hover:bg-architect-surface-low/30">
                        <TableHead className="text-white/70">Unternehmen</TableHead>
                        <TableHead className="text-white/70">Dienstleistung</TableHead>
                        <TableHead className="text-white/70">Datum</TableHead>
                        <TableHead className="text-white/70 text-right">Aktion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openRequests.map((anfrage: AnfrageWithDetails) => (
                        <TableRow key={anfrage.id} className="border-0 hover:bg-architect-surface/40">
                          <TableCell className="font-medium">
                            {anfrage.unternehmen_name || 'Unbekannt'}
                          </TableCell>
                          <TableCell>{anfrage.dienstleistung_name || '-'}</TableCell>
                          <TableCell className="text-sm text-white/60">
                            {new Date(anfrage.erstellt_am).toLocaleDateString('de-DE')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
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
                                    <CheckCircle className="w-4 h-4 mr-1" />
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
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Ablehnen
                                  </>
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {anfragen.filter((a: AnfrageWithDetails) => a.status !== 'offen').length > 0 && (
              <Card className="bg-architect-surface/60 border-0 text-white overflow-hidden">
                <div className="p-6">
                  <h2 className="font-display text-lg font-bold text-white">
                    Bearbeitete Anfragen
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-0 bg-architect-surface-low/30 hover:bg-architect-surface-low/30">
                        <TableHead className="text-white/70">Unternehmen</TableHead>
                        <TableHead className="text-white/70">Dienstleistung</TableHead>
                        <TableHead className="text-white/70">Status</TableHead>
                        <TableHead className="text-white/70">Datum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {anfragen.filter((a: AnfrageWithDetails) => a.status !== 'offen').map((anfrage: AnfrageWithDetails) => (
                        <TableRow key={anfrage.id} className="border-0 hover:bg-architect-surface/40">
                          <TableCell className="font-medium">
                            {anfrage.unternehmen_name || 'Unbekannt'}
                          </TableCell>
                          <TableCell>{anfrage.dienstleistung_name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeColor(anfrage.status)}>
                              {getStatusLabel(anfrage.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-white/60">
                            {new Date(anfrage.erstellt_am).toLocaleDateString('de-DE')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
