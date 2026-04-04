'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/store/authStore'
import { useVerifiedGuard } from '@/lib/hooks/useVerifiedGuard'
import { useMount } from '@/lib/hooks/useMount'
import { getCheck } from '@/lib/api/check'
import type { CheckSession, ChatNachricht, CheckErgebnis } from '@/lib/types'
import { FehlerBox } from '@/components/shared/FehlerBox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'

type CheckDetail = CheckSession & { nachrichten: ChatNachricht[]; ergebnisse: CheckErgebnis[] }

export default function CheckDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const { loading: guardLoading } = useVerifiedGuard()
  const isMounted = useMount()
  const [check, setCheck] = useState<CheckDetail | null>(null)
  const [fehler, setFehler] = useState('')
  const [ladet, setLadet] = useState(true)

  useEffect(() => {
    if (!isMounted || guardLoading || !token || !id) return

    const load = async () => {
      try {
        setFehler('')
        const result = await getCheck(id, token)
        setCheck(result as CheckDetail)
      } catch (error) {
        setFehler(error instanceof Error ? error.message : 'Fehler beim Laden des Checks')
      } finally {
        setLadet(false)
      }
    }

    load()
  }, [isMounted, guardLoading, token, id])

  if (!isMounted || guardLoading || ladet) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-48" />
        </div>
      </div>
    )
  }

  if (fehler) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <BackLink />
          <FehlerBox fehler={fehler} />
        </div>
      </div>
    )
  }

  if (!check) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <BackLink />

        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-slate-900">{check.firmenname || 'Fördercheck'}</h1>
          <Badge variant={check.status === 'abgeschlossen' ? 'default' : 'secondary'}>
            {check.status}
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          <Card className="p-4 border-slate-200">
            <p className="text-sm text-slate-600">Branche</p>
            <p className="font-medium text-slate-900">{check.branche || '—'}</p>
          </Card>
          <Card className="p-4 border-slate-200">
            <p className="text-sm text-slate-600">Bundesland</p>
            <p className="font-medium text-slate-900">{check.bundesland || '—'}</p>
          </Card>
          <Card className="p-4 border-slate-200">
            <p className="text-sm text-slate-600">Vorhaben</p>
            <p className="font-medium text-slate-900">{check.vorhaben || '—'}</p>
          </Card>
          <Card className="p-4 border-slate-200">
            <p className="text-sm text-slate-600">Erstellt am</p>
            <p className="font-medium text-slate-900">
              {new Date(check.createdAt).toLocaleDateString('de-DE')}
            </p>
          </Card>
        </div>

        {check.ergebnisse && check.ergebnisse.length > 0 && (
          <Card className="border-slate-200 mb-8">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                Ergebnisse ({check.ergebnisse.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-200">
              {check.ergebnisse.map((e) => (
                <div key={e.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{e.programmName}</p>
                    {e.begruendung && (
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">{e.begruendung}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <Badge variant="outline">Klasse {e.klasse}</Badge>
                    <span className="text-sm font-medium text-slate-700">
                      {Math.round(e.relevanzScore * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
      <Link href="/dashboard/unternehmen">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Zurück zum Dashboard
      </Link>
    </Button>
  )
}
