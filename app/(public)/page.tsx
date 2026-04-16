import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Search, Users, FileCheck, ShieldCheck, Zap, Sparkles } from 'lucide-react'
import { createMetadata } from '@/lib/seo/metadata'

export const revalidate = 3600
export const metadata = createMetadata({
  title: 'Fördermittel für KMU finden',
  description:
    'fund24 verbindet kleine und mittlere Unternehmen mit zertifizierten Fördermittelberatern. Über 3.400 Förderprogramme.',
  path: '/',
})

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-architect-surface font-body text-white">
      {/* ============================================================
           HERO
         ============================================================ */}
      <section className="relative px-6 pt-24 pb-20 sm:px-8 sm:pt-32 sm:pb-28">
        <div className="mx-auto max-w-5xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-architect-surface-low/40 px-4 py-2 text-xs uppercase tracking-widest text-white/70">
            <Sparkles className="h-3.5 w-3.5" />
            Kostenloser KI-Fördercheck
          </div>

          <h1 className="mt-8 font-display text-5xl font-bold tracking-[-0.03em] text-white sm:text-6xl lg:text-7xl leading-[1.05]">
            Fördermittel für dein Unternehmen —{' '}
            <span className="text-architect-primary-light">in 5 Minuten gefunden.</span>
          </h1>

          <p className="mt-8 max-w-2xl text-lg text-white/70 leading-relaxed sm:text-xl">
            Unsere KI scannt 3.400+ aktive Förderprogramme auf Bundes-, Länder- und EU-Ebene und
            zeigt dir genau die Töpfe, die zu deinem Vorhaben passen — kostenlos und unverbindlich.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-br from-architect-primary to-architect-primary-container hover:brightness-110 text-white font-display shadow-[0_10px_40px_rgba(101,117,173,0.3)]"
            >
              <Link href="/foerder-schnellcheck">
                Fördercheck starten
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="bg-architect-surface-low/40 border-0 text-white hover:bg-architect-surface-low/60 hover:text-white font-display"
            >
              <Link href="/programme">Alle Programme ansehen</Link>
            </Button>
          </div>

          <p className="mt-6 text-sm text-white/50">
            Keine Anmeldung nötig · 100 % kostenlos für Unternehmen · DSGVO-konform
          </p>
        </div>
      </section>

      {/* ============================================================
           STATS — tonal layer, no border
         ============================================================ */}
      <section className="bg-architect-surface-low/50 px-6 py-12 sm:px-8">
        <div className="mx-auto max-w-5xl grid grid-cols-2 gap-8 sm:grid-cols-4">
          {[
            { n: '3.400+', l: 'aktive Programme' },
            { n: '16', l: 'Bundesländer' },
            { n: '< 5 min', l: 'bis zum Ergebnis' },
            { n: 'KI', l: 'geprüfter Match' },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <div className="font-display text-3xl font-bold tracking-tight text-architect-primary-light sm:text-4xl">
                {s.n}
              </div>
              <div className="mt-2 text-xs uppercase tracking-widest text-white/50">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
           VALUE PROPS (3-column)
         ============================================================ */}
      <section className="px-6 py-24 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl max-w-3xl">
            Von der ersten Recherche bis zur Bewilligung — alles auf einer Plattform.
          </h2>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: <Search className="h-6 w-6" />,
                title: 'Katalog entdecken',
                desc: '3.400+ Förderprogramme durchsuchbar nach Branche, Region, Fördergegenstand. Kein Login nötig.',
                cta: { href: '/programme', label: 'Katalog öffnen' },
              },
              {
                icon: <Zap className="h-6 w-6" />,
                title: 'KI-Fördercheck',
                desc: 'Dein Profil, 3 Fragen, fertig. Wir liefern die passendsten Töpfe plus Anlaufstellen.',
                cta: { href: '/foerder-schnellcheck', label: 'Check starten' },
              },
              {
                icon: <Users className="h-6 w-6" />,
                title: 'Berater-Matching',
                desc: 'Geprüfte Fördermittelberater nach Expertise und Region. Direkt anschreiben, schnell loslegen.',
                cta: { href: '/berater', label: 'Berater finden' },
              },
            ].map((card) => (
              <div
                key={card.title}
                className="group relative flex flex-col gap-5 rounded-lg bg-architect-surface/60 p-8 transition hover:bg-architect-surface/80"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-architect-primary/30 text-architect-primary-light">
                  {card.icon}
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-white tracking-tight">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm text-white/70 leading-relaxed">{card.desc}</p>
                </div>
                <Link
                  href={card.cta.href}
                  className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-architect-primary-light hover:text-white transition"
                >
                  {card.cta.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
           HOW IT WORKS (3 steps, icon+number hybrid)
         ============================================================ */}
      <section className="bg-architect-surface-low/50 px-6 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            So läuft&apos;s ab
          </h2>

          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            {[
              {
                n: 1,
                title: 'Profil anlegen',
                desc: 'Branche, Region, Vorhaben — in 2 Minuten. Keine Registrierung für den Check erforderlich.',
              },
              {
                n: 2,
                title: 'KI-Matching',
                desc: 'Wir priorisieren die 3.400+ Programme nach deiner Eignung und fassen Anforderungen zusammen.',
              },
              {
                n: 3,
                title: 'Antrag & Beratung',
                desc: 'Stell den Antrag direkt bei uns, lade Dokumente hoch und lade einen Berater als Helfer ein.',
              },
            ].map((step) => (
              <div key={step.n} className="flex flex-col gap-3">
                <div className="font-display text-5xl font-bold text-architect-primary-light/60 tracking-tight">
                  0{step.n}
                </div>
                <h3 className="font-display text-lg font-semibold text-white tracking-tight">
                  {step.title}
                </h3>
                <p className="text-sm text-white/70 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
           TRUST SIGNALS
         ============================================================ */}
      <section className="px-6 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-4xl grid gap-8 sm:grid-cols-3">
          {[
            {
              icon: <ShieldCheck className="h-6 w-6" />,
              title: 'DSGVO-konform',
              desc: 'Deine Daten bleiben in der EU. Keine Weitergabe an Dritte.',
            },
            {
              icon: <FileCheck className="h-6 w-6" />,
              title: 'Geprüfte Berater',
              desc: 'BAFA-Zertifizierung-Check vor Freischaltung.',
            },
            {
              icon: <Zap className="h-6 w-6" />,
              title: 'Keine versteckten Kosten',
              desc: 'Für Unternehmen komplett kostenlos — auch bei Antragstellung.',
            },
          ].map((t) => (
            <div key={t.title} className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-architect-tertiary/25 text-architect-tertiary-light">
                {t.icon}
              </div>
              <div>
                <h3 className="font-display font-semibold text-white tracking-tight">{t.title}</h3>
                <p className="mt-1 text-sm text-white/60">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
           BERATER CTA
         ============================================================ */}
      <section className="bg-gradient-to-br from-architect-surface-low to-architect-surface-low/60 px-6 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-widest text-white/50 mb-4">Für Berater</p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Neue Mandate, ohne Kaltakquise.
          </h2>
          <p className="mt-5 text-lg text-white/70">
            Zeig dein Profil, deine Branchen-Expertise und deine Dienstleistungen — qualifizierte
            Unternehmen finden dich direkt über unser Matching.
          </p>
          <div className="mt-10">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-br from-architect-tertiary to-[#057a62] hover:brightness-110 text-white font-display shadow-[0_10px_40px_rgba(6,158,124,0.3)]"
            >
              <Link href="/registrieren?rolle=berater">
                Als Berater registrieren
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-5 text-sm text-white/50">Transparente 9,99 % Provision · nur bei Bewilligung</p>
        </div>
      </section>
    </div>
  )
}
