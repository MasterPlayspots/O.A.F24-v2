import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Favoriten',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/dashboard/unternehmen/favoriten',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
