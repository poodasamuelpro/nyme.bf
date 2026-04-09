// src/app/api/client/adresses/route.ts
// ══════════════════════════════════════════════════════════════════
// CRUD ADRESSES FAVORITES CLIENT — NYME
// GET    → lister ses adresses favorites
// POST   → créer une adresse favorite
// PUT    → modifier une adresse favorite
// DELETE → supprimer une adresse favorite
// ══════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data, error } = await supabase
      .from('adresses_favorites')
      .select('*')
      .eq('user_id', session.user.id)
      .order('est_defaut', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ adresses: data || [] })

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { label, adresse, latitude, longitude, est_defaut = false } = await req.json()

    if (!label || !adresse) {
      return NextResponse.json({ error: 'label et adresse requis' }, { status: 400 })
    }

    // Si est_defaut, décocher les autres
    if (est_defaut) {
      await supabase
        .from('adresses_favorites')
        .update({ est_defaut: false })
        .eq('user_id', session.user.id)
        .eq('est_defaut', true)
    }

    const { data, error } = await supabase
      .from('adresses_favorites')
      .insert({
        user_id:   session.user.id,
        label:     label.trim(),
        adresse:   adresse.trim(),
        latitude:  latitude  || 12.3547,
        longitude: longitude || -1.5247,
        est_defaut,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, adresse: data }, { status: 201 })

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id, label, adresse, latitude, longitude, est_defaut } = await req.json()
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    // Vérifier la propriété
    const { data: existing } = await supabase
      .from('adresses_favorites')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Adresse introuvable' }, { status: 404 })

    if (est_defaut) {
      await supabase
        .from('adresses_favorites')
        .update({ est_defaut: false })
        .eq('user_id', session.user.id)
    }

    const updateData: Record<string, unknown> = {}
    if (label     !== undefined) updateData.label     = label.trim()
    if (adresse   !== undefined) updateData.adresse   = adresse.trim()
    if (latitude  !== undefined) updateData.latitude  = latitude
    if (longitude !== undefined) updateData.longitude = longitude
    if (est_defaut !== undefined) updateData.est_defaut = est_defaut

    const { data, error } = await supabase
      .from('adresses_favorites')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, adresse: data })

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const { error } = await supabase
      .from('adresses_favorites')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}