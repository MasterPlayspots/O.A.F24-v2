'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/store/authStore';
import { useVerifiedGuard } from '@/lib/hooks/useVerifiedGuard';
import { useMount } from '@/lib/hooks/useMount';
import { getAnfragen } from '@/lib/api/check';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

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
      } catch (error: any) {
        setFehler(error?.message || 'Fehler beim Laden der Anfragen');
      } finally {
        setLadet(false);
      }
    };

    loadData();
  }, [isMounted, guardLoading, istUnternehmen, token]);

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

  const getStatusBadgeColor = (status: string) => {
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Anfragen</h1>
          <p className="text-slate-600">Übersicht aller Ihre Anfragen an Berater</p>
        </div>

        {anfragen.length === 0 ? (
          <LeererZustand
            titel="Keine Anfragen"
            beschreibung="Sie haben noch keine Anfragen an Berater gesendet"
          />
        ) : (
          <Card className="border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 bg-slate-50">
                    <TableHead>Berater</TableHead>
                    <TableHead>Dienstleistung</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anfragen.map((anfrage: AnfrageWithDetails) => (
                    <TableRow key={anfrage.id} className="border-slate-200 hover:bg-slate-50">
                      <TableCell className="font-medium">
                        {anfrage.anUserName || 'Unbekannt'}
                      </TableCell>
                      <TableCell>{anfrage.nachricht || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeColor(anfrage.status) as any}>
                          {getStatusLabel(anfrage.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {new Date(anfrage.createdAt).toLocaleDateString('de-DE')}
                      </TableCell>
                      <TableCell>
                        {anfrage.status === 'angenommen' && (
                          <Button variant="outline" size="sm">
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
