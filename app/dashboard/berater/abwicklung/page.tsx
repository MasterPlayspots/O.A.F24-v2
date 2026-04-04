'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/store/authStore';
import { useVerifiedGuard } from '@/lib/hooks/useVerifiedGuard';
import { useMount } from '@/lib/hooks/useMount';
import { getProvisionVertraege, uploadAbwicklungDokument } from '@/lib/api/check';
import { Provision } from '@/lib/types';
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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileUp, File, Euro, AlertCircle } from 'lucide-react';

interface ProvisionVertrag extends Provision {
  unternehmen_name?: string;
  dokument_url?: string;
}

export default function AbwicklungPage() {
  const { token, istBerater } = useAuth();
  const { loading: guardLoading } = useVerifiedGuard();
  const isMounted = useMount();
  const [vertraege, setVertraege] = useState<ProvisionVertrag[]>([]);
  const [fehler, setFehler] = useState('');
  const [ladet, setLadet] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    if (!isMounted || guardLoading || !istBerater() || !token) return;

    const loadData = async () => {
      try {
        setFehler('');
        const result = await getProvisionVertraege(token);
        const vertraegeData = Array.isArray(result) ? result : (result as any).provisionen || [];
        setVertraege(vertraegeData);
      } catch (error: any) {
        setFehler(error?.message || 'Fehler beim Laden der Provisionen');
      } finally {
        setLadet(false);
      }
    };

    loadData();
  }, [isMounted, guardLoading, istBerater, token]);

  const handleFileSelect = async (vertragId: string, file: File | null) => {
    if (!file || !token) return;

    if (file.type !== 'application/pdf') {
      setFehler('Nur PDF-Dateien sind erlaubt');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFehler('Datei darf maximal 10 MB groß sein');
      return;
    }

    try {
      setFehler('');
      setUploading(vertragId);
      const formData = new FormData();
      formData.append('file', file);
      await uploadAbwicklungDokument(vertragId, formData, token);
      const result = await getProvisionVertraege(token);
      const vertraegeData = Array.isArray(result) ? result : (result as any).provisionen || [];
      setVertraege(vertraegeData);
    } catch (error: any) {
      setFehler(error?.message || 'Fehler beim Upload');
    } finally {
      setUploading(null);
    }
  };

  const handleUploadClick = (vertragId: string) => {
    fileInputRef.current[vertragId]?.click();
  };

  if (!isMounted || guardLoading || ladet) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-12 w-48 mb-8" />
          <Skeleton className="h-96" />
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'offen':
        return 'secondary';
      case 'in_bearbeitung':
        return 'default';
      case 'abgeschlossen':
        return 'default';
      case 'ausstehend':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'offen':
        return 'Offen';
      case 'in_bearbeitung':
        return 'In Bearbeitung';
      case 'abgeschlossen':
        return 'Abgeschlossen';
      case 'ausstehend':
        return 'Ausstehend';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Provisionsabwicklung</h1>
          <p className="text-slate-600">Verwalten Sie Ihre Provisionsverträge und Nachweise</p>
        </div>

        {fehler && <FehlerBox fehler={fehler} />}

        {vertraege.length === 0 ? (
          <LeererZustand
            titel="Keine Provisionen"
            beschreibung="Sie haben noch keine abrechenbaren Provisionen"
          />
        ) : (
          <Card className="border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 bg-slate-50">
                    <TableHead>Unternehmen</TableHead>
                    <TableHead>Provision (EUR)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dokument</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vertraege.map((vertrag) => (
                    <TableRow key={vertrag.id} className="border-slate-200 hover:bg-slate-50">
                      <TableCell className="font-medium">
                        {vertrag.unternehmen_name || 'Unbekannt'}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        {(vertrag.provisionBetrag || 0).toLocaleString('de-DE', {
                          style: 'currency',
                          currency: 'EUR',
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeColor(vertrag.status) as any}>
                          {getStatusLabel(vertrag.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {vertrag.dokument_url ? (
                          <a
                            href={vertrag.dokument_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                          >
                            <File className="w-4 h-4" />
                            PDF
                          </a>
                        ) : (
                          <span className="text-slate-500 text-sm flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Fehlt
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => handleUploadClick(vertrag.id)}
                          disabled={uploading === vertrag.id}
                          size="sm"
                          variant={vertrag.dokument_url ? 'outline' : 'default'}
                        >
                          {uploading === vertrag.id ? (
                            <LadeSpinner />
                          ) : (
                            <>
                              <FileUp className="w-4 h-4 mr-2" />
                              {vertrag.dokument_url ? 'Ersetzen' : 'Upload'}
                            </>
                          )}
                        </Button>
                        <input
                          ref={(el) => {
                            if (el) fileInputRef.current[vertrag.id] = el;
                          }}
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) =>
                            handleFileSelect(vertrag.id, e.target.files?.[0] || null)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-3">
            <AlertCircle className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Dokumentenrichtlinien</h3>
              <ul className="text-sm text-blue-800 mt-2 space-y-1">
                <li>Nur PDF-Dateien werden akzeptiert</li>
                <li>Maximale Dateigröße: 10 MB</li>
                <li>Dokumente müssen Nachweise über erbrachte Leistungen enthalten</li>
                <li>Alle erforderlichen Informationen müssen für die Verarbeitung vorhanden sein</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
