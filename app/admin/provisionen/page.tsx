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
  ausstehend: 'bg-architect-primary/20 text-architect-primary-light',
  dokumente_eingereicht: 'bg-architect-primary/25 text-architect-primary-light',
  geprueft: 'bg-architect-primary/30 text-white',
  abgerechnet: 'bg-architect-tertiary/25 text-architect-tertiary-light',
  storniert: 'bg-architect-error/20 text-architect-error-container',
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
    <div className="min-h-screen bg-architect-surface font-body text-white">
    <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="inline-flex items-center text-sm text-white/60 hover:text-white mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Link>
          <h1 className="font-display text-4xl font-bold text-white">
            Provisionen verwalten
          </h1>
          <p className="mt-1 text-white/60">
            {provisionen.length} Provisionen insgesamt
          </p>
        </div>
      </div>

      {/* Error */}
      {error && <FehlerBox fehler={error} onNeuLaden={() => setError(null)} />}

      {/* Status Filter */}
      <div className="max-w-xs">
        <label className="text-sm font-medium text-white/70">
          Nach Status filtern
        </label>
        <Select value={statusFilter} onValueChange={(val: string | null) => setStatusFilter((val ?? '') as ProvisionStatus | '')}>
          <SelectTrigger className="mt-1 bg-architect-surface/60 border-0 text-white">
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
      <div className="rounded-lg bg-architect-surface/60 overflow-x-auto">
        <Table>
          <TableHeader className="bg-architect-surface-low/30">
            <TableRow className="border-0 hover:bg-architect-surface-low/30">
              <TableHead className="text-white/70">Berater</TableHead>
              <TableHead className="text-white/70">Unternehmen</TableHead>
              <TableHead className="text-white/70">Programm</TableHead>
              <TableHead className="text-white/70">Betrag</TableHead>
              <TableHead className="text-white/70">Provision (9,99%)</TableHead>
              <TableHead className="text-white/70">Status</TableHead>
              <TableHead className="text-white/70 text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProvisionen.length > 0 ? (
              filteredProvisionen.map((prov) => (
                <TableRow key={prov.id} className="border-0 hover:bg-architect-surface/40">
                  <TableCell className="font-medium text-sm">
                    {prov.beraterId.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="text-sm text-white/60">
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
                        className="w-24 h-8 bg-architect-surface-low/40 border-0 text-white"
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
                      onValueChange={(val: string | null) =>
                        handleStatusChange(prov.id, (val ?? prov.status) as ProvisionStatus)
                      }
                      disabled={updatingId === prov.id}
                    >
                      <SelectTrigger className="w-[140px] bg-architect-surface-low/40 border-0 text-white">
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
                        className="bg-architect-primary hover:bg-architect-primary-container text-white"
                      >
                        Speichern
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="border-0 hover:bg-transparent">
                <TableCell colSpan={7} className="text-center py-8 text-white/50">
                  Keine Provisionen gefunden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
    </div>
  )
}
