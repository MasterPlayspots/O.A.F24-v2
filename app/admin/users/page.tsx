'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/store/authStore'
import { getAdminUsers, updateAdminUser } from '@/lib/api/check'
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
        const data = await getAdminUsers(token)
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
      await updateAdminUser(userId, { role: newRole as any }, token)
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole as any } : u)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Update')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDeactivate = async (userId: string) => {
    if (!confirm('Diesen Nutzer wirklich deaktivieren?')) return

    try {
      setUpdatingId(userId)
      if (!token) throw new Error('Kein Token')
      await updateAdminUser(userId, { deleted_at: new Date().toISOString() }, token)
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
    <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Nutzer verwalten
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {users.length} Nutzer insgesamt
          </p>
        </div>
      </div>

      {/* Error */}
      {error && <FehlerBox fehler={error} onNeuLaden={() => setError(null)} />}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <Input
          placeholder="Nach E-Mail, Name oder Unternehmen suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white dark:bg-gray-800 overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-gray-700/50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Unternehmen</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-400">
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
                      <SelectTrigger className="w-[120px]">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeactivate(user.id)}
                      disabled={updatingId === user.id}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  Keine Nutzer gefunden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
