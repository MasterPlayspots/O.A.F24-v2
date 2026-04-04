import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Förder-Schnellcheck | fund24',
  description: 'Kostenloser AI-gestützter Fördercheck für Ihr Unternehmen — schnell und einfach.',
}

export default function FoerderSchnellcheckLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary/5 to-transparent">
      {/* Minimal Header */}
      <div className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-6 py-4 sm:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-sm font-semibold text-primary hover:underline">
              <ArrowLeft className="inline h-4 w-4 mr-1" />
              Zurück
            </Link>
            <h2 className="text-lg font-bold text-gray-900">fund24</h2>
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
      <div className="bg-gray-50 dark:bg-gray-900/50 border-t px-6 py-6 sm:px-8 text-center text-xs text-gray-500 dark:text-gray-400">
        <p>Diese Sitzung ist vorübergehend gespeichert. Bitte aktivieren Sie Cookies für eine nahtlose Erfahrung.</p>
      </div>
    </div>
  )
}
