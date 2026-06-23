import type { MetadataRoute } from 'next'

// Generates /manifest.webmanifest. Next links it automatically.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'The Softball Team',
    short_name: 'Softball',
    description: 'Season stats, game entry, and printable lineup cards.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#C41E3A', // Cardinals red
    icons: [
      { src: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
