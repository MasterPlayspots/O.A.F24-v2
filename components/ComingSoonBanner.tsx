// components/ComingSoonBanner.tsx
export function ComingSoonBanner({
  feature,
  eta,
}: {
  feature: string
  eta?: string
}) {
  return (
    <div className="sticky top-0 z-50 w-full bg-amber-100 border-b border-amber-300 text-amber-900 px-4 py-3 text-sm font-medium text-center">
      🚧 <strong>Coming Soon:</strong> {feature} ist aktuell in Entwicklung
      {eta && <> &middot; geplant für {eta}</>}. Inhalte sind Vorschau/Platzhalter.
    </div>
  )
}
