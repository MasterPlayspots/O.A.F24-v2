'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/store/authStore'
import { getAdminDashboard, listPendingCerts, approveCert, rejectCert, type CertPending } from '@/lib/api/fund24'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LadeSpinner } from '@/components/shared/LadeSpinner'
import { FehlerBox } from '@/components/shared/FehlerBox'
import { Users, TrendingUp, Clock, DollarSign, ArrowRight } from 'lucide-react'
import type { AdminDashboard } from '@/lib/types'

export default function AdminPage() {
  const router = useRouter()
  const { token, istAdmin } = useAuth()
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingCerts, setPendingCerts] = useState<CertPending[]>([])
  const [certBusy, setCertBusy] = useState<string | null>(null)

  const loadCerts = async () => {
    try {
      const data = await listPendingCerts()
      setPendingCerts(data || [])
    } catch {
      /* silent */
    }
  }

  const handleApprove = async (id: string) => {
    setCertBusy(id)
    try { await approveCert(id); await loadCerts() } finally { setCertBusy(null) }
  }
  const handleReject = async (id: string) => {
    setCertBusy(id)
    try { await rejectCert(id); await loadCerts() } finally { setCertBusy(null) }
  }

  useEffect(() => {
    // Guard: nur Admin
    if (!istAdmin()) {
      router.push('/')
      return
    }

    const fetchDashboard = async () => {
      try {
        if (!token) {
          throw new Error('Kein Token vorhanden')
        }
        const data = await getAdminDashboard()
        setDashboard(data)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Fehler beim Laden'
        setError(msg)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
    loadCerts()
  }, [token, istAdmin, router])

  if (isLoading) {
    return <LadeSpinner text="Dashboard wird geladen..." />
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8">
        <FehlerBox fehler={error} />
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8">
        <FehlerBox fehler="Keine Daten verfügbar" />
      </div>
    )
  }

  const kpis = [
    {
      label: 'Aktive Nutzer',
      value: dashboard.userAnzahl,
      icon: Users,
      color: 'bg-architect-primary/20 text-architect-primary-light',
    },
    {
      label: 'Checks heute',
      value: dashboard.checksHeute,
      icon: TrendingUp,
      color: 'bg-architect-tertiary/25 text-architect-tertiary-light',
    },
    {
      label: 'Offene Anfragen',
      value: dashboard.offeneAnfragen,
      icon: Clock,
      color: 'bg-architect-primary/20 text-architect-primary-light',
    },
    {
      label: 'Pending Provisionen',
      value: dashboard.pendingProvisionen,
      icon: DollarSign,
      color: 'bg-architect-primary/30 text-white',
    },
  ]

  const quickLinks = [
    { label: 'Nutzer verwalten', href: '/admin/users', description: 'Rollen und Zugang' },
    { label: 'Aktuelles', href: '/admin/aktuelles', description: 'News-Artikel verwalten' },
    { label: 'Provisionen', href: '/admin/provisionen', description: 'Berater-Provisionen' },
    { label: 'Audit Logs', href: '/admin/audit-logs', description: 'Compliance & Forensik' },
    { label: 'Email Outbox', href: '/admin/email-outbox', description: 'Gesendete E-Mails + Retry' },
  ]

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white">
    <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-white">
          Admin Dashboard
        </h1>
        <p className="mt-2 text-white/60">
          Übersicht und Verwaltung der fund24-Plattform
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label} className="overflow-hidden bg-architect-surface/60 border-0 text-white hover:bg-architect-surface/70 transition">
              <div className="p-6 space-y-2">
                <div className={`inline-flex rounded-lg p-2 ${kpi.color} w-fit`}>
                  <Icon className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-white/60">
                  {kpi.label}
                </p>
                <p className="font-display text-3xl font-bold text-white">
                  {kpi.value.toLocaleString('de-DE')}
                </p>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Pending BAFA-Zertifizierungen */}
      <div className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-white">
          Offene BAFA-Zertifizierungen ({pendingCerts.length})
        </h2>
        {pendingCerts.length === 0 ? (
          <Card className="p-6 text-sm bg-architect-surface/60 border-0 text-white/60">Keine offenen Anträge.</Card>
        ) : (
          <div className="space-y-3">
            {pendingCerts.map((c) => (
              <Card key={c.id} className="p-4 bg-architect-surface/60 border-0 text-white flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">{c.email}</p>
                  <p className="text-xs text-white/50">User-ID: {c.id}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(c.id)} disabled={certBusy === c.id} className="bg-architect-primary hover:bg-architect-primary-container text-white">
                    Freigeben
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReject(c.id)} disabled={certBusy === c.id} className="bg-architect-surface-low/40 border-0 text-white hover:bg-architect-surface-low/60 hover:text-white">
                    Ablehnen
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-white">
          Schnellzugriff
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="h-full bg-architect-surface/60 border-0 text-white hover:bg-architect-surface/70 transition cursor-pointer">
                <div className="p-6 space-y-3">
                  <h3 className="font-display font-semibold text-white">
                    {link.label}
                  </h3>
                  <p className="text-sm text-white/60">
                    {link.description}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="mt-2 w-full justify-start text-architect-primary-light hover:text-white hover:bg-architect-surface/40"
                  >
                    <span>
                      Öffnen
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </span>
                  </Button>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
    </div>
  )
}
