'use client'

// src/components/ConditionalLayout.tsx
// ═══════════════════════════════════════════════════════════════════
// Composant qui masque Header et Footer sur toutes les pages privées
// (dashboard, espaces connectés) et les conserve uniquement sur les
// pages publiques du site.
//
// Pages PUBLIQUES → Header + Footer affichés
// Pages PRIVÉES   → Header + Footer masqués
// ═══════════════════════════════════════════════════════════════════

import { usePathname } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

// Liste des préfixes de routes considérées comme "privées" ou "auth"
// (espaces connectés + pages de login/auth qui ont leur propre design app-like)
const PRIVATE_PREFIXES = [
  // ── Espace Client (connecté) ──
  '/client',

  // ── Espace Coursier (connecté + pages auth coursier) ──
  '/coursier/dashboard',
  '/coursier/dashboard-new',
  '/coursier/profil',
  '/coursier/wallet',
  '/coursier/messages',
  '/coursier/chat',
  '/coursier/mission',
  '/coursier/verification',
  '/coursier/login',

  // ── Espace Admin (connecté + login admin) ──
  '/admin-x9k2m',

  // ── Espace Partenaires (dashboard connecté + login) ──
  '/partenaires/dashboard',
  '/partenaires/login',
  '/partenaires/reset-password',

  // ── Pages d'authentification client ──
  '/login',
  '/reset-password',
  '/update-password',
  '/auth/callback',

  // ── Page messages globale ──
  '/messages',
  '/chat',
]

function isPrivatePage(pathname: string): boolean {
  return PRIVATE_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(prefix + '/')
  )
}

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPrivate = isPrivatePage(pathname)

  return (
    <>
      {!isPrivate && <Header />}
      <main>{children}</main>
      {!isPrivate && <Footer />}
    </>
  )
}