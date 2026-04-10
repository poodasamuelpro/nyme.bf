// src/app/api/user/bloquer/route.ts  [NOUVEAU FICHIER]
// ══════════════════════════════════════════════════════════════════
// BLOCAGE UTILISATEUR — NYME
// POST /api/user/bloquer   → Bloquer un utilisateur
// DELETE /api/user/bloquer → Débloquer (body: { bloque_id })
// GET /api/user/bloquer    → Lister ses blocages
//
// Utilise la table `blocages` (migration 012)
// ══════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyAuthUser } from '@/lib/auth-middleware'

// ── POST — Bloquer un utilisateur ────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthUser(req)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

    const bloqueurId = auth.userId!

    const { bloque_id, motif } = await req.json()

    if (!bloque_id) {
      return NextResponse.json({ error: 'bloque_id requis' }, { status: 400 })
    }

    if (bloque_id === bloqueurId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas vous bloquer vous-même' }, { status: 400 })
    }

    // Vérifier que l'utilisateur à bloquer existe
    const { data: userCible } = await supabaseAdmin
      .from('utilisateurs')
      .select('id, nom, role')
      .eq('id', bloque_id)
      .single()

    if (!userCible) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    // Vérifier si déjà bloqué (idempotence)
    const { data: existant } = await supabaseAdmin
      .from('blocages')
      .select('id')
      .eq('bloqueur_id', bloqueurId)
      .eq('bloque_id', bloque_id)
      .single()

    if (existant) {
      return NextResponse.json({
        success: true,
        message: `${userCible.nom} est déjà bloqué`,
        deja_bloque: true,
      })
    }

    // Insérer dans la table blocages
    const { data: blocage, error: insErr } = await supabaseAdmin
      .from('blocages')
      .insert({
        bloqueur_id: bloqueurId,
        bloque_id,
        motif:       motif || null,
        created_at:  new Date().toISOString(),
      })
      .select()
      .single()

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${userCible.nom} a été bloqué avec succès`,
      blocage,
    }, { status: 201 })

  } catch (err: unknown) {
    console.error('[api/user/bloquer POST]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}

// ── DELETE — Débloquer un utilisateur ────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAuthUser(req)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

    const bloqueurId = auth.userId!
    const { bloque_id } = await req.json()

    if (!bloque_id) {
      return NextResponse.json({ error: 'bloque_id requis' }, { status: 400 })
    }

    const { error: delErr, count } = await supabaseAdmin
      .from('blocages')
      .delete({ count: 'exact' })
      .eq('bloqueur_id', bloqueurId)
      .eq('bloque_id', bloque_id)

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    if (!count || count === 0) {
      return NextResponse.json({ error: 'Blocage introuvable' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Utilisateur débloqué' })

  } catch (err: unknown) {
    console.error('[api/user/bloquer DELETE]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}

// ── GET — Lister ses blocages ──────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthUser(req)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

    const bloqueurId = auth.userId!

    const { data: blocages, error } = await supabaseAdmin
      .from('blocages')
      .select(`
        id,
        bloque_id,
        motif,
        created_at,
        bloque:bloque_id(id, nom, avatar_url, role)
      `)
      .eq('bloqueur_id', bloqueurId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      blocages: blocages || [],
      total: (blocages || []).length,
    })

  } catch (err: unknown) {
    console.error('[api/user/bloquer GET]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}