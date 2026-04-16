import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Onboarding — Unternehmen',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/onboarding/unternehmen',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
