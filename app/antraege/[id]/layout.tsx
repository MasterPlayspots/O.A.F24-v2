import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Antrag Details',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/antraege',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
