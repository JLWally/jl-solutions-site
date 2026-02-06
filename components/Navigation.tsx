'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Briefcase, Phone, LayoutDashboard, GraduationCap } from 'lucide-react'
import Logo from './Logo'
import { ACADEMY_URL, hasAcademy } from '@/lib/config'

const navItems = [
  { href: '/', label: 'Home', icon: Home, external: false },
  { href: '/subscribe', label: 'Services', icon: Briefcase, external: false },
  { href: '/subscribe?service=consultation', label: 'Free consultation', icon: Phone, external: false },
  { href: '/portal', label: 'Portal', icon: LayoutDashboard, external: false },
  ...(hasAcademy ? [{ href: ACADEMY_URL, label: 'Academy', icon: GraduationCap, external: true as const }] : []),
]

export default function Navigation() {
  const pathname = usePathname()

  const getActive = (item: (typeof navItems)[0]) => {
    if (item.href === '/') return pathname === '/'
    if (item.href === '/portal') return pathname.startsWith('/portal')
    if (item.href === '/subscribe?service=consultation') return pathname === '/subscribe'
    if (item.href === '/subscribe') return pathname === '/subscribe'
    return pathname === item.href
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 bg-slate-900/90 backdrop-blur-sm border-b border-white/10 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Logo showText={true} showTagline={false} size="small" />
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = !item.external && getActive(item)
              const className = `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                active ? 'text-blue-400 bg-blue-500/10' : 'text-gray-400 hover:text-white'
              }`
              return item.external ? (
                <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </a>
              ) : (
                <Link key={item.href} href={item.href} className={className}>
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-sm border-t border-white/10 z-50 md:hidden">
        <div className="flex justify-around items-center py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = !item.external && getActive(item)
            const className = `flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors min-w-0 ${
              active ? 'text-blue-400' : 'text-gray-400 hover:text-white'
            }`
            return item.external ? (
              <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-xs font-medium truncate max-w-[4rem]">{item.label}</span>
              </a>
            ) : (
              <Link key={item.href} href={item.href} className={className}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-xs font-medium truncate max-w-[4rem]">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
