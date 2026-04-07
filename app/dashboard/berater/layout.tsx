import { ComingSoonBanner } from '@/components/ComingSoonBanner'
export default function Layout({ children }: { children: React.ReactNode }) {
  return (<><ComingSoonBanner feature="Berater-Dashboard" eta="Q2 2026" />{children}</>)
}
