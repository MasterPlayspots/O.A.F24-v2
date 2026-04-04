import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface LeererZustandProps {
  titel: string
  beschreibung?: string
  cta?: { text: string; href: string }
}

export function LeererZustand({ titel, beschreibung, cta }: LeererZustandProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <h3 className="text-lg font-medium">{titel}</h3>
      {beschreibung && <p className="max-w-sm text-sm text-muted-foreground">{beschreibung}</p>}
      {cta && (
        <Button asChild className="mt-2">
          <Link href={cta.href}>{cta.text}</Link>
        </Button>
      )}
    </div>
  )
}
