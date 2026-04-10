// src/app/api/admin/livraisons/route.ts  [NOUVEAU FICHIER]
// ══════════════════════════════════════════════════════════════════
// LISTE TOUTES LES LIVRAISONS — ADMIN NYME
// GET /api/admin/livraisons
//
// Query params :
//   statut       → filtre sur statut (ex: en_attente, acceptee, livree, annulee)
//   date_debut   → filtre date ISO (ex: 2025-01-01)
//   date_fin     → filtre date ISO (ex: 2025-12-31)
//   coursier_id  → UUID coursier
//   client_id    → UUID client
//   type         → immediate | urgente | programmee
//   search       → recherche sur adresse départ/arrivée (ILIKE)
//   page         → numéro de page (défaut: 1)
//   limit        → résultats par page (défaut: 20, max: 100)
//   order        → created_at | prix_final | statut (défaut: created_at)
//   direction    → asc | desc (défaut: desc)
// ══════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyAdminRole } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  try {
    // ── Authentification admin ────────────────────────────────────
    const auth = await verifyAdminRole(req)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

    // ── Lecture des query params ──────────────────────────────────
    const { searchParams } = new URL(req.url)

    const statut      = searchParams.get('statut')      || null
    const dateDeb     = searchParams.get('date_debut')  || null
    const dateFin     = searchParams.get('date_fin')    || null
    const coursierId  = searchParams.get('coursier_id') || null
    const clientId    = searchParams.get('client_id')   || null
    const type        = searchParams.get('type')        || null
    const search      = searchParams.get('search')      || null
    const orderCol    = searchParams.get('order')       || 'created_at'
    const direction   = searchParams.get('direction')   === 'asc' ? true : false

    const page  = Math.max(1, parseInt(searchParams.get('page')  || '1',  10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const from  = (page - 1) * limit
    const to    = from + limit - 1

    // Colonnes autorisées pour le tri
    const colsAutorisees = ['created_at', 'prix_final', 'statut', 'updated_at', 'livree_at']
    const col = colsAutorisees.includes(orderCol) ? orderCol : 'created_at'

    // ── Construction de la requête avec filtres ───────────────────
    let query = supabaseAdmin
      .from('livraisons')
      .select(`
        id,
        statut,
        type,
        depart_adresse,
        arrivee_adresse,
        prix_calcule,
        prix_final,
        commission_nyme,
        distance_km,
        statut_paiement,
        mode_paiement,
        pour_tiers,
        destinataire_nom,
        destinataire_tel,
        created_at,
        acceptee_at,
        livree_at,
        annulee_at,
        annulee_par,
        programme_le,
        client:client_id(id, nom, telephone, email, avatar_url),
        coursier:coursier_id(id, nom, telephone, note_moyenne)
      `, { count: 'exact' })

    // Filtres
    if (statut)     query = query.eq('statut', statut)
    if (coursierId) query = query.eq('coursier_id', coursierId)
    if (clientId)   query = query.eq('client_id', clientId)
    if (type)       query = query.eq('type', type)
    if (dateDeb)    query = query.gte('created_at', dateDeb)
    if (dateFin)    query = query.lte('created_at', dateFin + 'T23:59:59.999Z')
    if (search) {
      query = query.or(`depart_adresse.ilike.%${search}%,arrivee_adresse.ilike.%${search}%,destinataire_nom.ilike.%${search}%`)
    }

    // Tri + pagination
    query = query
      .order(col, { ascending: direction })
      .range(from, to)

    const { data: livraisons, count, error } = await query

    if (error) {
      console.error('[api/admin/livraisons]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // ── Calculs agrégés (pour la pagination) ─────────────────────
    const totalPages  = Math.ceil((count || 0) / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return NextResponse.json({
      success: true,
      data: livraisons || [],
      pagination: {
        total:       count || 0,
        page,
        limit,
        total_pages:  totalPages,
        has_next:     hasNextPage,
        has_prev:     hasPrevPage,
      },
      filtres: {
        statut, type, coursierId, clientId,
        date_debut: dateDeb, date_fin: dateFin,
        search,
      },
    })

  } catch (err: unknown) {
    console.error('[api/admin/livraisons] exception:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}