import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Aktuelles verwalten',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/admin/aktuelles',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
