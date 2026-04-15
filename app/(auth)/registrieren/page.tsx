'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { register as apiRegister } from '@/lib/api/auth'
import { useAuth } from '@/lib/store/authStore'
import { ApiError } from '@/lib/api/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import type { Nutzer } from '@/lib/types'
import { Suspense } from 'react'

const schema = z.object({
  email: z.string().email('Bitte eine gültige E-Mail eingeben'),
  password: z
    .string()
    .min(8, 'Mindestens 8 Zeichen')
    .regex(/[!@#$%^&*]/, 'Mindestens ein Sonderzeichen (!@#$%^&*)'),
  firstName: z.string().min(1, 'Vorname ist erforderlich'),
  lastName: z.string().min(1, 'Nachname ist erforderlich'),
  company: z.string().optional(),
  datenschutz: z.literal(true, {
    message: 'Bitte Datenschutzerklärung akzeptieren',
  }),
})

type FormData = z.infer<typeof schema>

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  const rolleParam = searchParams.get('rolle') as Nutzer['role'] | null
  const beraterParam = searchParams.get('berater')

  const [rolle, setRolle] = useState<Nutzer['role'] | null>(
    rolleParam === 'berater' || rolleParam === 'unternehmen' ? rolleParam : null
  )
  const [serverFehler, setServerFehler] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  })

  const datenschutzWert = watch('datenschutz')

  if (!rolle) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-white">Registrieren</h1>
          <p className="mt-2 text-sm text-white/60">Wie möchten Sie fund24 nutzen?</p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => setRolle('unternehmen')}
            className="w-full rounded-lg bg-architect-surface-low/40 hover:bg-architect-surface/40 p-4 text-left"
          >
            <p className="font-display font-medium text-white">Als Unternehmen</p>
            <p className="mt-1 text-sm text-white/60">Fördermittel finden und Berater beauftragen</p>
          </button>
          <button
            onClick={() => setRolle('berater')}
            className="w-full rounded-lg bg-architect-surface-low/40 hover:bg-architect-surface/40 p-4 text-left"
          >
            <p className="font-display font-medium text-white">Als Berater</p>
            <p className="mt-1 text-sm text-white/60">Aufträge erhalten und Unternehmen beraten</p>
          </button>
        </div>
        <p className="text-center text-sm text-white/60">
          Bereits registriert?{' '}
          <Link href="/login" className="font-medium text-architect-primary-light hover:text-white">
            Einloggen
          </Link>
        </p>
      </div>
    )
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setServerFehler(null)
    try {
      const res = await apiRegister({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        company: data.company,
        role: rolle,
        privacyAccepted: data.datenschutz,
      })
      if ('requiresVerification' in res) {
        toast.success('Bestätigungscode gesendet. Prüfe dein E-Mail-Postfach.')
        const next = beraterParam ? `&next=/berater/${beraterParam}` : ''
        router.push(`/verifizieren?email=${encodeURIComponent(data.email)}&role=${rolle}${next}`)
      } else {
        login(res.token, res.user)
        toast.success('Konto erstellt. Willkommen bei fund24.')
        if (beraterParam) {
          router.push(`/berater/${beraterParam}`)
        } else {
          router.push('/verifizieren')
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const msg = 'Diese E-Mail ist bereits registriert.'
        setServerFehler(msg)
        toast.error(msg)
      } else {
        const msg = 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.'
        setServerFehler(msg)
        toast.error(msg)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-white">
          Als {rolle === 'berater' ? 'Berater' : 'Unternehmen'} registrieren
        </h1>
        <button
          onClick={() => setRolle(null)}
          className="mt-1 text-sm text-white/60 hover:text-architect-primary-light"
        >
          Rolle ändern
        </button>
      </div>

      {serverFehler && (
        <div className="rounded-md bg-architect-error/20 p-3 text-sm text-architect-error-container">
          {serverFehler}{' '}
          {serverFehler.includes('bereits registriert') && (
            <Link href="/login" className="font-medium underline">
              Einloggen?
            </Link>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">Vorname</Label>
            <Input id="firstName" {...register('firstName')} className="bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40" />
            {errors.firstName && (
              <p className="text-xs text-architect-error-container">{errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Nachname</Label>
            <Input id="lastName" {...register('lastName')} className="bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40" />
            {errors.lastName && (
              <p className="text-xs text-architect-error-container">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">E-Mail</Label>
          <Input id="email" type="email" {...register('email')} className="bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40" />
          {errors.email && (
            <p className="text-xs text-architect-error-container">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Passwort</Label>
          <Input id="password" type="password" {...register('password')} className="bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40" />
          {errors.password && (
            <p className="text-xs text-architect-error-container">{errors.password.message}</p>
          )}
        </div>

        {rolle === 'unternehmen' && (
          <div className="space-y-1.5">
            <Label htmlFor="company">Firma (optional)</Label>
            <Input id="company" {...register('company')} className="bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40" />
          </div>
        )}

        <div className="flex items-start gap-2">
          <Checkbox
            id="datenschutz"
            checked={datenschutzWert === true}
            onCheckedChange={(checked: boolean) =>
              setValue('datenschutz', checked ? true : (false as unknown as true), { shouldValidate: true })
            }
          />
          <Label htmlFor="datenschutz" className="text-sm leading-tight text-white/80">
            Ich akzeptiere die{' '}
            <Link href="/datenschutz" className="text-architect-primary-light hover:text-white" target="_blank">
              Datenschutzerklärung
            </Link>{' '}
            und{' '}
            <Link href="/agb" className="text-architect-primary-light hover:text-white" target="_blank">
              AGB
            </Link>
          </Label>
        </div>
        {errors.datenschutz && (
          <p className="text-xs text-architect-error-container">{errors.datenschutz.message}</p>
        )}

        <Button type="submit" className="w-full bg-architect-primary hover:bg-architect-primary-container text-white" disabled={!isValid || isSubmitting}>
          {isSubmitting ? 'Wird registriert...' : 'Registrieren'}
        </Button>
      </form>

      <p className="text-center text-sm text-white/60">
        Bereits registriert?{' '}
        <Link href="/login" className="font-medium text-architect-primary-light hover:text-white">
          Einloggen
        </Link>
      </p>
    </div>
  )
}

export default function RegistrierenPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
