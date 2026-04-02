// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse }           from 'next/server'
import type { NextRequest }       from 'next/server'

export async function middleware(req: NextRequest) {
  const res      = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const { data: { session } } = await supabase.auth.getSession()

  const pathname = req.nextUrl.pathname

  // ── Protéger le dashboard ──
  if (pathname.startsWith('/partenaires/dashboard')) {
    if (!session) {
      const loginUrl = new URL('/partenaires/login', req.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ── Rediriger si déjà connecté et sur /login ──
  if (pathname === '/partenaires/login' && session) {
    return NextResponse.redirect(new URL('/partenaires/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/partenaires/dashboard/:path*',
    '/partenaires/login',
  ],
}
