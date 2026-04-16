import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Nutzerverwaltung',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/admin/users',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
