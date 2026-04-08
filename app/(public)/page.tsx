import Link from 'next/link'
import { getStats } from '@/lib/api/fund24'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export const revalidate = 3600

export default async function LandingPage() {
  let stats: Awaited<ReturnType<typeof getStats>> = {
    total: 2500,
    bundesweit: 450,
    bundeslaender: 16,
  }

  try {
    stats = await getStats()
  } catch (error) {
    console.error('Fehler beim Abrufen der Statistiken (Fallback aktiv):', error)
  }

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white">
      {/* Hero Section */}
      <section className="relative py-20 px-6 sm:py-32 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Fördermittel für Ihr Vorhaben
          </h1>
          <p className="mt-6 text-lg text-white/70 max-w-2xl">
            Finden Sie die passenden Förderprogramme für Ihr Unternehmen. Kostenlos, unabhängig und
            datengetrieben — mit künstlicher Intelligenz.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:gap-3">
            <Button
              asChild
              size="lg"
              className="bg-architect-primary hover:bg-architect-primary-container text-white"
            >
              <Link href="/foerder-schnellcheck">
                Fördercheck starten
                <ArrowRight className="ml-2" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="bg-architect-surface/60 hover:bg-architect-surface/40 text-white border-0"
            >
              <Link href="/registrieren">Registrieren</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <section className="bg-architect-surface-low/40 py-12 px-6 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="font-display text-3xl font-bold text-architect-primary-light">
                {stats.total.toLocaleString('de-DE')}
              </div>
              <div className="mt-2 text-sm text-white/60">Programme</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl font-bold text-architect-primary-light">16</div>
              <div className="mt-2 text-sm text-white/60">Bundesländer</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl font-bold text-architect-primary-light">Kostenlos</div>
              <div className="mt-2 text-sm text-white/60">Für Unternehmen</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6 sm:py-24 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Wie es funktioniert
          </h2>

          <div className="mt-16 grid gap-12 sm:grid-cols-3">
            {[
              { n: 1, title: 'Profil anlegen', desc: 'Geben Sie Informationen zu Ihrem Unternehmen ein — Branche, Bundesland, Vorhaben.' },
              { n: 2, title: 'KI-Analyse', desc: 'Unsere KI findet die für Sie relevantesten Förderprogramme aus über 2.500 Optionen.' },
              { n: 3, title: 'Berater finden', desc: 'Vernetzen Sie sich mit spezialisierten Beratern, die Ihre Antragsstellung unterstützen.' },
            ].map((step) => (
              <div key={step.n} className="flex flex-col items-start">
                <div className="font-display flex h-12 w-12 items-center justify-center rounded-lg bg-architect-primary text-white font-bold">
                  {step.n}
                </div>
                <h3 className="font-display mt-4 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm text-white/60">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Berater CTA Section */}
      <section className="bg-architect-surface-low/40 py-16 px-6 sm:py-20 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Sie sind Berater?
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Registrieren Sie sich als Berater und erhalten Sie Zugang zu qualifizierten Unternehmen, die Ihre
            Expertise suchen.
          </p>
          <div className="mt-8">
            <Button
              asChild
              size="lg"
              className="bg-architect-primary hover:bg-architect-primary-container text-white"
            >
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
