import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Onboarding — Dienstleistungen',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/onboarding/dienstleistungen',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
