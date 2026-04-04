import Link from 'next/link'
import { getStats } from '@/lib/api/fund24'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

export const revalidate = 3600

export default async function LandingPage() {
  let stats: Awaited<ReturnType<typeof getStats>> | null = null

  try {
    stats = await getStats()
  } catch (error) {
    console.error('Fehler beim Abrufen der Statistiken:', error)
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-6 sm:py-32 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
            Fördermittel für Ihr Vorhaben
          </h1>
          <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
            Finden Sie die passenden Förderprogramme für Ihr Unternehmen. Kostenlos, unabhängig und
            datengetrieben — mit künstlicher Intelligenz.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:gap-3">
            <Button asChild variant="default" size="lg">
              <Link href="/foerder-schnellcheck">
                Fördercheck starten
                <ArrowRight className="ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/registrieren">Registrieren</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Row */}
      {stats && (
        <section className="bg-gray-50 dark:bg-gray-900 py-12 px-6 sm:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{stats.total.toLocaleString('de-DE')}</div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">Programme</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">16</div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">Bundesländer</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">Kostenlos</div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">Für Unternehmen</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How It Works Section */}
      <section className="py-20 px-6 sm:py-24 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Wie es funktioniert
          </h2>

          <div className="mt-16 grid gap-12 sm:grid-cols-3">
            {/* Step 1 */}
            <div className="flex flex-col items-start">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white font-bold">
                1
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                Profil anlegen
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Geben Sie Informationen zu Ihrem Unternehmen ein — Branche, Bundesland, Vorhaben.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-start">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white font-bold">
                2
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                KI-Analyse
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Unsere KI findet die für Sie relevantesten Förderprogramme aus über 2.500 Optionen.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-start">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white font-bold">
                3
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                Berater finden
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Vernetzen Sie sich mit spezialisierten Beratern, die Ihre Antragsstellung unterstützen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Berater CTA Section */}
      <section className="bg-primary/10 dark:bg-primary/20 py-16 px-6 sm:py-20 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Sie sind Berater?
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Registrieren Sie sich als Berater und erhalten Sie Zugang zu qualifizierten Unternehmen, die Ihre
            Expertise suchen.
          </p>
          <div className="mt-8">
            <Button asChild variant="default" size="lg">
              <Link href="/registrieren?rolle=berater">
                Als Berater registrieren
                <ArrowRight className="ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
