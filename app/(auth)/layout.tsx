import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <div className="px-4 pt-6">
        <Link href="/" className="text-xl font-bold tracking-tight">
          fund24
        </Link>
      </div>
      <div className="mx-auto max-w-md px-4 pb-8 pt-16">
        {children}
      </div>
    </div>
  )
}
