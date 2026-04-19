'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { useAuth } from '@/lib/store/authStore'
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification as NotificationItem,
} from '@/lib/api/fund24'
import { Button } from '@/components/ui/button'

export function NotificationsBell() {
  const { token } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)

  const load = async () => {
    if (!token) return
    try {
      const res = await listNotifications()
      setItems(res.results || [])
      setUnread(res.unread || 0)
    } catch {
      /* silent */
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleRead = async (id: string) => {
    await markNotificationRead(id)
    await load()
  }
  const handleReadAll = async () => {
    await markAllNotificationsRead()
    await load()
  }

  if (!token) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-muted dark:hover:bg-card"
        aria-label="Benachrichtigungen"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-destructive text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-foreground border border-border dark:border-border/50 rounded-lg shadow-xl z-50">
          <div className="p-3 border-b border-border dark:border-border/50 flex items-center justify-between">
            <span className="font-semibold text-sm">Benachrichtigungen</span>
            {unread > 0 && (
              <Button size="sm" variant="ghost" onClick={handleReadAll}>
                Alle gelesen
              </Button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-6 text-sm text-center text-muted-foreground">Keine Benachrichtigungen</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleRead(n.id)}
                  className={`w-full text-left p-3 border-b border-slate-100 dark:border-slate-800 hover:bg-background dark:hover:bg-card ${
                    !n.read_at ? 'bg-primary/10/50 dark:bg-primary/10' : ''
                  }`}
                >
                  <p className="text-sm font-medium">{n.titel || n.typ}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    {new Date(n.created_at).toLocaleString('de-DE')}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
