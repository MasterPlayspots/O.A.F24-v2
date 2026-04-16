import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Admin Dashboard',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/admin',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
