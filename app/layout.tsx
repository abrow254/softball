import type { Metadata } from 'next'
import './globals.css'
import { NavBar } from '@/components/NavBar'

export const metadata: Metadata = {
  title: 'The Softball Team — Stats',
  description: 'Season stats, game entry, and printable lineup cards for the Forest City SSC Thursday slo-pitch team.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <NavBar />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
      </body>
    </html>
  )
}
