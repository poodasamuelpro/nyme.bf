// src/app/api/admin/clients/route.ts — MODIFIÉ
// ═══════════════════════════════════════════════════════════════════════════
// CORRECTIONS AUDIT :
//   1. Remplacement de la vérification admin dupliquée par verifyAdminRole()
//   2. Ajout de la pagination (limit + offset) sur la liste des clients
//   3. Retour du total réel en base (count) au lieu de clients.length
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyAdminRole } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(req)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const role   = searchParams.get('role')   || 'client'
    const limit  = Math.min(parseInt(searchParams.get('limit')  || '50'), 200)  // max 200
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || ''

    // Requête avec pagination et count total
    let query = supabaseAdmin
      .from('utilisateurs')
      .select(
        'id, nom, email, telephone, role, est_actif, est_verifie, created_at, avatar_url, note_moyenne',
        { count: 'exact' }
      )
      .eq('role', role)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filtrage par nom ou email si recherche
    if (search.trim()) {
      query = query.or(`nom.ilike.%${search}%,email.ilike.%${search}%,telephone.ilike.%${search}%`)
    }

    const { data: clients, error, count } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({
      clients:      clients || [],
      total:        count ?? 0,
      actifs:       clients?.filter(c => c.est_actif).length || 0,
      page_size:    limit,
      page_offset:  offset,
      has_more:     (count ?? 0) > offset + limit,
    })

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(req)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

    const { user_id, est_actif } = await req.json()
    if (!user_id || typeof est_actif !== 'boolean') {
      return NextResponse.json({ error: 'user_id et est_actif (boolean) requis' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('utilisateurs')
      .update({ est_actif, updated_at: new Date().toISOString() })
      .eq('id', user_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Notifier l'utilisateur de la suspension/réactivation
    await supabaseAdmin.from('notifications').insert({
      user_id,
      type:    'compte',
      titre:   est_actif ? '✅ Compte réactivé' : '⚠️ Compte suspendu',
      message: est_actif
        ? 'Votre compte NYME a été réactivé. Bienvenue à nouveau !'
        : 'Votre compte NYME a été temporairement suspendu. Contactez le support.',
      lu:      false,
    })

    return NextResponse.json({
      success:      true,
      message:      `Utilisateur ${est_actif ? 'activé' : 'désactivé'}`,
      utilisateur:  data,
    })

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}