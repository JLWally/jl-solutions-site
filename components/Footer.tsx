import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-slate-900/80 border-t border-white/10 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span>© 2026 JL Solutions. All rights reserved.</span>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/subscribe" className="hover:text-white transition-colors">Services</Link>
            <Link href="/portal" className="hover:text-white transition-colors">Portal</Link>
            <Link href="/subscribe?service=consultation" className="hover:text-white transition-colors">Free consultation</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
