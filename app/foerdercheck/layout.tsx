import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Fördercheck starten',
  description: 'Dieser Bereich ist nur für angemeldete Nutzer zugänglich.',
  path: '/foerdercheck',
  noIndex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
