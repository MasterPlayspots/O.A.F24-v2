'use client'

import { useState } from 'react'
import { MessageCircle, Phone, Mail, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Configurable at build-time via Vercel env.
// Set NEXT_PUBLIC_SUPPORT_PHONE / NEXT_PUBLIC_SUPPORT_EMAIL / NEXT_PUBLIC_SUPPORT_HOURS
// to override the defaults below. Defaults are the current public values.
const SUPPORT_PHONE_DISPLAY = process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? '+49 151 29617192'
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@fund24.io'
const SUPPORT_HOURS = process.env.NEXT_PUBLIC_SUPPORT_HOURS ?? 'Mo–Fr 9–17 Uhr'

// tel: href needs to be digits only (no spaces), so strip everything except +0-9.
const telHref = `tel:${SUPPORT_PHONE_DISPLAY.replace(/[^+\d]/g, '')}`

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
            <a href={telHref} className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-muted">
              <Phone size={16} className="text-primary" />
              <div>
                <p className="font-medium">Telefon</p>
                <p className="text-xs text-muted-foreground">{SUPPORT_PHONE_DISPLAY}</p>
              </div>
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-muted">
              <Mail size={16} className="text-primary" />
              <div>
                <p className="font-medium">E-Mail</p>
                <p className="text-xs text-muted-foreground">{SUPPORT_EMAIL}</p>
              </div>
            </a>
            <p className="text-xs text-muted-foreground">
              {SUPPORT_HOURS}
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
