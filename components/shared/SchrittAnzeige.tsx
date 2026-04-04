import { CheckCircle2 } from 'lucide-react'

interface SchrittAnzeigeProps {
  schritte: string[]
  aktuell: number
}

export function SchrittAnzeige({ schritte, aktuell }: SchrittAnzeigeProps) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {schritte.map((schritt, i) => (
        <div key={schritt} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                i < aktuell
                  ? 'bg-green-500 text-white'
                  : i === aktuell
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < aktuell ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className="hidden text-xs sm:block">{schritt}</span>
          </div>
          {i < schritte.length - 1 && (
            <div className={`hidden h-0.5 w-8 sm:block ${i < aktuell ? 'bg-green-500' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  )
}
