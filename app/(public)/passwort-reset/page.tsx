'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import * as Sentry from '@sentry/nextjs'
import { resetPassword } from '@/lib/api/auth'

const passwordSchema = z.object({
  password: z.string()
    .min(8, 'Passwort muss mindestens 8 Zeichen lang sein')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Passwort muss mindestens ein Sonderzeichen enthalten'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwörter stimmen nicht überein",
  path: ["confirmPassword"],
})

type PasswordFormData = z.infer<typeof passwordSchema>

function PasswordResetContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset: resetForm,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  if (!token) {
    return (
      <div className="min-h-screen bg-architect-surface font-body text-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-architect-surface/60 rounded-lg p-8">
          <div className="text-center mb-8">
            <svg className="h-12 w-12 text-architect-error-container mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="font-display text-2xl font-bold text-white">Ungültiger Link</h1>
          </div>

          <p className="text-white/70 text-center mb-8">
            Der Passwort-Reset-Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Link an.
          </p>

          <div className="space-y-4">
            <Link href="/passwort-vergessen" className="block w-full text-center bg-architect-primary hover:bg-architect-primary-container text-white py-2 rounded-lg font-semibold transition-colors">
              Neuen Link anfordern
            </Link>
            <Link href="/login" className="block w-full text-center text-architect-primary-light hover:text-white font-semibold">
              Zurück zur Anmeldung
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const onSubmit = async (data: PasswordFormData) => {
    try {
      setIsSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')

      await resetPassword(token, data.password)

      setSuccessMessage('Passwort erfolgreich geändert!')
      resetForm()
    } catch (error) {
      Sentry.captureException(error, { tags: { area: 'auth', op: 'password-reset' } })
      if (error instanceof Error) {
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          setErrorMessage('Link abgelaufen oder bereits verwendet. Bitte fordern Sie einen neuen Link an.')
        } else {
          setErrorMessage(error.message || 'Fehler beim Zurücksetzen des Passworts')
        }
      } else {
        setErrorMessage('Link abgelaufen oder bereits verwendet.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (successMessage) {
    return (
      <div className="min-h-screen bg-architect-surface font-body text-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-architect-surface/60 rounded-lg p-8">
          <div className="text-center mb-8">
            <svg className="h-12 w-12 text-architect-tertiary-light mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h1 className="font-display text-2xl font-bold text-white">{successMessage}</h1>
          </div>

          <p className="text-white/70 text-center mb-8">
            Sie können sich jetzt mit Ihrem neuen Passwort anmelden.
          </p>

          <Link href="/login" className="block w-full text-center bg-architect-primary hover:bg-architect-primary-container text-white py-2 rounded-lg font-semibold transition-colors">
            Zur Anmeldung
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-architect-surface/60 rounded-lg p-8">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-white">Passwort zurücksetzen</h1>
          <p className="text-white/70 mt-2">Geben Sie Ihr neues Passwort ein</p>
        </div>

        {errorMessage && (
          <div className="mb-6 bg-architect-error/20 rounded-lg p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-architect-error-container mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-architect-error-container font-semibold">Fehler</p>
                <p className="text-architect-error-container/80 text-sm mt-1">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-white/80 mb-2">
              Neues Passwort
            </label>
            <input
              type="password"
              id="password"
              {...register('password')}
              placeholder="Mindestens 8 Zeichen mit Sonderzeichen"
              className="w-full px-4 py-2 bg-architect-surface-low/40 border-0 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-architect-primary-light transition-colors"
            />
            {errors.password && (
              <p className="text-architect-error-container text-sm mt-1">{errors.password.message}</p>
            )}
            <p className="text-white/60 text-xs mt-2">
              Mindestens 8 Zeichen und ein Sonderzeichen erforderlich (!@#$%^&* etc.)
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-white/80 mb-2">
              Passwort bestätigen
            </label>
            <input
              type="password"
              id="confirmPassword"
              {...register('confirmPassword')}
              placeholder="Passwort wiederholen"
              className="w-full px-4 py-2 bg-architect-surface-low/40 border-0 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-architect-primary-light transition-colors"
            />
            {errors.confirmPassword && (
              <p className="text-architect-error-container text-sm mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-architect-primary hover:bg-architect-primary-container text-white py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Wird verarbeitet...' : 'Passwort aktualisieren'}
          </button>
        </form>

        <div className="mt-6 pt-6 space-y-4">
          <p className="text-center text-white/60 text-sm">
            Passwort-Link nicht erhalten?
          </p>
          <Link href="/passwort-vergessen" className="block text-center text-architect-primary-light hover:text-white font-semibold">
            Passwort erneut anfordern
          </Link>
          <Link href="/login" className="block text-center text-white/60 hover:text-white">
            Zurück zur Anmeldung
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PasswordResetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-architect-surface font-body text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60">Laden...</p>
        </div>
      </div>
    }>
      <PasswordResetContent />
    </Suspense>
  )
}
