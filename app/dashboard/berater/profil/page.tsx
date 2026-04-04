'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/lib/store/authStore'
import { getBeraterProfil, updateBeraterProfil } from '@/lib/api/check'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { LadeSpinner } from '@/components/shared/LadeSpinner'
import { FehlerBox } from '@/components/shared/FehlerBox'
import { ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'
import type { BeraterProfil } from '@/lib/types'

const schema = z.object({
  displayName: z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein'),
  bio: z.string().optional(),
  region: z.string().min(2, 'Region erforderlich'),
  branchen: z.string().min(1, 'Mindestens eine Branche erforderlich'),
  spezialisierungen: z.string().min(1, 'Mindestens eine Spezialisierung erforderlich'),
  websiteUrl: z.string().url('Ungültige URL').optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

export default function BeraterProfilPage() {
  const router = useRouter()
  const { nutzer, token, istBerater } = useAuth()
  const [profil, setProfil] = useState<BeraterProfil | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  })

  useEffect(() => {
    if (!istBerater()) {
      router.push('/')
      return
    }

    const fetchProfil = async () => {
      try {
        if (!token || !nutzer?.id) throw new Error('Authentifizierung erforderlich')
        const data = await getBeraterProfil(nutzer.id)
        setProfil(data)
        reset({
          displayName: data.displayName,
          bio: data.bio || '',
          region: data.region,
          branchen: data.branchen.join(', '),
          spezialisierungen: data.spezialisierungen.join(', '),
          websiteUrl: data.websiteUrl || '',
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfil()
  }, [token, nutzer, istBerater, router, reset])

  const onSubmit = async (data: FormData) => {
    try {
      setError(null)
      setSuccessMessage(null)
      setIsSubmitting(true)

      if (!token) throw new Error('Token erforderlich')

      await updateBeraterProfil(
        {
          displayName: data.displayName,
          bio: data.bio || undefined,
          region: data.region,
          branchen: data.branchen
            .split(',')
            .map((b) => b.trim())
            .filter((b) => b.length > 0),
          spezialisierungen: data.spezialisierungen
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
          websiteUrl: data.websiteUrl || undefined,
        },
        token
      )

      setSuccessMessage('Profil erfolgreich aktualisiert!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <LadeSpinner text="Profil wird geladen..." />
  }

  if (error && !profil) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 sm:px-8">
        <FehlerBox fehler={error} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 sm:px-8 space-y-8">
      {/* Header */}
      <div>
        <Link href="/dashboard/berater" className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Mein Profil bearbeiten
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Aktualisieren Sie Ihre Profilinformationen und Spezialisierungen
        </p>
      </div>

      {/* Error */}
      {error && <FehlerBox fehler={error} onNeuLaden={() => setError(null)} />}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
          <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-900 dark:text-green-100">{successMessage}</p>
        </div>
      )}

      {/* Form Card */}
      <Card className="bg-white dark:bg-gray-800">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8 space-y-6">
          {/* Display Name */}
          <div>
            <Label htmlFor="displayName" className="text-sm font-semibold">
              Anzeigename *
            </Label>
            <Input
              id="displayName"
              placeholder="Ihr Name für Profile"
              {...register('displayName')}
              className="mt-2 h-10"
            />
            {errors.displayName && (
              <p className="text-sm text-destructive mt-1">{errors.displayName.message}</p>
            )}
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio" className="text-sm font-semibold">
              Biografie
            </Label>
            <Textarea
              id="bio"
              placeholder="Beschreiben Sie Ihre Expertise und Erfahrung..."
              {...register('bio')}
              rows={4}
              className="mt-2"
            />
            {errors.bio && (
              <p className="text-sm text-destructive mt-1">{errors.bio.message}</p>
            )}
          </div>

          {/* Region */}
          <div>
            <Label htmlFor="region" className="text-sm font-semibold">
              Region / Bundesland *
            </Label>
            <Input
              id="region"
              placeholder="z.B. Bayern, Bundesweit"
              {...register('region')}
              className="mt-2 h-10"
            />
            {errors.region && (
              <p className="text-sm text-destructive mt-1">{errors.region.message}</p>
            )}
          </div>

          {/* Branchen */}
          <div>
            <Label htmlFor="branchen" className="text-sm font-semibold">
              Branchen *
            </Label>
            <Textarea
              id="branchen"
              placeholder="Komma-getrennt, z.B. IT, Handwerk, Handel"
              {...register('branchen')}
              rows={2}
              className="mt-2"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Geben Sie mehrere Branchen ein, getrennt durch Kommas
            </p>
            {errors.branchen && (
              <p className="text-sm text-destructive mt-1">{errors.branchen.message}</p>
            )}
          </div>

          {/* Spezialisierungen */}
          <div>
            <Label htmlFor="spezialisierungen" className="text-sm font-semibold">
              Spezialisierungen *
            </Label>
            <Textarea
              id="spezialisierungen"
              placeholder="Komma-getrennt, z.B. Mittelstandsförderung, Digitalisierung"
              {...register('spezialisierungen')}
              rows={2}
              className="mt-2"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Geben Sie mehrere Spezialisierungen ein, getrennt durch Kommas
            </p>
            {errors.spezialisierungen && (
              <p className="text-sm text-destructive mt-1">{errors.spezialisierungen.message}</p>
            )}
          </div>

          {/* Website URL */}
          <div>
            <Label htmlFor="websiteUrl" className="text-sm font-semibold">
              Website
            </Label>
            <Input
              id="websiteUrl"
              type="url"
              placeholder="https://example.com"
              {...register('websiteUrl')}
              className="mt-2 h-10"
            />
            {errors.websiteUrl && (
              <p className="text-sm text-destructive mt-1">{errors.websiteUrl.message}</p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-900 dark:text-blue-100">
            <p>
              Diese Informationen werden in Ihrem öffentlichen Profil angezeigt. Dies hilft Unternehmen, Sie als passenden Berater zu finden.
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            disabled={!isValid || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Wird gespeichert...' : 'Änderungen speichern'}
          </Button>
        </form>
      </Card>

      {/* Stats Preview */}
      {profil && (
        <Card className="bg-gray-50 dark:bg-gray-900/50 border">
          <div className="p-6 sm:p-8 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Profilstatistiken
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Rating
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profil.ratingAvg.toFixed(1)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  ({profil.ratingCount} Bewertungen)
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Verfügbar
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profil.verfuegbar ? 'Ja' : 'Nein'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Erfolgsquote
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(profil.erfolgsquote ?? 0).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
