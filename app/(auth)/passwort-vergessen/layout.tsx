import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Passwort vergessen',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/passwort-vergessen',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
