import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Abwicklung',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/dashboard/berater/abwicklung',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
