import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Email Outbox',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/admin/email-outbox',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
