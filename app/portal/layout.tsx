'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Briefcase, BookOpen, ClipboardCheck, LayoutDashboard, ArrowLeft, DollarSign, Users } from 'lucide-react'

const portalNav = [
  { href: '/portal', label: 'Portal home', icon: LayoutDashboard },
  { href: '/portal/leads', label: 'Leads', icon: Users },
  { href: '/portal/referral', label: 'Earn 45% commission', icon: DollarSign },
  { href: '/portal/get-started', label: 'Get started', icon: Compass },
  { href: '/portal/services', label: 'Services', icon: Briefcase },
  { href: '/portal/onboarding', label: 'Onboarding', icon: BookOpen },
  { href: '/portal/eligibility', label: 'Eligibility wizard', icon: ClipboardCheck },
]

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="flex flex-col md:flex-row">
        {/* Portal sidebar */}
        <aside className="w-full md:w-56 lg:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r border-white/10 bg-slate-900/50">
          <div className="p-4 sticky top-20">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to site
            </Link>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3">
              Seller / referral portal
            </p>
            <nav className="space-y-1">
              {portalNav.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== '/portal' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-blue-500/20 text-blue-300' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
