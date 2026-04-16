import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Audit Logs',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/admin/audit-logs',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
