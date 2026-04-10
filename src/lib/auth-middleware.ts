// src/lib/auth-middleware.ts — NOUVEAU FICHIER
// ═══════════════════════════════════════════════════════════════════════════
// CENTRALISATION DE L'AUTHENTIFICATION ADMIN — NYME
// Correction audit : remplace les vérifications manuelles répétées dans
// chaque route API admin par un utilitaire unique et cohérent.
// ═══════════════════════════════════════════════════════════════════════════

import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

export interface AdminVerifyResult {
  ok:      boolean
  adminId?: string
  error?:  string
}

/**
 * Vérifie que la requête provient d'un utilisateur authentifié avec le rôle 'admin'.
 * Utilise le token Bearer extrait de l'en-tête Authorization.
 *
 * Usage dans les routes API :
 *   const auth = await verifyAdminRole(req)
 *   if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })
 *
 * @param req  La requête Next.js (Request | NextRequest)
 * @returns    { ok: true, adminId: string } ou { ok: false, error: string }
 */
export async function verifyAdminRole(req: Request): Promise<AdminVerifyResult> {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()

  if (!token) {
    return { ok: false, error: 'Token d\'authentification manquant' }
  }

  // Vérifier le token JWT via le client anon (permet de valider sans service_role)
  const supabaseCheck = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: { user }, error: authError } = await supabaseCheck.auth.getUser(token)

  if (authError || !user) {
    return { ok: false, error: 'Session invalide ou expirée' }
  }

  // Vérifier le rôle dans la table utilisateurs (source de vérité des rôles)
  const { data: userRow, error: dbError } = await supabaseAdmin
    .from('utilisateurs')
    .select('role, est_actif')
    .eq('id', user.id)
    .single()

  if (dbError || !userRow) {
    return { ok: false, error: 'Utilisateur introuvable en base' }
  }

  if (userRow.role !== 'admin') {
    return { ok: false, error: 'Accès refusé — rôle admin requis' }
  }

  if (userRow.est_actif === false) {
    return { ok: false, error: 'Compte admin désactivé' }
  }

  return { ok: true, adminId: user.id }
}

/**
 * Vérifie qu'un utilisateur est un coursier authentifié.
 * Pour les routes /api/coursier/*
 */
export interface UserVerifyResult {
  ok:     boolean
  userId?: string
  role?:   string
  error?:  string
}

export async function verifyAuthUser(
  req: Request,
  expectedRole?: 'client' | 'coursier' | 'partenaire'
): Promise<UserVerifyResult> {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()

  if (!token) {
    return { ok: false, error: 'Token d\'authentification manquant' }
  }

  const supabaseCheck = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: { user }, error: authError } = await supabaseCheck.auth.getUser(token)
  if (authError || !user) {
    return { ok: false, error: 'Session invalide' }
  }

  if (expectedRole) {
    const { data: userRow } = await supabaseAdmin
      .from('utilisateurs')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userRow || userRow.role !== expectedRole) {
      return { ok: false, error: `Rôle ${expectedRole} requis` }
    }
    return { ok: true, userId: user.id, role: userRow.role }
  }

  return { ok: true, userId: user.id }
}