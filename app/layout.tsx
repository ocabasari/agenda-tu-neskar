import './globals.css'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Monitoring Buku Agenda TU',
  description: 'SMKN 1 Karawang',
}

// Pengaturan agar responsif sempurna di layar HP
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className="bg-gray-50 text-gray-800 antialiased">
        {children}
      </body>
    </html>
  )
}