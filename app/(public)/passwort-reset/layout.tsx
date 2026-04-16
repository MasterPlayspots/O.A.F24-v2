import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Passwort zurücksetzen',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/passwort-reset',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
