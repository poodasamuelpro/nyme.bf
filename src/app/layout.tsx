import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: {
    default: 'NYME — Livraison Rapide & Intelligente en Afrique de l\'Ouest',
    template: '%s | NYME',
  },
  description: 'NYME est la plateforme de livraison à la demande conçue pour l\'Afrique de l\'Ouest. Rapide, sécurisée, transparente. Coursiers vérifiés, suivi GPS en temps réel, paiement Mobile Money.',
  keywords: ['livraison', 'Burkina Faso', 'Ouagadougou', 'Afrique de l\'Ouest', 'coursier', 'colis', 'Mobile Money', 'Orange Money', 'NYME'],
  authors: [{ name: 'NYME' }],
  creator: 'NYME',
  publisher: 'NYME',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://nyme.app',
    siteName: 'NYME',
    title: 'NYME — Livraison Rapide & Intelligente',
    description: 'La plateforme de livraison à la demande conçue pour l\'Afrique de l\'Ouest.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NYME - Livraison Intelligente',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NYME — Livraison Rapide & Intelligente',
    description: 'La plateforme de livraison à la demande pour l\'Afrique de l\'Ouest.',
    images: ['/og-image.png'],
  },
  metadataBase: new URL('https://nyme.app'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-body bg-nyme-dark text-white antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
