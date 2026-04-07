import { ComingSoonBanner } from '@/components/ComingSoonBanner'
export default function Layout({ children }: { children: React.ReactNode }) {
  return (<><ComingSoonBanner feature="Aktuelles & News-Blog" eta="Q2 2026" />{children}</>)
}
