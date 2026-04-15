import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Fördercheck | fund24',
  description: 'Kostenloser AI-gestützter Fördercheck für Ihr Unternehmen — schnell und einfach.',
}

export default function FoerderSchnellcheckLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-architect-surface font-body text-white">
      {/* Minimal Header */}
      <div className="bg-architect-surface-low/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-6 py-4 sm:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-sm font-semibold text-architect-primary-light hover:text-white">
              <ArrowLeft className="inline h-4 w-4 mr-1" />
              Zurück
            </Link>
            <h2 className="font-display text-lg font-bold text-white">fund24</h2>
            <div className="w-16" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-8 sm:px-8 sm:py-12">
        <div className="w-full max-w-2xl">
          {children}
        </div>
      </main>

      {/* Session Hint */}
      <div className="bg-architect-surface-low/40 px-6 py-6 sm:px-8 text-center text-xs text-white/60">
        <p>Diese Sitzung ist vorübergehend gespeichert. Bitte aktivieren Sie Cookies für eine nahtlose Erfahrung.</p>
      </div>
    </div>
  )
}
