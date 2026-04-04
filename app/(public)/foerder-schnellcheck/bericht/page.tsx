'use client'

import { useState } from 'react'
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
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

const schema = z.object({
  email: z.string().email('Bitte geben Sie eine gültige E-Mail ein'),
  dsgvo: z.boolean().refine((v) => v === true, {
    message: 'Bitte akzeptieren Sie die DSGVO',
  }),
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

  // Redirect guard
  if (!store.sessionId || store.phase !== 'email_formular') {
    router.push('/foerder-schnellcheck')
    return null
  }

  const onSubmit = async (data: FormData) => {
    try {
      setError(null)
      setIsSubmitting(true)

      if (!store.sessionId) {
        setError('Sitzung ungültig')
        setIsSubmitting(false)
        return
      }

      await fordereBerichtAn(store.sessionId, data.email, data.dsgvo)
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
          <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400 mx-auto" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Erfolgreich angefordert!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Ihr detaillierter Fördermittel-Report wird in Kürze an Ihre E-Mail versendet.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-900 dark:text-blue-100 mt-6">
            <p>Bitte überprüfen Sie Ihren Spam-Ordner, falls die E-Mail nicht ankommt.</p>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 pt-4">
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Erhalten Sie Ihren detaillierten Report
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Geben Sie Ihre E-Mail ein, um einen PDF-Report mit allen Details zu erhalten
        </p>
      </div>

      {/* Error */}
      {error && <FehlerBox fehler={error} />}

      {/* Form Card */}
      {!isSubmitting ? (
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8 space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">
                E-Mail-Adresse
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="ihre@email.de"
                {...register('email')}
                className="h-12"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* DSGVO Checkbox */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="dsgvo"
                  {...register('dsgvo')}
                  className="mt-1"
                />
                <Label htmlFor="dsgvo" className="text-sm cursor-pointer leading-relaxed">
                  Ich akzeptiere die Datenschutzerklärung und möchte E-Mails von fund24 erhalten
                </Label>
              </div>
              {errors.dsgvo && (
                <p className="text-sm text-destructive">{errors.dsgvo.message}</p>
              )}
            </div>

            {/* Legal Note */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-xs text-gray-600 dark:text-gray-400 space-y-2">
              <p>
                Mit der Anmeldung erklären Sie sich mit unserer Datenschutzerklärung einverstanden. Wir verwenden Ihre Daten nur zur Zusendung des Reports und zum Versand von Newsletters.
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
              className="w-full"
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
