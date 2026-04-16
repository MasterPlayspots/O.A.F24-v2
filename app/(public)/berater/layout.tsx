import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: 'Berater finden',
  description: 'Finden Sie zertifizierte Fördermittelberater in Ihrer Region.',
  path: '/berater',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
