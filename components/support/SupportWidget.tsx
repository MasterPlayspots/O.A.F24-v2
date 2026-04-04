'use client'

import { useState } from 'react'
import { MessageCircle, Phone, Mail, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// TODO: Vor Go-Live echte Kontaktdaten eintragen (PF-9-Checkliste)
export function SupportWidget() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed z-50 right-6" style={{ bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
      {open && (
        <div className="mb-3 w-72 rounded-xl border bg-background p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Hilfe &amp; Kontakt</h3>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-3">
            <a href="tel:+4915129617192" className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-muted">
              <Phone size={16} className="text-primary" />
              <div>
                <p className="font-medium">Telefon</p>
                <p className="text-xs text-muted-foreground">+49 1512 9617192</p>
              </div>
            </a>
            <a href="mailto:support@fund24.io" className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-muted">
              <Mail size={16} className="text-primary" />
              <div>
                <p className="font-medium">E-Mail</p>
                <p className="text-xs text-muted-foreground">support@fund24.io</p>
              </div>
            </a>
            <p className="text-xs text-muted-foreground">
              Mo–Fr 9–17 Uhr
            </p>
          </div>
        </div>
      )}
      <Button
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={16} /> : <MessageCircle size={16} />}
      </Button>
    </div>
  )
}
