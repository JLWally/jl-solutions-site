import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TrailCrafter - AI-Powered Custom Trail Design',
  description: 'Design your own virtual running and biking trails with AI. Perfect for Peloton, treadmills, and fitness bikes.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Navigation />
      </body>
    </html>
  )
}
