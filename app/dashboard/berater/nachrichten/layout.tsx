import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Nachrichten',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/dashboard/berater/nachrichten',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
