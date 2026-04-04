'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { forgotPassword } from '@/lib/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  email: z.string().email('Bitte eine gültige E-Mail eingeben'),
})

type FormData = z.infer<typeof schema>

export default function PasswortVergessenPage() {
  const [gesendet, setGesendet] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      await forgotPassword(data.email)
    } catch {
      // Intentionally ignore — always show same message
    } finally {
      setIsSubmitting(false)
      setGesendet(true)
    }
  }

  if (gesendet) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-bold">Link gesendet</h1>
        <p className="text-sm text-muted-foreground">
          Falls eine E-Mail mit dieser Adresse existiert, haben wir einen Link zum
          Zurücksetzen gesendet. Bitte prüfen Sie auch Ihren Spam-Ordner.
        </p>
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          Zurück zum Login
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Passwort vergessen</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Geben Sie Ihre E-Mail ein und wir senden Ihnen einen Link zum Zurücksetzen.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-Mail</Label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Wird gesendet...' : 'Link senden'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Zurück zum Login
        </Link>
      </p>
    </div>
  )
}
