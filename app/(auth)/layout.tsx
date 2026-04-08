import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-architect-surface font-body text-white">
      <div className="px-4 pt-6">
        <Link href="/" className="font-display text-xl font-bold tracking-tight text-white">
          fund24
        </Link>
      </div>
      <div className="mx-auto max-w-md px-4 pb-8 pt-16">
        <div className="rounded-lg bg-architect-surface/60 p-6 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
