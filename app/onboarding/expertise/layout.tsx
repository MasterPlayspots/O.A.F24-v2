import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Onboarding — Expertise',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/onboarding/expertise',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
