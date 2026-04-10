// src/app/api/calls/route.ts
// ═══════════════════════════════════════════════════════════════════════════
// API REST pour les appels WebRTC — NYME
// GET  /api/calls?user_id=xxx          → historique des appels
// POST /api/calls                      → créer un appel (signalisation)
// PATCH /api/calls                     → mettre à jour statut / SDP
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ── GET : Historique des appels ───────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const userId = session.user.id
    const url    = new URL(req.url)
    const limit  = parseInt(url.searchParams.get('limit') || '20')

    const { data, error } = await supabaseAdmin
      .from('calls_webrtc')
      .select(`
        id, statut, duree_secondes, debut_at, fin_at, created_at,
        livraison_id, appelant_role,
        appelant:appelant_id(id, nom, avatar_url),
        destinataire:destinataire_id(id, nom, avatar_url)
      `)
      .or(`appelant_id.eq.${userId},destinataire_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({ success: true, calls: data || [] })
  } catch (err) {
    console.error('[api/calls GET]', err)
    return NextResponse.json({ error: 'Erreur récupération appels' }, { status: 500 })
  }
}

// ── POST : Créer un appel (initiation côté serveur optionnelle) ──────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const { destinataire_id, livraison_id, offer_sdp } = body

    if (!destinataire_id) {
      return NextResponse.json({ error: 'destinataire_id requis' }, { status: 400 })
    }

    // Vérifier que le destinataire existe
    const { data: dest } = await supabaseAdmin
      .from('utilisateurs')
      .select('id, role')
      .eq('id', destinataire_id)
      .single()

    if (!dest) {
      return NextResponse.json({ error: 'Destinataire introuvable' }, { status: 404 })
    }

    // Récupérer le rôle de l'appelant
    const { data: appelant } = await supabaseAdmin
      .from('utilisateurs')
      .select('role')
      .eq('id', session.user.id)
      .single()

    // Créer l'appel
    const { data: call, error } = await supabaseAdmin
      .from('calls_webrtc')
      .insert({
        appelant_id:     session.user.id,
        appelant_role:   appelant?.role || 'client',
        destinataire_id,
        livraison_id:    livraison_id || null,
        statut:          'en_attente',
        offer_sdp:       offer_sdp ? JSON.stringify(offer_sdp) : null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, call })
  } catch (err) {
    console.error('[api/calls POST]', err)
    return NextResponse.json({ error: 'Erreur création appel' }, { status: 500 })
  }
}

// ── PATCH : Mettre à jour un appel (statut, answer SDP, etc.) ────────────────

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body   = await req.json()
    const { call_id, statut, answer_sdp, debut_at, fin_at } = body

    if (!call_id) {
      return NextResponse.json({ error: 'call_id requis' }, { status: 400 })
    }

    // Vérifier que l'utilisateur est participant de cet appel
    const { data: existingCall } = await supabaseAdmin
      .from('calls_webrtc')
      .select('id, appelant_id, destinataire_id, statut')
      .eq('id', call_id)
      .single()

    if (!existingCall) {
      return NextResponse.json({ error: 'Appel introuvable' }, { status: 404 })
    }

    const isParticipant = existingCall.appelant_id === session.user.id ||
                          existingCall.destinataire_id === session.user.id
    if (!isParticipant) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    if (statut)     updateData.statut     = statut
    if (answer_sdp) updateData.answer_sdp = JSON.stringify(answer_sdp)
    if (debut_at)   updateData.debut_at   = debut_at
    if (fin_at)     updateData.fin_at     = fin_at

    const { data: updated, error } = await supabaseAdmin
      .from('calls_webrtc')
      .update(updateData)
      .eq('id', call_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, call: updated })
  } catch (err) {
    console.error('[api/calls PATCH]', err)
    return NextResponse.json({ error: 'Erreur mise à jour appel' }, { status: 500 })
  }
}