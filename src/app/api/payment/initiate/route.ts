// src/app/api/payment/initiate/route.ts
// ══════════════════════════════════════════════════════════════════
// INITIATION PAIEMENT UNIVERSEL — NYME
// POST /api/payment/initiate
// Fallback : DuniaPay → Flutterwave → Orange Money
// ══════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { paymentService, type PaymentMode } from '@/services/payment-service'

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const {
      livraison_id,
      mode,          // 'mobile_money' | 'carte' | 'wallet' | 'cash'
      phone,
      return_url,
    } = body

    if (!livraison_id || !mode) {
      return NextResponse.json({ error: 'livraison_id et mode requis' }, { status: 400 })
    }

    // Vérifier que la livraison appartient au client
    const { data: livraison, error: livErr } = await supabaseAdmin
      .from('livraisons')
      .select('id, client_id, prix_final, prix_calcule, statut, statut_paiement, mode_paiement')
      .eq('id', livraison_id)
      .eq('client_id', session.user.id)
      .single()

    if (livErr || !livraison) {
      return NextResponse.json({ error: 'Livraison introuvable' }, { status: 404 })
    }

    if (livraison.statut_paiement === 'paye') {
      return NextResponse.json({ error: 'Cette livraison est déjà payée' }, { status: 400 })
    }

    // Récupérer les infos du client
    const { data: utilisateur } = await supabaseAdmin
      .from('utilisateurs')
      .select('nom, email, telephone')
      .eq('id', session.user.id)
      .single()

    const montant = Number(livraison.prix_final || livraison.prix_calcule)

    // ── Mode WALLET ──────────────────────────────────────────────
    if (mode === 'wallet') {
      // Débiter le wallet directement
      const { data: wallet } = await supabaseAdmin
        .from('wallets')
        .select('id, solde')
        .eq('user_id', session.user.id)
        .single()

      if (!wallet || wallet.solde < montant) {
        return NextResponse.json({
          error: `Solde insuffisant (${wallet?.solde?.toLocaleString('fr-FR') || 0} FCFA disponible, ${montant.toLocaleString('fr-FR')} FCFA requis)`,
        }, { status: 400 })
      }

      // Débit wallet via RPC
      const ref = `WALLET_${livraison_id.replace(/-/g,'').slice(0,8)}_${Date.now()}`
      const { data: txId, error: rpcErr } = await supabaseAdmin.rpc('process_wallet_transaction', {
        p_user_id:        session.user.id,
        p_type:           'paiement_course',
        p_montant:        -montant,
        p_reference:      ref,
        p_livraison_id:   livraison_id,
        p_note:           `Paiement livraison #${livraison_id.slice(0,8).toUpperCase()} via wallet`,
        p_payment_method: 'wallet',
      })

      if (rpcErr) {
        return NextResponse.json({ error: `Erreur débit wallet : ${rpcErr.message}` }, { status: 500 })
      }

      // Mettre à jour la livraison
      await supabaseAdmin.from('livraisons').update({
        statut_paiement:       'paye',
        mode_paiement:         'wallet' as PaymentMode,
        payment_api_reference: ref,
        payment_api_status:    'success',
      }).eq('id', livraison_id)

      // Enregistrer paiement
      await supabaseAdmin.from('paiements').insert({
        livraison_id,
        montant,
        mode:      'wallet',
        reference: ref,
        statut:    'succes',
        paye_le:   new Date().toISOString(),
        metadata:  { tx_id: txId, provider: 'wallet' },
      })

      // Notification client
      await supabaseAdmin.from('notifications').insert({
        user_id: session.user.id,
        type:    'paiement',
        titre:   '✅ Paiement confirmé',
        message: `Paiement de ${montant.toLocaleString('fr-FR')} FCFA effectué via votre wallet.`,
        data:    { livraison_id, montant, mode: 'wallet' },
        lu:      false,
      })

      return NextResponse.json({
        success:      true,
        mode:         'wallet',
        provider:     'wallet',
        redirectUrl:  null,
        message:      `Paiement de ${montant.toLocaleString('fr-FR')} FCFA débité de votre wallet.`,
      })
    }

    // ── Mode CASH ────────────────────────────────────────────────
    if (mode === 'cash') {
      const ref = `CASH_${livraison_id.replace(/-/g,'').slice(0,8)}_${Date.now()}`
      await supabaseAdmin.from('livraisons').update({
        mode_paiement:         'cash',
        payment_api_reference: ref,
        payment_api_status:    'pending',
      }).eq('id', livraison_id)

      return NextResponse.json({
        success:  true,
        mode:     'cash',
        provider: null,
        message:  'Mode espèces sélectionné. Le paiement sera collecté lors de la livraison.',
      })
    }

    // ── Mode MOBILE MONEY / CARTE ────────────────────────────────
    const result = await paymentService.initPayment({
      livraisonId:  livraison_id,
      montant,
      mode:         mode as PaymentMode,
      clientId:     session.user.id,
      clientEmail:  utilisateur?.email || session.user.email || '',
      clientPhone:  phone || utilisateur?.telephone || '',
      clientName:   utilisateur?.nom || '',
      description:  `Livraison NYME #${livraison_id.slice(0,8)}`,
      returnUrl:    return_url || `${process.env.NEXT_PUBLIC_SITE_URL}/client/suivi/${livraison_id}?payment=success`,
      callbackUrl:  `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/callback`,
    })

    if (!result.success || !result.paymentUrl) {
      return NextResponse.json({
        error:    result.error || 'Échec initiation paiement',
        provider: result.provider,
      }, { status: 502 })
    }

    // Sauvegarder référence en attente
    await supabaseAdmin.from('livraisons').update({
      mode_paiement:         mode,
      payment_api_reference: result.externalRef || result.transactionId,
      payment_api_status:    'pending',
    }).eq('id', livraison_id)

    // Enregistrer paiement en attente
    await supabaseAdmin.from('paiements').insert({
      livraison_id,
      montant,
      mode,
      reference: result.externalRef || result.transactionId,
      statut:    'en_attente',
      metadata:  {
        provider:       result.provider,
        transaction_id: result.transactionId,
        external_ref:   result.externalRef,
      },
    })

    return NextResponse.json({
      success:     true,
      provider:    result.provider,
      paymentUrl:  result.paymentUrl,
      externalRef: result.externalRef,
    })

  } catch (err: unknown) {
    console.error('[api/payment/initiate]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}