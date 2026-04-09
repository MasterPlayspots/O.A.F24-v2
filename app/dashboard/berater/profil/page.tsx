'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/lib/store/authStore'
import { getBeraterProfil, updateBeraterProfil } from '@/lib/api/berater'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { LadeSpinner } from '@/components/shared/LadeSpinner'
import { FehlerBox } from '@/components/shared/FehlerBox'
import { ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'
import type { BeraterProfil } from '@/lib/api/berater'

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
        const data = await getBeraterProfil()
        if (!data) {
          // Berater hat noch kein Profil → ins Onboarding leiten
          router.push('/onboarding/profil')
          return
        }
        setProfil(data)
        reset({
          displayName: data.display_name,
          bio: data.bio || '',
          region: data.region || '',
          branchen: (data.branchen ?? []).join(', '),
          spezialisierungen: (data.spezialisierungen ?? []).join(', '),
          websiteUrl: data.website || '',
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

      await updateBeraterProfil({
        displayName: data.displayName,
        bio: data.bio || undefined,
        region: data.region,
        branchen: data.branchen
          .split(',')
          .map((b) => b.trim())
          .filter((b) => b.length > 0),
        verfuegbar: true,
      })

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
    <div className="min-h-screen bg-architect-surface font-body text-white">
    <div className="mx-auto max-w-2xl px-6 py-12 sm:px-8 space-y-8">
      {/* Header */}
      <div>
        <Link href="/dashboard/berater" className="inline-flex items-center text-sm text-white/60 hover:text-white mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Link>
        <h1 className="font-display text-4xl font-bold text-white">
          Mein Profil bearbeiten
        </h1>
        <p className="mt-2 text-white/60">
          Aktualisieren Sie Ihre Profilinformationen und Spezialisierungen
        </p>
      </div>

      {/* Error */}
      {error && <FehlerBox fehler={error} onNeuLaden={() => setError(null)} />}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-architect-tertiary/25 rounded-lg p-4 flex items-center gap-3">
          <Check className="h-5 w-5 text-architect-tertiary-light flex-shrink-0" />
          <p className="text-sm text-architect-tertiary-light">{successMessage}</p>
        </div>
      )}

      {/* Form Card */}
      <Card className="bg-architect-surface/60 border-0 text-white">
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
            <p className="text-xs text-white/50 mt-1">
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
            <p className="text-xs text-white/50 mt-1">
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
          <div className="bg-architect-primary/20 rounded-lg p-4 text-sm text-architect-primary-light">
            <p>
              Diese Informationen werden in Ihrem öffentlichen Profil angezeigt. Dies hilft Unternehmen, Sie als passenden Berater zu finden.
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            disabled={!isValid || isSubmitting}
            className="w-full bg-architect-primary hover:bg-architect-primary-container text-white"
          >
            {isSubmitting ? 'Wird gespeichert...' : 'Änderungen speichern'}
          </Button>
        </form>
      </Card>

      {/* Stats Preview */}
      {profil && (
        <Card className="bg-architect-surface-low/40 border-0 text-white">
          <div className="p-6 sm:p-8 space-y-4">
            <h3 className="font-display font-semibold text-white">
              Profilstatistiken
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-semibold text-white/60 uppercase">
                  Rating
                </p>
                <p className="font-display text-2xl font-bold text-white">
                  {profil.rating_avg.toFixed(1)}
                </p>
                <p className="text-xs text-white/60">
                  ({profil.rating_count} Bewertungen)
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-white/60 uppercase">
                  Verfügbar
                </p>
                <p className="font-display text-2xl font-bold text-white">
                  {profil.verfuegbar ? 'Ja' : 'Nein'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-white/60 uppercase">
                  Profil-Views
                </p>
                <p className="font-display text-2xl font-bold text-white">
                  {profil.profil_views}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
    </div>
  )
}
