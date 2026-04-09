// src/app/api/user/update-profile/route.ts
// ══════════════════════════════════════════════════════════════════
// MISE À JOUR PROFIL UTILISATEUR — NYME
// PUT /api/user/update-profile
// ══════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function PUT(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const { nom, telephone, whatsapp, avatar_url, fcm_token } = body

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (nom        !== undefined) updateData.nom        = nom.trim()
    if (telephone  !== undefined) updateData.telephone  = telephone?.trim() || null
    if (whatsapp   !== undefined) updateData.whatsapp   = whatsapp?.trim()  || null
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url
    if (fcm_token  !== undefined) updateData.fcm_token  = fcm_token

    if (Object.keys(updateData).length === 1) {
      return NextResponse.json({ error: 'Au moins un champ à mettre à jour est requis' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('utilisateurs')
      .update(updateData)
      .eq('id', session.user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true, utilisateur: data })

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH — même comportement que PUT mais pour partial updates
export const PATCH = PUT