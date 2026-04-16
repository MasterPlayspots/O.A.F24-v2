import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Anmelden',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/login',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
