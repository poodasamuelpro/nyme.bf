// src/app/api/client/livraisons/payer-wallet/route.ts
// ══════════════════════════════════════════════════════════════════
// PAIEMENT PAR WALLET — NYME
// POST /api/client/livraisons/payer-wallet
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

    const { livraison_id } = await req.json()
    if (!livraison_id) return NextResponse.json({ error: 'livraison_id requis' }, { status: 400 })

    // Vérifier la livraison
    const { data: livraison, error: livErr } = await supabaseAdmin
      .from('livraisons')
      .select('id, client_id, prix_final, prix_calcule, statut_paiement, statut')
      .eq('id', livraison_id)
      .eq('client_id', session.user.id)
      .single()

    if (livErr || !livraison) {
      return NextResponse.json({ error: 'Livraison introuvable' }, { status: 404 })
    }

    if (livraison.statut_paiement === 'paye') {
      return NextResponse.json({ error: 'Déjà payé' }, { status: 400 })
    }

    const montant = Number(livraison.prix_final || livraison.prix_calcule)

    // Vérifier le solde wallet
    const { data: wallet, error: walletErr } = await supabaseAdmin
      .from('wallets')
      .select('id, solde')
      .eq('user_id', session.user.id)
      .single()

    if (walletErr || !wallet) {
      return NextResponse.json({ error: 'Wallet introuvable — rechargez d\'abord votre wallet' }, { status: 400 })
    }

    if (wallet.solde < montant) {
      return NextResponse.json({
        error:     'Solde insuffisant',
        solde:     wallet.solde,
        requis:    montant,
        manquant:  montant - wallet.solde,
      }, { status: 400 })
    }

    // Générer référence idempotente
    const ref = `WL_PAY_${livraison_id.replace(/-/g,'').slice(0,8)}_${Date.now()}`

    // Vérifier idempotence
    const { data: existingTx } = await supabaseAdmin
      .from('transactions_wallet')
      .select('id')
      .eq('reference', ref)
      .single()

    if (existingTx) {
      return NextResponse.json({ error: 'Transaction déjà effectuée', idempotent: true }, { status: 409 })
    }

    // Débiter le wallet via RPC
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
      mode_paiement:         'wallet' as 'cash' | 'mobile_money' | 'carte',
      payment_api_reference: ref,
      payment_api_status:    'success',
    }).eq('id', livraison_id)

    // Enregistrer dans paiements
    await supabaseAdmin.from('paiements').insert({
      livraison_id,
      montant,
      mode:      'wallet' as 'cash' | 'mobile_money' | 'carte',
      reference: ref,
      statut:    'succes',
      paye_le:   new Date().toISOString(),
      metadata:  { tx_id: txId, provider: 'wallet', solde_avant: wallet.solde, solde_apres: wallet.solde - montant },
    })

    // Notification
    await supabaseAdmin.from('notifications').insert({
      user_id: session.user.id,
      type:    'paiement',
      titre:   '✅ Paiement par wallet effectué',
      message: `${montant.toLocaleString('fr-FR')} FCFA débités de votre wallet pour la livraison #${livraison_id.slice(0,8).toUpperCase()}.`,
      data:    { livraison_id, montant, tx_id: txId },
      lu:      false,
    })

    return NextResponse.json({
      success:       true,
      transaction_id: txId,
      montant,
      solde_restant: wallet.solde - montant,
      message:       `${montant.toLocaleString('fr-FR')} FCFA débités avec succès.`,
    })

  } catch (err: unknown) {
    console.error('[api/client/livraisons/payer-wallet]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}