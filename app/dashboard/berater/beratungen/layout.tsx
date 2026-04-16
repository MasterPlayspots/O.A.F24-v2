import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Beratungen',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/dashboard/berater/beratungen',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
