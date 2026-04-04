import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FehlerBoxProps {
  fehler: string
  onNeuLaden?: () => void
}

export function FehlerBox({ fehler, onNeuLaden }: FehlerBoxProps) {
  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
        <div>
          <p className="text-sm font-medium text-destructive">{fehler}</p>
          {onNeuLaden && (
            <Button variant="outline" size="sm" onClick={onNeuLaden} className="mt-3">
              Erneut versuchen
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
