// src/app/api/coursier/livraisons/statut/route.ts
// ═══════════════════════════════════════════════════════════════════════════
// CORRECTION AUDIT — Gestion des commissions :
//   Le trigger SQL calculate_and_add_commission (migration 003) se déclenche
//   sur UPDATE(statut, statut_paiement) avec statut='livree' ET statut_paiement='paye'.
//   Conflit : cette route appliquait aussi process_wallet_transaction manuellement.
//
//   SOLUTION RETENUE : Désactiver le trigger SQL pour les livraisons cash
//   (où statut_paiement reste 'en_attente' à la livraison).
//   Ce fichier reste la seule logique de commission pour les livraisons cash.
//   Pour les livraisons mobile_money/carte (statut_paiement='paye'), le trigger
//   s'active et cette route NE DOIT PAS dupliquer le calcul.
//
//   Règle : si mode_paiement !== 'cash', on ne crédite PAS ici
//   (le trigger SQL gère la commission après confirmation paiement).
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getGainCoursier } from '@/lib/tarifs'
import { firebaseNotificationService } from '@/services/firebase-notification-service'

// Utilise les valeurs exactes de la CHECK constraint SQL
// Note: 'en_rout_depart' SANS 'e' — orthographe réelle de la BDD
const STATUS_MESSAGES: Record<string, string> = {
  en_rout_depart:   '🛵 Le coursier est en route vers votre colis',
  colis_recupere:   '📦 Le coursier a récupéré votre colis',
  en_route_arrivee: '🚀 Votre colis est en route vers la destination',
  livree:           '🎉 Votre colis a été livré avec succès !',
  annulee:          '❌ Votre livraison a été annulée',
}

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

    const { data: livraison } = await supabaseAdmin
      .from('livraisons')
      .select('id, client_id, coursier_id, prix_final, prix_calcule, statut, type, mode_paiement, statut_paiement')
      .eq('id', livraison_id)
      .eq('coursier_id', coursier_id)
      .single()

    if (!livraison)
      return NextResponse.json({ error: 'Livraison non trouvée ou non assignée' }, { status: 404 })

    // Transitions autorisées — 'en_rout_depart' SANS 'e' = valeur SQL réelle
    const TRANSITIONS: Record<string, string[]> = {
      acceptee:         ['en_rout_depart', 'annulee'],
      en_rout_depart:   ['colis_recupere',  'annulee'],
      colis_recupere:   ['en_route_arrivee','annulee'],
      en_route_arrivee: ['livree',           'annulee'],
    }
    const allowed = TRANSITIONS[livraison.statut] || []
    if (!allowed.includes(statut))
      return NextResponse.json({
        error: `Transition ${livraison.statut} → ${statut} non autorisée`,
      }, { status: 400 })

    const updateData: Record<string, unknown> = { statut }

    // ────────────────────────────────────────────────────────────────────
    // Livraison confirmée
    // ────────────────────────────────────────────────────────────────────
    let gainCoursierFinal   = 0
    let commissionNymeFinal = 0

    if (statut === 'livree') {
      updateData.livree_at = new Date().toISOString()
      updateData.is_paid_to_courier = true

      const prixTotal   = Number(livraison.prix_final || livraison.prix_calcule)
      const typeCoarse  = (livraison.type || 'immediate') as 'immediate' | 'urgente' | 'programmee'
      const modePay     = livraison.mode_paiement || 'cash'

      const { gainCoursier, commissionNyme } = await getGainCoursier(prixTotal, typeCoarse)
      gainCoursierFinal   = gainCoursier
      commissionNymeFinal = commissionNyme
      updateData.commission_nyme = commissionNyme

      console.log(`[statut] livree — prix: ${prixTotal} | type: ${typeCoarse} | mode: ${modePay} | commission: ${commissionNyme} XOF | gain: ${gainCoursier} XOF`)

      // ── CORRECTION AUDIT : Éviter la double commission ────────────────
      // Le trigger SQL calculate_and_add_commission se déclenche quand :
      //   statut='livree' ET statut_paiement='paye'
      //
      // - Mode CASH : statut_paiement reste 'en_attente' → trigger NE se déclenche PAS
      //   → Cette route est responsable du crédit wallet coursier
      // - Mode mobile_money/carte : statut_paiement='paye' (après webhook paiement)
      //   → Le trigger SQL gère déjà la commission
      //   → Cette route NE doit PAS créditer à nouveau

      const isCash = modePay === 'cash' || modePay === 'wallet'
      const isAlreadyPaid = livraison.statut_paiement === 'paye'

      if (isCash && !isAlreadyPaid) {
        // 1. Créditer le gain net au coursier (UNIQUEMENT pour les paiements cash)
        const { data: txIdGain, error: gainErr } = await supabaseAdmin.rpc('process_wallet_transaction', {
          p_user_id:        coursier_id,
          p_type:           'gain',
          p_montant:        gainCoursier,
          p_note:           `Gain livraison #${livraison_id.slice(0, 8).toUpperCase()} — ${gainCoursier.toLocaleString('fr-FR')} XOF`,
          p_livraison_id:   livraison_id,
          p_reference:      `GAIN_CASH_${livraison_id}`,
          p_payment_method: 'cash',
        })
        if (gainErr) {
          console.error('[statut] gain coursier ECHEC:', gainErr.message, gainErr.code)
        } else {
          console.log('[statut] gain cash crédité, tx_id:', txIdGain)
        }

        // 2. Commission NYME (wallet admin)
        if (NYME_ADMIN_USER_ID && commissionNyme > 0) {
          const { error: commErr } = await supabaseAdmin.rpc('process_wallet_transaction', {
            p_user_id:        NYME_ADMIN_USER_ID,
            p_type:           'commission',
            p_montant:        commissionNyme,
            p_note:           `Commission fixe ${typeCoarse} — livraison #${livraison_id.slice(0, 8).toUpperCase()}`,
            p_livraison_id:   livraison_id,
            p_reference:      `COMMISSION_CASH_${livraison_id}`,
            p_payment_method: 'cash',
          })
          if (commErr) console.error('[statut] commission NYME ECHEC:', commErr.message)
        }

        // 3. Marquer comme payé pour les livraisons cash (paiement à la remise)
        updateData.statut_paiement = 'paye'

        // 4. Insérer le paiement
        await supabaseAdmin.from('paiements').insert({
          livraison_id,
          montant:   prixTotal,
          mode:      'cash',
          reference: `PAY_CASH_${livraison_id}`,
          statut:    'succes',
          paye_le:   new Date().toISOString(),
          metadata:  {
            gain_coursier:    gainCoursier,
            commission_nyme:  commissionNyme,
            type_commission:  'fixe',
            type_course:      typeCoarse,
            credite_par:      'route_statut_cash',
          },
        })
      } else if (!isCash && isAlreadyPaid) {
        // Paiement mobile money déjà traité par le webhook de paiement
        // Le trigger SQL s'est déjà chargé de la commission
        console.log('[statut] Livraison mobile money déjà payée — commission gérée par trigger SQL')
      } else {
        // Paiement mobile money en attente — ne créditer qu'après confirmation paiement
        console.log('[statut] Livraison mobile money en attente de paiement — pas de crédit wallet maintenant')
      }

      // 5. Mettre à jour les stats coursier
      const { data: coursierActuel } = await supabaseAdmin
        .from('coursiers')
        .select('total_courses, total_gains')
        .eq('id', coursier_id)
        .single()

      await supabaseAdmin.from('coursiers').update({
        statut:             'disponible',
        total_courses:      (coursierActuel?.total_courses || 0) + 1,
        total_gains:        (Number(coursierActuel?.total_gains) || 0) + (isCash ? gainCoursier : 0),
        derniere_activite:  new Date().toISOString(),
      }).eq('id', coursier_id)
    }

    // ── Annulation ─────────────────────────────────────────────────────────
    if (statut === 'annulee') {
      updateData.annulee_at  = new Date().toISOString()
      updateData.annulee_par = 'coursier'
      await supabaseAdmin.from('coursiers').update({
        statut:            'disponible',
        derniere_activite: new Date().toISOString(),
      }).eq('id', coursier_id)
    }

    // ── Mise à jour de la livraison ────────────────────────────────────────
    const { error: updateErr } = await supabaseAdmin
      .from('livraisons')
      .update(updateData)
      .eq('id', livraison_id)

    if (updateErr) {
      console.error('[statut] update livraison ECHEC:', updateErr.message)
      return NextResponse.json({ error: 'Erreur mise à jour livraison' }, { status: 500 })
    }

    // ── Historique des statuts ────────────────────────────────────────────
    await supabaseAdmin.from('statuts_livraison').insert({
      livraison_id,
      statut,
      note: `Statut mis à jour par coursier ${coursier_id.slice(0, 8)}`,
    })

    // ── Notification in-app au client ────────────────────────────────────
    const message = STATUS_MESSAGES[statut]
    if (message && livraison.client_id) {
      await supabaseAdmin.from('notifications').insert({
        user_id: livraison.client_id,
        type:    'statut_livraison',
        titre:   `Livraison #${livraison_id.slice(0, 8).toUpperCase()}`,
        message,
        data:    { livraison_id, statut },
        lu:      false,
      })

      // ── Notification push FCM au client ──────────────────────────────
      if (firebaseNotificationService.isConfigured()) {
        try {
          await firebaseNotificationService.sendToUser(
            livraison.client_id,
            {
              title: `Livraison #${livraison_id.slice(0, 8).toUpperCase()}`,
              body:  message,
              data:  { livraison_id, statut, type: 'statut_livraison' },
            },
            'statut_livraison'
          )
        } catch (fcmErr) {
          console.warn('[statut] Notification FCM client échouée:', fcmErr)
        }
      }
    }

    return NextResponse.json({
      success: true,
      statut,
      ...(statut === 'livree' ? {
        gain_coursier:   gainCoursierFinal,
        commission_nyme: commissionNymeFinal,
        type_commission: 'fixe',
      } : {}),
    })

  } catch (err: unknown) {
    console.error('[api/coursier/statut]', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Erreur serveur',
    }, { status: 500 })
  }
}