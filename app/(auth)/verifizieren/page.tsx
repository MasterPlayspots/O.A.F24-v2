'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { verifyEmail, resendVerification } from '@/lib/api/auth'
import { useAuth } from '@/lib/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function VerifizierenPage() {
  const router = useRouter()
  const { nutzer, token, login } = useAuth()
  const [code, setCode] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [resendMsg, setResendMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!nutzer || !token) {
      router.push('/login')
    }
  }, [nutzer, token, router])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !nutzer) return
    setIsSubmitting(true)
    setFehler(null)
    try {
      await verifyEmail(code, token)
      login(token, { ...nutzer, emailVerified: true })
      if (nutzer.role === 'berater') {
        router.push('/onboarding/profil')
      } else {
        router.push('/dashboard/unternehmen')
      }
    } catch {
      setFehler('Ungültiger Code. Bitte erneut versuchen.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (!token || cooldown > 0) return
    try {
      await resendVerification(token)
      setCooldown(60)
      setResendMsg('Code wurde erneut gesendet.')
    } catch {
      setResendMsg('Fehler beim erneuten Senden.')
    }
  }

  if (!nutzer) return null

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-white">E-Mail verifizieren</h1>
        <p className="mt-2 text-sm text-white/60">
          Code wurde an <strong>{nutzer.email}</strong> gesendet
        </p>
      </div>

      {fehler && (
        <div className="rounded-md bg-architect-error/20 p-3 text-sm text-architect-error-container">{fehler}</div>
      )}

      {resendMsg && (
        <div className="rounded-md bg-architect-surface-low/40 p-3 text-sm text-white/80">{resendMsg}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="code">6-stelliger Code</Label>
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            pattern="[0-9]*"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="text-center text-2xl tracking-[0.5em] bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40"
            placeholder="000000"
          />
        </div>

        <Button type="submit" className="w-full bg-architect-primary hover:bg-architect-primary-container text-white" disabled={code.length !== 6 || isSubmitting}>
          {isSubmitting ? 'Wird überprüft...' : 'Verifizieren'}
        </Button>
      </form>

      <div className="text-center">
        <button
          onClick={handleResend}
          disabled={cooldown > 0}
          className="text-sm text-architect-primary-light hover:underline disabled:text-white/60 disabled:no-underline"
        >
          {cooldown > 0 ? `Code erneut senden (${cooldown}s)` : 'Code erneut senden'}
        </button>
        <p className="mt-2 text-xs text-white/60">
          Bitte prüfen Sie auch Ihren Spam-Ordner.
        </p>
      </div>
    </div>
  )
}
