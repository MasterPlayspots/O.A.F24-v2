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
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 w-48 mb-8" />
          <Skeleton className="h-96" />
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Anfragen</h1>
          <p className="text-slate-600">Übersicht aller Anfragen von Unternehmen</p>
        </div>

        {anfragen.length === 0 ? (
          <LeererZustand
            titel="Keine Anfragen"
            beschreibung="Sie haben noch keine Anfragen von Unternehmen erhalten"
          />
        ) : (
          <>
            {openRequests.length > 0 && (
              <Card className="border-slate-200 mb-8 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-amber-50">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
                    Offene Anfragen ({openRequests.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200 bg-slate-50">
                        <TableHead>Unternehmen</TableHead>
                        <TableHead>Dienstleistung</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead className="text-right">Aktion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openRequests.map((anfrage: AnfrageWithDetails) => (
                        <TableRow key={anfrage.id} className="border-slate-200 hover:bg-slate-50">
                          <TableCell className="font-medium">
                            {anfrage.unternehmen_name || 'Unbekannt'}
                          </TableCell>
                          <TableCell>{anfrage.dienstleistung_name || '-'}</TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {new Date(anfrage.erstellt_am).toLocaleDateString('de-DE')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
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
              <Card className="border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">
                    Bearbeitete Anfragen
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200 bg-slate-50">
                        <TableHead>Unternehmen</TableHead>
                        <TableHead>Dienstleistung</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Datum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {anfragen.filter((a: AnfrageWithDetails) => a.status !== 'offen').map((anfrage: AnfrageWithDetails) => (
                        <TableRow key={anfrage.id} className="border-slate-200 hover:bg-slate-50">
                          <TableCell className="font-medium">
                            {anfrage.unternehmen_name || 'Unbekannt'}
                          </TableCell>
                          <TableCell>{anfrage.dienstleistung_name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeColor(anfrage.status)}>
                              {getStatusLabel(anfrage.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
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
