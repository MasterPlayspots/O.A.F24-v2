import { Loader2 } from 'lucide-react'

interface LadeSpinnerProps {
  text?: string
}

export function LadeSpinner({ text }: LadeSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  )
}
