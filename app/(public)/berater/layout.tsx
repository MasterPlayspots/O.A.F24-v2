import { ComingSoonBanner } from '@/components/ComingSoonBanner'
export default function Layout({ children }: { children: React.ReactNode }) {
  return (<><ComingSoonBanner feature="Berater-Verzeichnis" eta="Q2 2026" />{children}</>)
}
