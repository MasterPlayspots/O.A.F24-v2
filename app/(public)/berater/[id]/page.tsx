'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBeraterProfil, sendeAnfrage } from '@/lib/api/check';
import { useAuth } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { BeraterProfil, BeraterExpertise, Dienstleistung } from '@/lib/types';

interface BeraterDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

type BeraterProfilFull = BeraterProfil & {
  expertise: BeraterExpertise[];
  dienstleistungen: Dienstleistung[];
};

export default function BeraterDetailPage({ params }: BeraterDetailPageProps) {
  const [paramId, setParamId] = useState<string>('');
  const [berater, setBerater] = useState<BeraterProfilFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnfrageDialog, setShowAnfrageDialog] = useState(false);
  const [anfrageMessage, setAnfrageMessage] = useState('');
  const [sendingAnfrage, setSendingAnfrage] = useState(false);
  const [anfrageError, setAnfrageError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const { nutzer, token } = useAuth();

  // Hydration safe parameter reading
  useEffect(() => {
    let isMounted = true;
    params.then((p) => {
      if (isMounted) {
        setParamId(p.id);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [params]);

  // Hydration safe mounting flag
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch berater profile
  useEffect(() => {
    if (!paramId) return;

    const fetchBerater = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getBeraterProfil(paramId);
        setBerater(data as BeraterProfilFull);
      } catch (err) {
        console.error('Fehler beim Laden des Beraters:', err);
        setError('Entschuldigung, dieser Berater konnte nicht geladen werden.');
        setBerater(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBerater();
  }, [paramId]);

  const handleAnfrageClick = () => {
    if (!mounted) return;

    if (!nutzer) {
      router.push(`/registrieren?rolle=unternehmen&berater=${paramId}`);
      return;
    }

    if (nutzer.role === 'berater') {
      return;
    }

    setShowAnfrageDialog(true);
  };

  const handleSendAnfrage = async () => {
    if (!nutzer || !paramId || !anfrageMessage.trim() || !token) {
      return;
    }

    try {
      setSendingAnfrage(true);
      setAnfrageError(null);
      await sendeAnfrage({
        anUserId: paramId,
        nachricht: anfrageMessage.trim(),
      }, token);
      setShowAnfrageDialog(false);
      setAnfrageMessage('');
      alert('Ihre Anfrage wurde erfolgreich gesendet!');
    } catch (err) {
      console.error('Fehler beim Senden der Anfrage:', err);
      setAnfrageError(
        'Fehler beim Senden der Anfrage. Bitte versuchen Sie es später erneut.'
      );
    } finally {
      setSendingAnfrage(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAnfrageMessage(e.target.value);
  };

  const renderStars = (rating: number | undefined) => {
    if (rating === undefined || rating === null) return null;

    const roundedRating = Math.round(rating * 2) / 2;
    const fullStars = Math.floor(roundedRating);
    const hasHalfStar = roundedRating % 1 !== 0;

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => {
            const isFull = i < fullStars;
            const isHalf = i === fullStars && hasHalfStar;

            return (
              <div key={i} className="relative h-5 w-5">
                <Star className="h-5 w-5 text-gray-300" fill="currentColor" />
                {(isFull || isHalf) && (
                  <div
                    className="absolute top-0 left-0 overflow-hidden"
                    style={{ width: isFull ? '100%' : '50%' }}
                  >
                    <Star
                      className="h-5 w-5 text-yellow-400"
                      fill="currentColor"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <span className="text-sm font-medium text-gray-700">
          {roundedRating.toFixed(1)}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-4">
            <div className="h-10 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-64 w-full animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !berater) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/berater"
            className="mb-6 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Zurück zur Beraterliste
          </Link>

          <div className="rounded-lg bg-red-50 p-8 text-center ring-1 ring-red-200">
            <h1 className="text-lg font-semibold text-red-900">
              Berater nicht gefunden
            </h1>
            <p className="mt-2 text-sm text-red-700">
              {error || 'Entschuldigung, dieser Berater existiert nicht.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/berater"
          className="mb-6 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Zurück zur Beraterliste
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="mb-8 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {berater.displayName}
                  </h1>
                  {berater.region && (
                    <p className="mt-2 text-lg text-gray-600">
                      {berater.region}
                    </p>
                  )}
                </div>
                {berater.verfuegbar && (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    Verfügbar
                  </Badge>
                )}
              </div>

              {/* Rating */}
              {berater.ratingAvg !== undefined && (
                <div className="mt-4">
                  {renderStars(berater.ratingAvg)}
                </div>
              )}
            </div>

            {/* Bio */}
            {berater.bio && (
              <div className="mb-8 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">
                  Über mich
                </h2>
                <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {berater.bio}
                </p>
              </div>
            )}

            {/* Expertise */}
            {berater.expertise && berater.expertise.length > 0 && (
              <div className="mb-8 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">
                  Fachkompetenz
                </h2>
                <ul className="space-y-2">
                  {berater.expertise.map((item: BeraterExpertise, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg
                        className="mt-1 h-5 w-5 flex-shrink-0 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-gray-700">{item.foerderbereich}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dienstleistungen */}
            {berater.dienstleistungen && berater.dienstleistungen.length > 0 && (
              <div className="mb-8 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">
                  Dienstleistungen
                </h2>
                <div className="space-y-3">
                  {berater.dienstleistungen.map((service: Dienstleistung, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-slate-50 p-4"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {service.name}
                        </p>
                        {service.kategorie && (
                          <p className="mt-1 text-sm text-gray-600">
                            {service.kategorie}
                          </p>
                        )}
                      </div>
                      {service.preisVon !== undefined && (
                        <p className="ml-4 flex-shrink-0 text-lg font-semibold text-gray-900">
                          {new Intl.NumberFormat('de-DE', {
                            style: 'currency',
                            currency: 'EUR',
                          }).format(service.preisVon)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Branchen */}
            {berater.branchen && berater.branchen.length > 0 && (
              <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">
                  Spezialisierungen
                </h2>
                <div className="flex flex-wrap gap-2">
                  {berater.branchen.map((branche) => (
                    <Badge key={branche} variant="secondary">
                      {branche}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar - CTA */}
          <div>
            <div className="sticky top-8 rounded-lg bg-blue-50 p-6 ring-1 ring-blue-200">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Interesse?
              </h3>
              <p className="mb-6 text-sm text-gray-600">
                Nehmen Sie Kontakt auf und senden Sie eine Anfrage.
              </p>

              {mounted && (
                <>
                  {nutzer?.role === 'berater' ? (
                    <div className="rounded-lg bg-yellow-50 p-3 ring-1 ring-yellow-200">
                      <p className="text-xs text-yellow-800">
                        Sie sind als Berater angemeldet. Sie können keine
                        Anfragen stellen.
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={handleAnfrageClick}
                      size="lg"
                      className="w-full"
                    >
                      Anfrage senden
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Anfrage Dialog */}
      <Dialog open={showAnfrageDialog} onOpenChange={setShowAnfrageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Anfrage an {berater?.displayName}</DialogTitle>
            <DialogDescription>
              Beschreiben Sie kurz, wobei Sie Unterstützung benötigen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {anfrageError && (
              <div className="rounded-lg bg-red-50 p-3 ring-1 ring-red-200">
                <p className="text-sm text-red-800">{anfrageError}</p>
              </div>
            )}

            <Textarea
              placeholder="Ihre Anfrage..."
              value={anfrageMessage}
              onChange={handleTextareaChange}
              className="min-h-32"
              disabled={sendingAnfrage}
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowAnfrageDialog(false)}
                disabled={sendingAnfrage}
                className="flex-1"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSendAnfrage}
                disabled={!anfrageMessage.trim() || sendingAnfrage}
                className="flex-1"
              >
                {sendingAnfrage && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Senden
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
