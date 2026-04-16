'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usePreCheck } from '@/lib/store/preCheckStore'
import { fordereBerichtAn } from '@/lib/api/precheck'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { FehlerBox } from '@/components/shared/FehlerBox'
import { LadeSpinner } from '@/components/shared/LadeSpinner'
import Link from 'next/link'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

const schema = z.object({
  email: z.string().email('Bitte geben Sie eine gültige E-Mail ein'),
  datenschutz: z.literal(true, {
    errorMap: () => ({ message: 'Bitte akzeptieren Sie die Datenschutzerklärung' }),
  }),
  marketing: z.boolean().optional().default(false),
})

type FormData = z.infer<typeof schema>

export default function BerichtPage() {
  const router = useRouter()
  const store = usePreCheck()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  })

  // Redirect guard — must run as effect, not during render.
  const shouldRedirect = !store.sessionId || store.phase !== 'email_formular'
  useEffect(() => {
    if (shouldRedirect) router.push('/foerder-schnellcheck')
  }, [shouldRedirect, router])
  if (shouldRedirect) return null

  const onSubmit = async (data: FormData) => {
    try {
      setError(null)
      setIsSubmitting(true)

      if (!store.sessionId) {
        setError('Sitzung ungültig')
        setIsSubmitting(false)
        return
      }

      await fordereBerichtAn(store.sessionId, data.email, data.datenschutz)
      setSuccess(true)

      // Reset store after 3 seconds
      setTimeout(() => {
        store.reset()
        router.push('/')
      }, 3000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Senden'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <CheckCircle2 className="h-16 w-16 text-architect-tertiary-light mx-auto" />
          <h1 className="font-display text-3xl font-bold text-white">
            Erfolgreich angefordert!
          </h1>
          <p className="text-white/70 max-w-md mx-auto">
            Ihr detaillierter Fördermittel-Report wird in Kürze an Ihre E-Mail versendet.
          </p>

          <div className="bg-architect-primary/20 rounded-lg p-4 text-sm text-architect-primary-light mt-6">
            <p>Bitte überprüfen Sie Ihren Spam-Ordner, falls die E-Mail nicht ankommt.</p>
          </div>

          <p className="text-xs text-white/50 pt-4">
            Sie werden in Kürze zur Startseite weitergeleitet...
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="font-display text-3xl font-bold text-white">
          Erhalten Sie Ihren detaillierten Report
        </h1>
        <p className="text-white/70">
          Geben Sie Ihre E-Mail ein, um einen PDF-Report mit allen Details zu erhalten
        </p>
      </div>

      {/* Error */}
      {error && <FehlerBox fehler={error} />}

      {/* Form Card */}
      {!isSubmitting ? (
        <Card className="bg-architect-surface/60 border-0">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8 space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-white/80">
                E-Mail-Adresse
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="ihre@email.de"
                {...register('email')}
                className="h-12 bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40"
              />
              {errors.email && (
                <p className="text-sm text-architect-error-container">{errors.email.message}</p>
              )}
            </div>

            {/* Datenschutz — Pflicht */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="datenschutz"
                  {...register('datenschutz')}
                  className="mt-1"
                />
                <Label htmlFor="datenschutz" className="text-sm cursor-pointer leading-relaxed text-white/80">
                  Ich akzeptiere die{' '}
                  <Link href="/datenschutz" target="_blank" className="text-architect-primary-light underline hover:text-white">
                    Datenschutzerklärung
                  </Link>
                </Label>
              </div>
              {errors.datenschutz && (
                <p className="text-sm text-architect-error-container">{errors.datenschutz.message}</p>
              )}
            </div>

            {/* Newsletter — Optional */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="marketing"
                  {...register('marketing')}
                  className="mt-1"
                />
                <Label htmlFor="marketing" className="text-sm cursor-pointer leading-relaxed text-white/80">
                  Ich möchte den fund24 Newsletter mit neuen Förderprogrammen erhalten (optional)
                </Label>
              </div>
            </div>

            {/* Legal Note */}
            <div className="bg-architect-surface-low/40 rounded-lg p-4 text-xs text-white/60 space-y-2">
              <p>
                Mit der Anmeldung erklären Sie sich mit unserer Datenschutzerklärung einverstanden. Wir verwenden Ihre Daten nur zur Zusendung des Reports und zum Versand von Newslettern.
              </p>
              <p>
                Sie können sich jederzeit abmelden.
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              disabled={!isValid}
              className="w-full bg-architect-primary hover:bg-architect-primary-container text-white"
            >
              Report anfordern
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </Card>
      ) : (
        <LadeSpinner text="Ihr Report wird vorbereitet..." />
      )}
    </div>
  )
}
