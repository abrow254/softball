import type { Metadata } from 'next'
import './globals.css'
import { NavBar } from '@/components/NavBar'

export const metadata: Metadata = {
  metadataBase: new URL('https://softball.beer'),
  title: 'The Softball Team — Stats',
  description: 'Season stats, game entry, and printable lineup cards for the Forest City SSC Thursday slo-pitch team.',
  openGraph: {
    title: 'The Softball Team — Stats',
    description: 'Season stats, game entry, and printable lineup cards for our Thursday slo-pitch team.',
    url: 'https://softball.beer',
    siteName: 'softball.beer',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans">
        <NavBar />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
      </body>
    </html>
  )
}
