// src/app/api/client/livraisons/annuler/route.ts
// ══════════════════════════════════════════════════════════════════
// ANNULATION LIVRAISON CLIENT — NYME
// POST /api/client/livraisons/annuler
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

    const { livraison_id, motif } = await req.json()
    if (!livraison_id) return NextResponse.json({ error: 'livraison_id requis' }, { status: 400 })

    // Vérifier que la livraison appartient au client
    const { data: livraison, error: livErr } = await supabaseAdmin
      .from('livraisons')
      .select('id, client_id, coursier_id, statut, statut_paiement, prix_final, prix_calcule, mode_paiement')
      .eq('id', livraison_id)
      .eq('client_id', session.user.id)
      .single()

    if (livErr || !livraison) {
      return NextResponse.json({ error: 'Livraison introuvable' }, { status: 404 })
    }

    // Seules les livraisons en_attente ou acceptee peuvent être annulées par le client
    if (!['en_attente', 'acceptee'].includes(livraison.statut)) {
      return NextResponse.json({
        error: `Impossible d'annuler une livraison avec le statut "${livraison.statut}". Seules les livraisons en attente ou acceptées peuvent être annulées.`,
      }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Annuler la livraison
    const { error: updateErr } = await supabaseAdmin
      .from('livraisons')
      .update({
        statut:     'annulee',
        annulee_at: now,
        annulee_par: 'client',
      })
      .eq('id', livraison_id)

    if (updateErr) {
      return NextResponse.json({ error: `Erreur annulation : ${updateErr.message}` }, { status: 500 })
    }

    // Historique
    await supabaseAdmin.from('statuts_livraison').insert({
      livraison_id,
      statut:    'annulee',
      note:      motif ? `Annulé par le client : ${motif}` : 'Annulé par le client',
      changed_at: now,
    })

    // Libérer le coursier si assigné
    if (livraison.coursier_id) {
      await supabaseAdmin.from('coursiers').update({
        statut:            'disponible',
        derniere_activite: now,
      }).eq('id', livraison.coursier_id)

      // Notifier le coursier
      await supabaseAdmin.from('notifications').insert({
        user_id: livraison.coursier_id,
        type:    'annulation_livraison',
        titre:   '❌ Livraison annulée',
        message: motif
          ? `Le client a annulé la livraison #${livraison_id.slice(0,8).toUpperCase()}. Motif : ${motif}`
          : `Le client a annulé la livraison #${livraison_id.slice(0,8).toUpperCase()}.`,
        data:    { livraison_id },
        lu:      false,
      })
    }

    // Rejeter toutes les propositions de prix en attente
    await supabaseAdmin
      .from('propositions_prix')
      .update({ statut: 'refuse' })
      .eq('livraison_id', livraison_id)
      .eq('statut', 'en_attente')

    // Remboursement si paiement wallet
    let remboursementEffectue = false
    if (livraison.statut_paiement === 'paye' && livraison.mode_paiement === 'wallet') {
      const montant = Number(livraison.prix_final || livraison.prix_calcule)
      const ref     = `REFUND_${livraison_id.replace(/-/g,'').slice(0,8)}_${Date.now()}`

      const { error: refundErr } = await supabaseAdmin.rpc('process_wallet_transaction', {
        p_user_id:        session.user.id,
        p_type:           'remboursement',
        p_montant:        montant,   // positif = crédit
        p_reference:      ref,
        p_livraison_id:   livraison_id,
        p_note:           `Remboursement annulation livraison #${livraison_id.slice(0,8).toUpperCase()}`,
        p_payment_method: 'wallet',
      })

      if (!refundErr) {
        await supabaseAdmin.from('livraisons').update({ statut_paiement: 'rembourse' }).eq('id', livraison_id)
        remboursementEffectue = true
      }
    }

    // Notification client
    await supabaseAdmin.from('notifications').insert({
      user_id: session.user.id,
      type:    'annulation_livraison',
      titre:   '❌ Livraison annulée',
      message: remboursementEffectue
        ? `Votre livraison #${livraison_id.slice(0,8).toUpperCase()} a été annulée. Le remboursement a été crédité sur votre wallet.`
        : `Votre livraison #${livraison_id.slice(0,8).toUpperCase()} a été annulée.`,
      data:    { livraison_id, remboursement: remboursementEffectue },
      lu:      false,
    })

    return NextResponse.json({
      success:                 true,
      message:                 'Livraison annulée avec succès',
      remboursement_effectue:  remboursementEffectue,
    })

  } catch (err: unknown) {
    console.error('[api/client/livraisons/annuler]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}