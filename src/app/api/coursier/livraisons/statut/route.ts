// src/app/api/coursier/livraisons/statut/route.ts
// VERSION COMPLÈTE : commission NYME 15% → compte société, gain coursier 85%, historique
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

const STATUS_MESSAGES: Record<string, string> = {
  en_rout_depart:   '🛵 Le coursier est en route vers votre colis',
  colis_recupere:   '📦 Le coursier a récupéré votre colis',
  en_route_arrivee: '🚀 Votre colis est en route vers la destination',
  livree:           '🎉 Votre colis a été livré avec succès !',
  annulee:          '❌ Votre livraison a été annulée',
}

// ID du compte NYME qui reçoit les commissions (configurable)
const NYME_ADMIN_USER_ID = process.env.NYME_ADMIN_USER_ID || null

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { livraison_id, statut, coursier_id } = await req.json()
    if (!livraison_id || !statut || !coursier_id)
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    if (coursier_id !== session.user.id)
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    // Vérifier que la livraison appartient bien à ce coursier
    const { data: livraison } = await supabaseAdmin
      .from('livraisons')
      .select('*, client_id, coursier_id, prix_final, prix_calcule, statut, statut_paiement, commission_nyme')
      .eq('id', livraison_id)
      .eq('coursier_id', coursier_id)
      .single()

    if (!livraison)
      return NextResponse.json({ error: 'Livraison non trouvée ou non assignée' }, { status: 404 })

    // Transitions de statut autorisées
    const TRANSITIONS: Record<string, string[]> = {
      acceptee:         ['en_rout_depart', 'annulee'],
      en_rout_depart:   ['colis_recupere', 'annulee'],
      colis_recupere:   ['en_route_arrivee', 'annulee'],
      en_route_arrivee: ['livree', 'annulee'],
    }
    const allowed = TRANSITIONS[livraison.statut] || []
    if (!allowed.includes(statut))
      return NextResponse.json({ error: `Transition ${livraison.statut} → ${statut} non autorisée` }, { status: 400 })

    const updateData: Record<string, unknown> = { statut }

    // ── Livraison confirmée : calculer et distribuer les gains ──
    if (statut === 'livree') {
      updateData.livree_at = new Date().toISOString()
      updateData.is_paid_to_courier = true

      const prixTotal = livraison.prix_final || livraison.prix_calcule
      const commissionPct = 0.15 // 15% NYME
      const commissionNyme = Math.round(prixTotal * commissionPct)
      const gainCoursier = prixTotal - commissionNyme

      updateData.commission_nyme = commissionNyme

      // 1. Créditer le gain net au coursier (85%)
      const { error: gainErr } = await supabaseAdmin.rpc('process_wallet_transaction', {
        p_user_id: coursier_id,
        p_type: 'gain',
        p_montant: gainCoursier,
        p_note: `Gain livraison #${livraison_id.slice(0, 8).toUpperCase()} — ${new Intl.NumberFormat('fr-FR').format(gainCoursier)} XOF`,
        p_livraison_id: livraison_id,
        p_reference: `GAIN_${livraison_id}`,
        p_payment_method: 'wallet',
      })
      if (gainErr) console.error('[statut] gain coursier:', gainErr.message)

      // 2. Créditer la commission NYME 15% vers le compte admin société
      if (NYME_ADMIN_USER_ID) {
        const { error: commErr } = await supabaseAdmin.rpc('process_wallet_transaction', {
          p_user_id: NYME_ADMIN_USER_ID,
          p_type: 'commission',
          p_montant: commissionNyme,
          p_note: `Commission 15% livraison #${livraison_id.slice(0, 8).toUpperCase()}`,
          p_livraison_id: livraison_id,
          p_reference: `COMMISSION_${livraison_id}`,
          p_payment_method: 'wallet',
        })
        if (commErr) console.error('[statut] commission NYME:', commErr.message)
      }

      // 3. Mettre à jour les stats du coursier
      const { data: coursierActuel } = await supabaseAdmin
        .from('coursiers').select('total_courses, total_gains').eq('id', coursier_id).single()

      await supabaseAdmin.from('coursiers').update({
        statut: 'disponible',
        total_courses: (coursierActuel?.total_courses || 0) + 1,
        total_gains: (coursierActuel?.total_gains || 0) + gainCoursier,
        derniere_activite: new Date().toISOString(),
      }).eq('id', coursier_id)

      // 4. Enregistrer le paiement
      await supabaseAdmin.from('paiements').insert({
        livraison_id,
        montant: prixTotal,
        mode: livraison.mode_paiement || 'cash',
        reference: `PAY_${livraison_id}`,
        statut: 'succes',
        paye_le: new Date().toISOString(),
        metadata: {
          gain_coursier: gainCoursier,
          commission_nyme: commissionNyme,
          taux_commission: commissionPct,
        },
      })
    }

    // ── Annulation ──
    if (statut === 'annulee') {
      updateData.annulee_at = new Date().toISOString()
      updateData.annulee_par = 'coursier'
      await supabaseAdmin.from('coursiers').update({
        statut: 'disponible',
        derniere_activite: new Date().toISOString(),
      }).eq('id', coursier_id)
    }

    // Mettre à jour la livraison
    await supabaseAdmin.from('livraisons').update(updateData).eq('id', livraison_id)

    // Historique statut
    await supabaseAdmin.from('statuts_livraison').insert({
      livraison_id,
      statut,
      note: `Statut mis à jour par coursier`,
    })

    // Notification client
    const message = STATUS_MESSAGES[statut]
    if (message) {
      await supabaseAdmin.from('notifications').insert({
        user_id: livraison.client_id,
        type: 'statut_livraison',
        titre: `Livraison #${livraison_id.slice(0, 8).toUpperCase()}`,
        message,
        data: { livraison_id, statut },
        lu: false,
      })
    }

    return NextResponse.json({
      success: true,
      statut,
      ...(statut === 'livree' ? {
        gain_coursier: (livraison.prix_final || livraison.prix_calcule) * 0.85,
        commission_nyme: (livraison.prix_final || livraison.prix_calcule) * 0.15,
      } : {}),
    })
  } catch (err: unknown) {
    console.error('[api/coursier/statut]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}
