import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Förder-Tracker',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/dashboard/unternehmen/tracker',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
