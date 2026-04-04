'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/store/authStore'
import { getAdminDashboard } from '@/lib/api/check'
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
        const data = await getAdminDashboard(token)
        setDashboard(data)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Fehler beim Laden'
        setError(msg)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
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
      color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Checks heute',
      value: dashboard.checksHeute,
      icon: TrendingUp,
      color: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    },
    {
      label: 'Offene Anfragen',
      value: dashboard.offeneAnfragen,
      icon: Clock,
      color: 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Pending Provisionen',
      value: dashboard.pendingProvisionen,
      icon: DollarSign,
      color: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    },
  ]

  const quickLinks = [
    { label: 'Nutzer verwalten', href: '/admin/users', description: 'Rollen und Zugang' },
    { label: 'Aktuelles', href: '/admin/aktuelles', description: 'News-Artikel verwalten' },
    { label: 'Provisionen', href: '/admin/provisionen', description: 'Berater-Provisionen' },
  ]

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          Admin Dashboard
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Übersicht und Verwaltung der fund24-Plattform
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6 space-y-2">
                <div className={`inline-flex rounded-lg p-2 ${kpi.color} w-fit`}>
                  <Icon className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {kpi.label}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {kpi.value.toLocaleString('de-DE')}
                </p>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Quick Links */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Schnellzugriff
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <div className="p-6 space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {link.label}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {link.description}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="mt-2 w-full justify-start"
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
  )
}
