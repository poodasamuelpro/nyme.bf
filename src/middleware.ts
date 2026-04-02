// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Route secrète admin — difficile à deviner
const ADMIN_ROUTE = '/admin-x9k2m'

export async function middleware(req: NextRequest) {
  const res      = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()
  const path = req.nextUrl.pathname

  // ── Protection dashboard partenaire ──────────────────────────
  if (path.startsWith('/partenaires/dashboard')) {
    if (!session) {
      const url = new URL('/partenaires/login', req.url)
      url.searchParams.set('redirect', path)
      return NextResponse.redirect(url)
    }
  }

  // ── Redirection si déjà connecté (partenaire) ────────────────
  if (path === '/partenaires/login' && session) {
    return NextResponse.redirect(new URL('/partenaires/dashboard', req.url))
  }

  // ── Protection dashboard admin ───────────────────────────────
  if (path.startsWith(`${ADMIN_ROUTE}/dashboard`)) {
    if (!session) {
      return NextResponse.redirect(new URL(`${ADMIN_ROUTE}/login`, req.url))
    }
    // Vérifier le rôle admin via cookie / header custom
    // La vérification réelle est faite dans le composant
  }

  // ── Redirection si déjà connecté (admin) ─────────────────────
  if (path === `${ADMIN_ROUTE}/login` && session) {
    return NextResponse.redirect(new URL(`${ADMIN_ROUTE}/dashboard`, req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/partenaires/dashboard/:path*',
    '/partenaires/login',
    '/admin-x9k2m/dashboard/:path*',
    '/admin-x9k2m/login',
  ],
}