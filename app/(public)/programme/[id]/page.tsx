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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/programme"
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
          Zurück zu Förderungen
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-3 text-4xl font-bold text-gray-900">
            {programm.titel}
          </h1>
          <div className="flex flex-wrap gap-2">
            {programm.foerderart && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                {programm.foerderart}
              </span>
            )}
            {programm.foerderbereich && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                {programm.foerderbereich}
              </span>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left column - main content */}
          <div className="lg:col-span-2">
            {/* Description */}
            {programm.kurztext && (
              <div className="mb-8 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  Übersicht
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {programm.kurztext}
                </p>
              </div>
            )}

            {/* Details grid */}
            <div className="space-y-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <div>
                <h2 className="mb-4 text-xl font-semibold text-gray-900">
                  Details
                </h2>
              </div>

              {programm.foerderhoehe_min !== undefined &&
                programm.foerderhoehe_max !== undefined && (
                  <div className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                    <dt className="text-sm font-medium text-gray-500">
                      Förderhöhe
                    </dt>
                    <dd className="mt-2 text-lg font-semibold text-gray-900">
                      {formatCurrency(programm.foerderhoehe_min)} -{' '}
                      {formatCurrency(programm.foerderhoehe_max)}
                    </dd>
                  </div>
                )}

              {programm.foerdersatz_pct !== undefined && (
                <div className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                  <dt className="text-sm font-medium text-gray-500">
                    Förderquote
                  </dt>
                  <dd className="mt-2 text-lg font-semibold text-gray-900">
                    {programm.foerdersatz_pct}%
                  </dd>
                </div>
              )}

              {programm.foerdergebiet && (
                <div className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                  <dt className="text-sm font-medium text-gray-500">
                    Fördergebiet
                  </dt>
                  <dd className="mt-2 text-gray-900">
                    {programm.foerdergebiet}
                  </dd>
                </div>
              )}

              {programm.antragsteller && (
                <div className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                  <dt className="text-sm font-medium text-gray-500">
                    Antragsteller
                  </dt>
                  <dd className="mt-2 text-gray-900">{programm.antragsteller}</dd>
                </div>
              )}
            </div>
          </div>

          {/* Right column - CTA */}
          <div>
            <div className="sticky top-8 rounded-lg bg-blue-50 p-6 ring-1 ring-blue-200">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Passt dieses Programm?
              </h3>
              <p className="mb-6 text-sm text-gray-600">
                Nutzen Sie unseren schnellen Check, um zu sehen, ob diese
                Förderung für Ihr Unternehmen geeignet ist.
              </p>
              <Link href={`/foerder-schnellcheck?programm=${id}`}>
                <Button className="w-full" size="lg">
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
