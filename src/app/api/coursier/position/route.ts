// src/app/api/coursier/position/route.ts
// ══════════════════════════════════════════════════════════════════
// MISE À JOUR POSITION GPS COURSIER — NYME
// POST /api/coursier/position
// ══════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { latitude, longitude, vitesse, direction, livraison_id } = await req.json()

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'latitude et longitude requis' }, { status: 400 })
    }

    // Vérifier que l'utilisateur est bien un coursier
    const { data: coursier } = await supabaseAdmin
      .from('coursiers')
      .select('id, statut')
      .eq('id', session.user.id)
      .single()

    if (!coursier) {
      return NextResponse.json({ error: 'Profil coursier introuvable' }, { status: 403 })
    }

    // Insérer la position GPS
    await supabaseAdmin.from('localisation_coursier').insert({
      coursier_id:  session.user.id,
      livraison_id: livraison_id || null,
      latitude,
      longitude,
      vitesse:      vitesse   || null,
      direction:    direction || null,
    })

    // Mettre à jour la position dans la table coursiers (dernière position connue)
    await supabaseAdmin.from('coursiers').update({
      lat_actuelle:      latitude,
      lng_actuelle:      longitude,
      derniere_activite: new Date().toISOString(),
    }).eq('id', session.user.id)

    return NextResponse.json({ success: true })

  } catch (err: unknown) {
    console.error('[api/coursier/position]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}