import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Registrieren',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/registrieren',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
