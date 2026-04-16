'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/store/authStore';
import { useVerifiedGuard } from '@/lib/hooks/useVerifiedGuard';
import { useMount } from '@/lib/hooks/useMount';
import { getAnfragen } from '@/lib/api/check';
import { Anfrage } from '@/lib/types';
import { FehlerBox } from '@/components/shared/FehlerBox';
import { LeererZustand } from '@/components/shared/LeererZustand';
import { toast } from 'sonner';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';


interface AnfrageWithDetails extends Anfrage {
  berater_name?: string;
  dienstleistung_name?: string;
  erstellt_am: string;
}

export default function UnternehmenAnfragenPage() {
  const { token, istUnternehmen } = useAuth();
  const { loading: guardLoading } = useVerifiedGuard();
  const isMounted = useMount();
  const [anfragen, setAnfragen] = useState<AnfrageWithDetails[]>([]);
  const [fehler, setFehler] = useState('');
  const [ladet, setLadet] = useState(true);

  useEffect(() => {
    if (!isMounted || guardLoading || !istUnternehmen() || !token) return;

    const loadData = async () => {
      try {
        setFehler('');
        const result = await getAnfragen(token, 'unternehmen');
        const anfragenData = Array.isArray(result) ? result : (result.anfragen || []);
        setAnfragen(anfragenData as AnfrageWithDetails[]);
      } catch (error) {
        setFehler(error instanceof Error ? error.message : 'Fehler beim Laden der Anfragen');
      } finally {
        setLadet(false);
      }
    };

    loadData();
  }, [isMounted, guardLoading, istUnternehmen, token]);

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

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-white mb-2">Anfragen</h1>
          <p className="text-white/60">Übersicht aller Ihre Anfragen an Berater</p>
        </div>

        {anfragen.length === 0 ? (
          <LeererZustand
            titel="Noch keine Anfragen"
            beschreibung="Finde einen passenden Berater und schick eine erste Anfrage."
            cta={{ text: 'Berater entdecken', href: '/berater' }}
          />
        ) : (
          <Card className="bg-architect-surface/60 border-0 text-white overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-0 bg-architect-surface-low/30 hover:bg-architect-surface-low/30">
                    <TableHead className="text-white/70">Berater</TableHead>
                    <TableHead className="text-white/70">Dienstleistung</TableHead>
                    <TableHead className="text-white/70">Status</TableHead>
                    <TableHead className="text-white/70">Datum</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anfragen.map((anfrage: AnfrageWithDetails) => (
                    <TableRow key={anfrage.id} className="border-0 hover:bg-architect-surface/40">
                      <TableCell className="font-medium">
                        {anfrage.anUserName || 'Unbekannt'}
                      </TableCell>
                      <TableCell>{anfrage.nachricht || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeColor(anfrage.status)}>
                          {getStatusLabel(anfrage.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-white/60">
                        {new Date(anfrage.createdAt).toLocaleDateString('de-DE')}
                      </TableCell>
                      <TableCell>
                        {anfrage.status === 'angenommen' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              toast.info(
                                'Nachrichten-Funktion für Unternehmen wird in Kürze freigeschaltet. Ihr Berater meldet sich in der Zwischenzeit per E-Mail.',
                              )
                            }
                            className="bg-architect-surface/60 border-0 text-white hover:bg-architect-surface/40 hover:text-white"
                          >
                            Nachricht
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
