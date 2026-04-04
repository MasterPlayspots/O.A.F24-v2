'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../store/authStore'
import { useMount } from './useMount'

export function useVerifiedGuard(): { loading: boolean } {
  const mounted = useMount()
  const router = useRouter()
  const { nutzer, token } = useAuth()

  useEffect(() => {
    if (!mounted) return
    if (!nutzer || !token) {
      router.push('/login')
      return
    }
    if (!nutzer.emailVerified) {
      router.push('/verifizieren')
    }
  }, [mounted, nutzer, token, router])

  return { loading: !mounted || !nutzer || !token || !nutzer.emailVerified }
}
