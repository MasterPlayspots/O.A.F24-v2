import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Unternehmen Dashboard',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/dashboard/unternehmen',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
