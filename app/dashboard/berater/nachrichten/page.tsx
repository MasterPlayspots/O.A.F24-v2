'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/store/authStore';
import { useVerifiedGuard } from '@/lib/hooks/useVerifiedGuard';
import { useMount } from '@/lib/hooks/useMount';
import { getAnfragen, getNachrichten, sendeNachricht } from '@/lib/api/check';
import { Anfrage, Nachricht } from '@/lib/types';
import { LadeSpinner } from '@/components/shared/LadeSpinner';
import { FehlerBox } from '@/components/shared/FehlerBox';
import { LeererZustand } from '@/components/shared/LeererZustand';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Send, MessageSquare } from 'lucide-react';

interface AnfrageWithDetails extends Anfrage {
  unternehmen_name?: string;
  dienstleistung_name?: string;
}

interface NachrichtWithDetails extends Nachricht {
  gesendet_von?: string;
  text?: string;
}

export default function NachrichtenPage() {
  const { token, istBerater } = useAuth();
  const { loading: guardLoading } = useVerifiedGuard();
  const isMounted = useMount();
  const [anfragen, setAnfragen] = useState<AnfrageWithDetails[]>([]);
  const [selectedAnfrageId, setSelectedAnfrageId] = useState<string | null>(null);
  const [nachrichten, setNachrichten] = useState<NachrichtWithDetails[]>([]);
  const [fehler, setFehler] = useState('');
  const [ladet, setLadet] = useState(true);
  const [sende, setSende] = useState(false);
  const [nachrichtText, setNachrichtText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMounted || guardLoading || !istBerater() || !token) return;

    const loadAnfragen = async () => {
      try {
        setFehler('');
        const { anfragen: anfragenData } = await getAnfragen(token, 'berater');
        const accepted = (anfragenData || []).filter((a: AnfrageWithDetails) => a.status === 'angenommen');
        setAnfragen(accepted);
        if (accepted.length > 0 && !selectedAnfrageId) {
          setSelectedAnfrageId(accepted[0].id);
        }
      } catch (error) {
        setFehler(error instanceof Error ? error.message : 'Fehler beim Laden der Anfragen');
      } finally {
        setLadet(false);
      }
    };

    loadAnfragen();
  }, [isMounted, guardLoading, istBerater, token, selectedAnfrageId]);

  useEffect(() => {
    if (!selectedAnfrageId || !token) return;

    const loadNachrichten = async () => {
      try {
        const { nachrichten: nachrichtenData } = await getNachrichten(selectedAnfrageId, token);
        setNachrichten(nachrichtenData || []);
      } catch (error) {
        setFehler(error instanceof Error ? error.message : 'Fehler beim Laden der Nachrichten');
      }
    };

    loadNachrichten();
    const interval = setInterval(loadNachrichten, 10000);
    return () => clearInterval(interval);
  }, [selectedAnfrageId, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [nachrichten]);

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nachrichtText.trim() || !selectedAnfrageId || !token) return;

    try {
      setSende(true);
      await sendeNachricht(selectedAnfrageId, nachrichtText, token);
      setNachrichtText('');
      const { nachrichten: nachrichtenData } = await getNachrichten(selectedAnfrageId, token);
      setNachrichten(nachrichtenData || []);
    } catch (error) {
      setFehler(error instanceof Error ? error.message : 'Fehler beim Senden');
    } finally {
      setSende(false);
    }
  };

  if (!isMounted || guardLoading || ladet) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-12 w-48 mb-8" />
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="col-span-1 h-96" />
            <Skeleton className="col-span-3 h-96" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Nachrichten</h1>
          <p className="text-slate-600">Kommunikation mit Ihren Projektpartnern</p>
        </div>

        {anfragen.length === 0 ? (
          <LeererZustand
            titel="Keine Gespräche"
            beschreibung="Sie haben noch keine angenommenen Anfragen"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[600px]">
            <Card className="border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900">Anfragen</h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                {anfragen.map((anfrage: AnfrageWithDetails) => (
                  <button
                    key={anfrage.id}
                    onClick={() => setSelectedAnfrageId(anfrage.id)}
                    className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition ${
                      selectedAnfrageId === anfrage.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <p className="font-medium text-sm text-slate-900">
                      {anfrage.unternehmen_name || 'Unbekannt'}
                    </p>
                    <p className="text-xs text-slate-600 mt-1 truncate">
                      {anfrage.dienstleistung_name || '-'}
                    </p>
                    <Badge className="mt-2" variant="secondary">
                      Aktiv
                    </Badge>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="border-slate-200 md:col-span-3 overflow-hidden flex flex-col">
              {selectedAnfrageId ? (
                <>
                  <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-900">
                      {anfragen.find((a: AnfrageWithDetails) => a.id === selectedAnfrageId)?.unternehmen_name ||
                        'Gesprächspartner'}
                    </h2>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {fehler && <FehlerBox fehler={fehler} />}

                    {nachrichten.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600">Keine Nachrichten. Starten Sie ein Gespräch!</p>
                      </div>
                    ) : (
                      <>
                        {nachrichten.map((msg: NachrichtWithDetails) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.gesendet_von === 'berater' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs px-4 py-2 rounded-lg ${
                                msg.gesendet_von === 'berater'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-slate-200 text-slate-900'
                              }`}
                            >
                              <p className="text-sm break-words">{msg.text || msg.inhalt}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  msg.gesendet_von === 'berater'
                                    ? 'text-blue-100'
                                    : 'text-slate-600'
                                }`}
                              >
                                {new Date(msg.createdAt).toLocaleTimeString('de-DE', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  <form onSubmit={handleSend} className="p-4 border-t border-slate-200">
                    <div className="flex gap-2">
                      <Input
                        value={nachrichtText}
                        onChange={(e) => setNachrichtText(e.target.value)}
                        placeholder="Nachricht eingeben..."
                        disabled={sende}
                      />
                      <Button type="submit" disabled={sende || !nachrichtText.trim()}>
                        {sende ? (
                          <LadeSpinner />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-slate-500">Wählen Sie eine Anfrage</p>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
