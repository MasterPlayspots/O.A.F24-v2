'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/store/authStore'
import { getAdminProvisionen, updateAdminProvision } from '@/lib/api/check'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LadeSpinner } from '@/components/shared/LadeSpinner'
import { FehlerBox } from '@/components/shared/FehlerBox'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Provision, ProvisionStatus } from '@/lib/types'

const STATUS_COLORS: Record<ProvisionStatus, string> = {
  ausstehend: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
  dokumente_eingereicht: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  geprueft: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
  abgerechnet: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
  storniert: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
}

export default function AdminProvisionenPage() {
  const router = useRouter()
  const { token, istAdmin } = useAuth()
  const [provisionen, setProvisionen] = useState<Provision[]>([])
  const [statusFilter, setStatusFilter] = useState<ProvisionStatus | ''>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBetrag, setEditBetrag] = useState<string>('')

  useEffect(() => {
    if (!istAdmin()) {
      router.push('/')
      return
    }

    const fetchProvisionen = async () => {
      try {
        if (!token) throw new Error('Kein Token')
        const data = await getAdminProvisionen(token)
        setProvisionen(data.provisionen)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProvisionen()
  }, [token, istAdmin, router])

  const filteredProvisionen = useMemo(() => {
    if (!statusFilter) return provisionen
    return provisionen.filter((p) => p.status === statusFilter)
  }, [provisionen, statusFilter])

  const handleStatusChange = async (
    id: string,
    newStatus: ProvisionStatus
  ) => {
    try {
      setUpdatingId(id)
      if (!token) throw new Error('Kein Token')
      await updateAdminProvision(id, { status: newStatus }, token)
      setProvisionen(
        provisionen.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Update')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleBetragChange = async (id: string) => {
    try {
      const betrag = parseFloat(editBetrag)
      if (isNaN(betrag) || betrag <= 0) {
        setError('Ungültiger Betrag')
        return
      }

      setUpdatingId(id)
      if (!token) throw new Error('Kein Token')

      const provision = provisionen.find((p) => p.id === id)
      if (!provision) return

      const provisionBetrag = betrag * provision.provisionsSatz

      await updateAdminProvision(
        id,
        { bewilligteSummeEur: betrag },
        token
      )

      setProvisionen(
        provisionen.map((p) =>
          p.id === id
            ? {
                ...p,
                bewilligteSummeEur: betrag,
                provisionBetrag,
              }
            : p
        )
      )

      setEditingId(null)
      setEditBetrag('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Update')
    } finally {
      setUpdatingId(null)
    }
  }

  const formatCurrency = (value: number | undefined) => {
    if (!value) return '—'
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
    }).format(value)
  }

  if (isLoading) {
    return <LadeSpinner text="Provisionen werden geladen..." />
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Provisionen verwalten
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {provisionen.length} Provisionen insgesamt
          </p>
        </div>
      </div>

      {/* Error */}
      {error && <FehlerBox fehler={error} onNeuLaden={() => setError(null)} />}

      {/* Status Filter */}
      <div className="max-w-xs">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Nach Status filtern
        </label>
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Alle Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alle Status</SelectItem>
            <SelectItem value="ausstehend">Ausstehend</SelectItem>
            <SelectItem value="dokumente_eingereicht">Dokumente eingereicht</SelectItem>
            <SelectItem value="geprueft">Geprüft</SelectItem>
            <SelectItem value="abgerechnet">Abgerechnet</SelectItem>
            <SelectItem value="storniert">Storniert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white dark:bg-gray-800 overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-gray-700/50">
            <TableRow>
              <TableHead>Berater</TableHead>
              <TableHead>Unternehmen</TableHead>
              <TableHead>Programm</TableHead>
              <TableHead>Betrag</TableHead>
              <TableHead>Provision (9,99%)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProvisionen.length > 0 ? (
              filteredProvisionen.map((prov) => (
                <TableRow key={prov.id}>
                  <TableCell className="font-medium text-sm">
                    {prov.beraterId.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                    {prov.unternehmenId.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="text-sm">
                    {prov.programmName || '—'}
                  </TableCell>
                  <TableCell>
                    {editingId === prov.id ? (
                      <Input
                        type="number"
                        value={editBetrag}
                        onChange={(e) => setEditBetrag(e.target.value)}
                        placeholder="Betrag"
                        className="w-24 h-8"
                      />
                    ) : (
                      <span
                        onClick={() => {
                          setEditingId(prov.id)
                          setEditBetrag(prov.bewilligteSummeEur?.toString() || '')
                        }}
                        className="cursor-pointer hover:underline"
                      >
                        {formatCurrency(prov.bewilligteSummeEur)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(prov.provisionBetrag)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={prov.status}
                      onValueChange={(val) =>
                        handleStatusChange(prov.id, val as ProvisionStatus)
                      }
                      disabled={updatingId === prov.id}
                    >
                      <SelectTrigger className="w-[140px]">
                        <Badge className={STATUS_COLORS[prov.status]}>
                          {prov.status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ausstehend">Ausstehend</SelectItem>
                        <SelectItem value="dokumente_eingereicht">
                          Dokumente eingereicht
                        </SelectItem>
                        <SelectItem value="geprueft">Geprüft</SelectItem>
                        <SelectItem value="abgerechnet">Abgerechnet</SelectItem>
                        <SelectItem value="storniert">Storniert</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === prov.id ? (
                      <Button
                        size="sm"
                        onClick={() => handleBetragChange(prov.id)}
                        disabled={updatingId === prov.id}
                      >
                        Speichern
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  Keine Provisionen gefunden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
