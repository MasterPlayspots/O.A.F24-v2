'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useMount } from '@/lib/hooks/useMount'
import { useAuth } from '@/lib/store/authStore'
import { logout as apiLogout } from '@/lib/api/auth'
import { Badge } from '@/components/ui/badge'
import { NotificationsBell } from '@/components/shared/NotificationsBell'

const NAV_LINKS = [
  { href: '/programme', label: 'Programme' },
  { href: '/berater', label: 'Berater' },
  { href: '/preise', label: 'Preise' },
  { href: '/aktuelles', label: 'Aktuelles' },
]

export function Navbar() {
  const mounted = useMount()
  const pathname = usePathname()
  const router = useRouter()
  const { nutzer, token, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => {
    try {
      if (token) await apiLogout(token)
    } catch { /* ignore */ }
    logout()
    router.push('/')
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  const rolleLabel = nutzer?.role === 'admin' ? 'Admin' : nutzer?.role === 'berater' ? 'Berater' : 'Unternehmen'

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const menuLinks = nutzer?.role === 'unternehmen'
    ? [
        { href: '/dashboard/unternehmen', label: 'Dashboard' },
        { href: '/foerdercheck', label: 'Fördercheck' },
        { href: '/dashboard/unternehmen/favoriten', label: 'Favoriten' },
      ]
    : nutzer?.role === 'berater'
    ? [
        { href: '/dashboard/berater', label: 'Dashboard' },
        { href: '/dashboard/berater/anfragen', label: 'Anfragen' },
        { href: '/dashboard/berater/abwicklung', label: 'Abwicklung' },
      ]
    : nutzer?.role === 'admin'
    ? [{ href: '/admin', label: 'Admin-Panel' }]
    : []

  return (
    <header className="sticky top-0 z-50 w-full bg-architect-surface backdrop-blur supports-[backdrop-filter]:bg-architect-surface/80 font-body">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="font-display text-xl font-bold tracking-tight text-white">
          fund24
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-white ${
                isActive(link.href) ? 'text-architect-primary-light' : 'text-white/70'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {mounted && nutzer && <NotificationsBell />}
          {mounted && nutzer ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white hover:bg-architect-surface/40"
              >
                {nutzer.firstName} {nutzer.lastName}
                <Badge variant="secondary" className="text-xs">{rolleLabel}</Badge>
                <ChevronDown className="h-4 w-4" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-md bg-architect-surface-low p-1 shadow-md">
                  {menuLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setDropdownOpen(false)}
                      className="block rounded-sm px-3 py-2 text-sm text-white hover:bg-architect-surface/40"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="my-1 h-px bg-white/10" />
                  <button
                    onClick={() => { setDropdownOpen(false); handleLogout() }}
                    className="w-full rounded-sm px-3 py-2 text-left text-sm text-white hover:bg-architect-surface/40"
                  >
                    Ausloggen
                  </button>
                </div>
              )}
            </div>
          ) : mounted ? (
            <>
              <Link
                href="/login"
                className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-white hover:bg-architect-surface/40"
              >
                Anmelden
              </Link>
              <Link
                href="/registrieren"
                className="inline-flex h-9 items-center rounded-md bg-architect-primary px-4 text-sm font-medium text-white hover:bg-architect-primary-container"
              >
                Registrieren
              </Link>
            </>
          ) : (
            <div className="h-10 w-48" />
          )}
        </div>

        {/* Mobile */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white hover:bg-architect-surface/40 md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="bg-architect-surface px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-3 pt-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`text-base font-medium ${
                  isActive(link.href) ? 'text-architect-primary-light' : 'text-white/70'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <hr className="my-1 border-white/10" />
            {mounted && nutzer ? (
              <>
                <p className="text-sm text-white/60">
                  {nutzer.firstName} {nutzer.lastName}
                  <Badge variant="secondary" className="ml-2 text-xs">{rolleLabel}</Badge>
                </p>
                {menuLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-base text-white"
                  >
                    {link.label}
                  </Link>
                ))}
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false) }}
                  className="text-left text-base text-architect-error-container"
                >
                  Ausloggen
                </button>
              </>
            ) : mounted ? (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="text-base text-white">Anmelden</Link>
                <Link href="/registrieren" onClick={() => setMobileOpen(false)} className="text-base font-medium text-architect-primary-light">Registrieren</Link>
              </>
            ) : null}
          </nav>
        </div>
      )}
    </header>
  )
}
