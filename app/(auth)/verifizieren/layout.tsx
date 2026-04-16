import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'E-Mail verifizieren',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/verifizieren',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
