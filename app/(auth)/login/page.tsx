'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { login as apiLogin } from '@/lib/api/auth'
import { useAuth } from '@/lib/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  email: z.string().email('Bitte eine gültige E-Mail eingeben'),
  password: z.string().min(1, 'Passwort eingeben'),
})

type FormData = z.infer<typeof schema>

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [fehler, setFehler] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirect = searchParams.get('redirect')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setFehler(null)
    try {
      const res = await apiLogin(data.email, data.password)
      login(res.token, res.user)
      if (redirect) {
        router.push(redirect)
      } else if (res.user.role === 'admin') {
        router.push('/admin')
      } else if (res.user.role === 'berater') {
        router.push('/dashboard/berater')
      } else {
        router.push('/dashboard/unternehmen')
      }
    } catch {
      setFehler('E-Mail oder Passwort falsch.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-white">Anmelden</h1>
        <p className="mt-2 text-sm text-white/60">Melden Sie sich in Ihrem fund24-Konto an</p>
      </div>

      {fehler && (
        <div className="rounded-md bg-architect-error/20 p-3 text-sm text-architect-error-container">
          {fehler}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-Mail</Label>
          <Input id="email" type="email" {...register('email')} className="bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40" />
          {errors.email && <p className="text-xs text-architect-error-container">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Passwort</Label>
            <Link href="/passwort-vergessen" className="text-xs text-architect-primary-light hover:text-white">
              Passwort vergessen?
            </Link>
          </div>
          <Input id="password" type="password" {...register('password')} className="bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40" />
          {errors.password && <p className="text-xs text-architect-error-container">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full bg-architect-primary hover:bg-architect-primary-container text-white" disabled={isSubmitting}>
          {isSubmitting ? 'Wird angemeldet...' : 'Anmelden'}
        </Button>
      </form>

      <p className="text-center text-sm text-white/60">
        Noch kein Konto?{' '}
        <Link href="/registrieren" className="font-medium text-architect-primary-light hover:text-white">
          Registrieren
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
