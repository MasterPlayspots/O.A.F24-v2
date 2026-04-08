import { notFound } from 'next/navigation';
import { getProgramm } from '@/lib/api/fund24';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ProgrammDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProgrammDetailPage({
  params,
}: ProgrammDetailPageProps) {
  const { id } = await params;

  let programm;
  try {
    programm = await getProgramm(Number(id));
  } catch {
    notFound();
  }

  if (!programm) {
    notFound();
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/programme"
          className="mb-6 inline-flex items-center text-sm font-medium text-architect-primary-light hover:text-white"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Zurück zu Förderungen
        </Link>

        <div className="mb-8">
          <h1 className="font-display mb-3 text-4xl font-bold text-white">
            {programm.titel}
          </h1>
          <div className="flex flex-wrap gap-2">
            {programm.foerderart && (
              <span className="inline-flex items-center rounded-full bg-architect-primary/20 px-3 py-1 text-sm font-medium text-architect-primary-light">
                {programm.foerderart}
              </span>
            )}
            {programm.foerderbereich && (
              <span className="inline-flex items-center rounded-full bg-architect-tertiary/25 px-3 py-1 text-sm font-medium text-architect-tertiary-light">
                {programm.foerderbereich}
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {programm.kurztext && (
              <div className="mb-8 rounded-lg bg-architect-surface/60 p-6">
                <h2 className="font-display mb-3 text-xl font-semibold text-white">
                  Übersicht
                </h2>
                <p className="text-white/80 leading-relaxed">
                  {programm.kurztext}
                </p>
              </div>
            )}

            <div className="space-y-6 rounded-lg bg-architect-surface/60 p-6">
              <div>
                <h2 className="font-display mb-4 text-xl font-semibold text-white">
                  Details
                </h2>
              </div>

              {programm.foerderhoehe_min !== undefined &&
                programm.foerderhoehe_max !== undefined && (
                  <div className="pb-4">
                    <dt className="text-sm font-medium text-white/50">Förderhöhe</dt>
                    <dd className="font-display mt-2 text-lg font-semibold text-white">
                      {formatCurrency(programm.foerderhoehe_min)} -{' '}
                      {formatCurrency(programm.foerderhoehe_max)}
                    </dd>
                  </div>
                )}

              {programm.foerdersatz_pct !== undefined && (
                <div className="pb-4">
                  <dt className="text-sm font-medium text-white/50">Förderquote</dt>
                  <dd className="font-display mt-2 text-lg font-semibold text-white">
                    {programm.foerdersatz_pct}%
                  </dd>
                </div>
              )}

              {programm.foerdergebiet && (
                <div className="pb-4">
                  <dt className="text-sm font-medium text-white/50">Fördergebiet</dt>
                  <dd className="mt-2 text-white/80">{programm.foerdergebiet}</dd>
                </div>
              )}

              {programm.antragsteller && (
                <div className="pb-4">
                  <dt className="text-sm font-medium text-white/50">Antragsteller</dt>
                  <dd className="mt-2 text-white/80">{programm.antragsteller}</dd>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="sticky top-8 rounded-lg bg-architect-primary/20 p-6">
              <h3 className="font-display mb-4 text-lg font-semibold text-white">
                Passt dieses Programm?
              </h3>
              <p className="mb-6 text-sm text-white/70">
                Nutzen Sie unseren schnellen Check, um zu sehen, ob diese
                Förderung für Ihr Unternehmen geeignet ist.
              </p>
              <Link href={`/foerder-schnellcheck?programm=${id}`}>
                <Button
                  className="w-full bg-architect-primary hover:bg-architect-primary-container text-white"
                  size="lg"
                >
                  Zum Schnellcheck
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
