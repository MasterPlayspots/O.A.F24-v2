'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/store/authStore';
import { useVerifiedGuard } from '@/lib/hooks/useVerifiedGuard';
import { useMount } from '@/lib/hooks/useMount';
import { getDashboard } from '@/lib/api/check';
import { DashboardUnternehmen, CheckSession } from '@/lib/types';
import { FehlerBox } from '@/components/shared/FehlerBox';
import { Button } from '@/components/ui/button';
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
import { ChevronRight, FileText, Mail, Star, TrendingUp } from 'lucide-react';

export default function UnternehmenDashboardPage() {
  const { token, istUnternehmen } = useAuth();
  const { loading: guardLoading } = useVerifiedGuard();
  const isMounted = useMount();
  const [data, setData] = useState<DashboardUnternehmen | null>(null);
  const [fehler, setFehler] = useState('');
  const [ladet, setLadet] = useState(true);

  useEffect(() => {
    if (!isMounted || guardLoading || !istUnternehmen() || !token) return;

    const loadData = async () => {
      try {
        setFehler('');
        const result = await getDashboard('unternehmen', token);
        setData(result as DashboardUnternehmen);
      } catch (error) {
        setFehler(error instanceof Error ? error.message : 'Fehler beim Laden der Daten');
      } finally {
        setLadet(false);
      }
    };

    loadData();
  }, [isMounted, guardLoading, istUnternehmen, token]);

  if (!isMounted || guardLoading || ladet) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-12 w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
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
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Dashboard</h1>
            <p className="text-slate-600">Übersicht Ihrer Fördercheck-Aktivitäten</p>
          </div>
          <Button asChild size="lg">
            <Link href="/foerdercheck">+ Neuen Check starten</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Letzte Checks</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {data.letzteChecks?.length || 0}
                </p>
              </div>
              <FileText className="w-10 h-10 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6 border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Offene Anfragen</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {data.offeneAnfragen || 0}
                </p>
              </div>
              <Mail className="w-10 h-10 text-amber-500" />
            </div>
          </Card>

          <Card className="p-6 border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Favoriten</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {data.favoritenAnzahl || 0}
                </p>
              </div>
              <Star className="w-10 h-10 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-6 border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Aktive Tracks</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {data.aktiveTracks || 0}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500" />
            </div>
          </Card>
        </div>

        <Card className="border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Letzte Checks</h2>
          </div>

          {data.letzteChecks && data.letzteChecks.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 bg-slate-50">
                    <TableHead>Förderbereich</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.letzteChecks.map((check: CheckSession) => (
                    <TableRow key={check.id} className="border-slate-200 hover:bg-slate-50">
                      <TableCell className="font-medium">{check.branche}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            check.status === 'abgeschlossen'
                              ? 'default'
                              : check.status === 'chat'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {check.status === 'abgeschlossen'
                            ? 'Abgeschlossen'
                            : check.status === 'chat'
                              ? 'In Bearbeitung'
                              : 'Entwurf'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {new Date(check.createdAt).toLocaleDateString('de-DE')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/dashboard/checks/${check.id}`}
                          className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                        >
                          Ansehen
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">Noch keine Checks durchgeführt</p>
              <Button asChild>
                <Link href="/foerdercheck">Starten Sie Ihren ersten Check</Link>
              </Button>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard/unternehmen/anfragen">Meine Anfragen ansehen</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard/unternehmen/favoriten">Meine Favoriten</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
