import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import ReferralCapture from '@/components/ReferralCapture'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'JL Solutions - Fix, Build, and Manage Apps',
  description: 'We fix bugs, build new apps, manage yours, and add AI automation. Free 30-minute consultation — no obligation.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} pt-14 pb-20 md:pb-8`}>
        <ReferralCapture />
        {children}
        <Navigation />
        <Footer />
      </body>
    </html>
  )
}
