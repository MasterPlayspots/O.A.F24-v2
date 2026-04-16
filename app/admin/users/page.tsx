'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/store/authStore'
import { getAdminUsers, updateAdminUser, deleteAdminUser } from '@/lib/api/fund24'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { LadeSpinner } from '@/components/shared/LadeSpinner'
import { FehlerBox } from '@/components/shared/FehlerBox'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Search, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Nutzer } from '@/lib/types'

export default function AdminUsersPage() {
  const router = useRouter()
  const { token, istAdmin } = useAuth()
  const [users, setUsers] = useState<Nutzer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    if (!istAdmin()) {
      router.push('/')
      return
    }

    const fetchUsers = async () => {
      try {
        if (!token) throw new Error('Kein Token')
        const data = await getAdminUsers()
        setUsers(data.users)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Fehler beim Laden'
        setError(msg)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [token, istAdmin, router])

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const query = searchQuery.toLowerCase()
      return (
        user.email.toLowerCase().includes(query) ||
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        (user.company?.toLowerCase().includes(query) ?? false)
      )
    })
  }, [users, searchQuery])

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!token) {
      setError('Kein Token')
      return
    }
    try {
      setUpdatingId(userId)
      await updateAdminUser(userId, { role: newRole as Nutzer['role'] })
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole as Nutzer['role'] } : u)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Update')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDeactivate = async (userId: string) => {
    try {
      setUpdatingId(userId)
      if (!token) throw new Error('Kein Token')
      await deleteAdminUser(userId)
      setUsers(users.filter((u) => u.id !== userId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen')
    } finally {
      setUpdatingId(null)
    }
  }

  if (isLoading) {
    return <LadeSpinner text="Nutzer werden geladen..." />
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
            Nutzer verwalten
          </h1>
          <p className="mt-1 text-white/60">
            {users.length} Nutzer insgesamt
          </p>
        </div>
      </div>

      {/* Error */}
      {error && <FehlerBox fehler={error} onNeuLaden={() => setError(null)} />}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-white/40" />
        <Input
          placeholder="Nach E-Mail, Name oder Unternehmen suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-architect-surface/60 border-0 text-white placeholder:text-white/40"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg bg-architect-surface/60 overflow-x-auto">
        <Table>
          <TableHeader className="bg-architect-surface-low/30">
            <TableRow className="border-0 hover:bg-architect-surface-low/30">
              <TableHead className="text-white/70">Name</TableHead>
              <TableHead className="text-white/70">E-Mail</TableHead>
              <TableHead className="text-white/70">Unternehmen</TableHead>
              <TableHead className="text-white/70">Rolle</TableHead>
              <TableHead className="text-white/70 text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow key={user.id} className="border-0 hover:bg-architect-surface/40">
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell className="text-sm text-white/60">
                    {user.email}
                  </TableCell>
                  <TableCell className="text-sm">
                    {user.company || '—'}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(val: string | null) => val && handleRoleChange(user.id, val)}
                      disabled={updatingId === user.id}
                    >
                      <SelectTrigger className="w-[120px] bg-architect-surface-low/40 border-0 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unternehmen">Unternehmen</SelectItem>
                        <SelectItem value="berater">Berater</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={updatingId === user.id}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                      title="Nutzer deaktivieren"
                      description="Möchten Sie diesen Nutzer wirklich deaktivieren? Der Account bleibt bestehen, aber der Nutzer kann sich nicht mehr einloggen."
                      onConfirm={() => handleDeactivate(user.id)}
                      confirmText="Deaktivieren"
                      variant="destructive"
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="border-0 hover:bg-transparent">
                <TableCell colSpan={5} className="text-center py-8 text-white/50">
                  Keine Nutzer gefunden
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
