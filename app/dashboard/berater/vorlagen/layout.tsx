import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Vorlagen',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/dashboard/berater/vorlagen',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
