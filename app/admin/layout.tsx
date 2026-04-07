import { ComingSoonBanner } from '@/components/ComingSoonBanner'
export default function Layout({ children }: { children: React.ReactNode }) {
  return (<><ComingSoonBanner feature="Admin-Bereich" eta="intern, ohne ETA" />{children}</>)
}
