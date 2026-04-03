import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ===== ROUTES PROTÉGÉES =====
const PROTECTED_ROUTES: Record<string, string[]> = {
  '/client': ['client', 'admin'],
  '/coursier': ['coursier', 'admin'],
  '/partenaires/dashboard': ['partenaire', 'admin'], // On protège le dashboard, pas la racine
  '/admin-x9k2m': ['admin'],
}

// Routes publiques
const PUBLIC_ROUTES = [
  '/',
  '/partenaires',      // ✅ TA PAGE DE PRÉSENTATION EST MAINTENANT PUBLIQUE
  '/login',
  '/register',
  '/coursier/login',
  '/partenaires/login',
  '/admin-x9k2m/login',
  '/api/auth',
  '/api/public',
  '/contact',
  '/service-client'
]

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const { data: { session } } = await supabase.auth.getSession()
  const pathname = req.nextUrl.pathname

  // 1. Vérifier si c'est EXACTEMENT la page partenaire publique
  if (pathname === '/partenaires') {
    return res
  }

  // 2. Vérifier si la route est dans la liste publique
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith('/api/')
  )

  if (isPublicRoute) {
    if (session && (pathname === '/login' || pathname === '/register')) {
      const userRole = await getUserRole(supabase, session.user.id)
      return redirectToDashboard(req, userRole)
    }
    return res
  }

  // 3. Logique de protection pour les sous-pages (dashboard, etc.)
  const protectedBase = Object.keys(PROTECTED_ROUTES).find(base =>
    pathname.startsWith(base)
  )

  // Cas spécial pour protéger tout /partenaires/ sauf la racine déjà gérée
  const isProtectedPartner = pathname.startsWith('/partenaires/') && pathname !== '/partenaires'

  if (protectedBase || isProtectedPartner) {
    if (!session) {
      const base = pathname.startsWith('/partenaires') ? '/partenaires' : '/admin-x9k2m'
      return redirectToLogin(req, base)
    }

    const userRole = await getUserRole(supabase, session.user.id)
    const allowedRoles = protectedBase ? PROTECTED_ROUTES[protectedBase] : ['partenaire', 'admin']

    if (!allowedRoles.includes(userRole)) {
      return redirectToDashboard(req, userRole)
    }
  }

  return res
}

async function getUserRole(supabase: any, userId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('utilisateurs')
      .select('role')
      .eq('id', userId)
      .single()
    return data?.role || 'client'
  } catch {
    return 'client'
  }
}

function redirectToLogin(req: NextRequest, protectedBase: string): NextResponse {
  let loginPath = '/login'
  if (protectedBase.startsWith('/coursier')) loginPath = '/login?role=coursier'
  if (protectedBase.startsWith('/partenaires')) loginPath = '/partenaires/login'
  if (protectedBase.startsWith('/admin')) loginPath = '/admin-x9k2m/login'

  const url = req.nextUrl.clone()
  url.pathname = loginPath.split('?')[0]
  if (loginPath.includes('?')) {
    const params = loginPath.split('?')[1]
    url.search = '?' + params
  }
  url.searchParams.set('redirect', req.nextUrl.pathname)
  return NextResponse.redirect(url)
}

function redirectToDashboard(req: NextRequest, role: string): NextResponse {
  const url = req.nextUrl.clone()
  switch (role) {
    case 'client': url.pathname = '/client/dashboard'; break
    case 'coursier': url.pathname = '/coursier/dashboard-new'; break
    case 'partenaire': url.pathname = '/partenaires/dashboard'; break
    case 'admin': url.pathname = '/admin-x9k2m/dashboard'; break
    default: url.pathname = '/login'
  }
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    /* * On exclut les fichiers statiques et images du middleware
     * pour éviter de ralentir le site 
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
