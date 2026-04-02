// src/app/api/admin/valider-coursier/route.ts
// Valide ou rejette les documents d'un coursier
// Admin seulement

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    // Auth admin
    const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const supabaseCheck = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: { user: caller } } = await supabaseCheck.auth.getUser(token)
    if (!caller) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: callerRow } = await supabaseAdmin
      .from('utilisateurs').select('role').eq('id', caller.id).single()
    if (callerRow?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { coursier_id, statut_verification, motif } = await req.json()

    if (!coursier_id || !statut_verification) {
      return NextResponse.json({ error: 'coursier_id et statut_verification requis' }, { status: 400 })
    }

    const statutsValides = ['en_attente', 'verifie', 'rejete']
    if (!statutsValides.includes(statut_verification)) {
      return NextResponse.json({ error: `Statut invalide. Valeurs: ${statutsValides.join(', ')}` }, { status: 400 })
    }

    // Mettre à jour le coursier
    const updateData: Record<string, any> = {
      statut_verification,
      updated_at: new Date().toISOString(),
    }

    // Si vérifié, activer aussi le statut disponible
    if (statut_verification === 'verifie') {
      updateData.statut = 'disponible'
    }

    const { data, error: updErr } = await supabaseAdmin
      .from('coursiers')
      .update(updateData)
      .eq('id', coursier_id)
      .select()
      .single()

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 400 })
    }

    // Notifier le coursier
    try {
      const notifMap: Record<string, { titre: string; message: string }> = {
        verifie: {
          titre:   '✅ Documents vérifiés',
          message: 'Félicitations ! Vos documents ont été vérifiés. Vous pouvez maintenant accepter des courses.',
        },
        rejete: {
          titre:   '❌ Documents rejetés',
          message: `Vos documents n'ont pas pu être validés.${motif ? ` Motif : ${motif}` : ''} Veuillez contacter nyme.contact@gmail.com.`,
        },
      }
      const notif = notifMap[statut_verification]
      if (notif) {
        await supabaseAdmin.from('notifications').insert({
          user_id:    coursier_id,
          type:       'verification_documents',
          titre:      notif.titre,
          message:    notif.message,
          lu:         false,
          created_at: new Date().toISOString(),
        })
      }
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Coursier ${statut_verification === 'verifie' ? 'vérifié' : 'rejeté'} avec succès`,
      coursier: data,
    })

  } catch (err: any) {
    console.error('[valider-coursier]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
