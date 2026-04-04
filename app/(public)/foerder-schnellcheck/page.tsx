'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usePreCheck } from '@/lib/store/preCheckStore'
import { analysiereWebsite } from '@/lib/api/precheck'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LadeSpinner } from '@/components/shared/LadeSpinner'
import { FehlerBox } from '@/components/shared/FehlerBox'
import { ArrowRight } from 'lucide-react'

const schema = z.object({
  url: z.string().url('Bitte geben Sie eine gültige URL ein (z.B. https://example.com)'),
})

type FormData = z.infer<typeof schema>

export default function FoerderSchnellcheckPage() {
  const router = useRouter()
  const store = usePreCheck()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      setError(null)
      setIsLoading(true)

      const result = await analysiereWebsite(data.url)
      store.setSession(result.sessionId, result.profil)
      store.setPhase('analyse_laeuft')
      router.push('/foerder-schnellcheck/analyse')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analyse fehlgeschlagen'
      setError(msg)
      store.setFehler(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
          Förder-Schnellcheck
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Finden Sie passende Förderprogramme in weniger als 5 Minuten — kostenlos und unverbindlich.
        </p>
      </div>

      {/* Error */}
      {error && (
        <FehlerBox
          fehler={error}
          onNeuLaden={() => {
            setError(null)
            reset()
          }}
        />
      )}

      {/* Form */}
      {!isLoading ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8">
          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Website Ihres Unternehmens
            </label>
            <Input
              id="url"
              placeholder="https://www.example.com"
              type="url"
              disabled={isLoading}
              {...register('url')}
              className="h-12"
            />
            {errors.url && (
              <p className="text-sm text-destructive">{errors.url.message}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Wir nutzen Ihre Website, um Ihr Unternehmen zu analysieren. Alle Daten sind sicher.
            </p>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
            className="w-full"
          >
            Analyse starten
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      ) : (
        <LadeSpinner text="Analysiere Ihre Website..." />
      )}

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">Was passiert nächster?</h3>
        <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li>1. Wir analysieren Ihre Website und erstellen ein Profil</li>
          <li>2. Sie beantworten einige Fragen zu Ihrem Vorhaben</li>
          <li>3. KI matched Sie mit den passendsten Programmen</li>
          <li>4. Sie erhalten einen detaillierten Report per E-Mail</li>
        </ol>
      </div>
    </div>
  )
}
