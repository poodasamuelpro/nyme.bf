// src/app/api/payment/wallet-recharge/callback/route.ts — NOUVEAU FICHIER
// Callback de confirmation de recharge wallet (appelé par DuniaPay / Flutterwave / Orange)
// POST /api/payment/wallet-recharge/callback?user_id=xxx&montant=xxx
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { paymentService, type PaymentProvider } from '@/services/payment-service'

export async function POST(req: NextRequest) {
  try {
    const url     = new URL(req.url)
    const userId  = url.searchParams.get('user_id')
    const montant = parseFloat(url.searchParams.get('montant') || '0')

    if (!userId || !montant || montant <= 0) {
      return NextResponse.json({ error: 'Paramètres manquants ou invalides' }, { status: 400 })
    }

    const body        = await req.text()
    const payload     = JSON.parse(body) as Record<string, unknown>
    const provider    = (url.searchParams.get('provider') || payload.provider || 'duniapay') as PaymentProvider
    const externalRef = (payload.reference || payload.tx_ref || payload.order_id || '') as string

    // Vérifier le statut du paiement auprès du provider
    let paymentVerified = false

    if (provider && externalRef) {
      const verification = await paymentService.verifyPayment(provider, externalRef)
      paymentVerified = verification.success && verification.status === 'success'
    } else {
      // Si pas de vérification possible, faire confiance au callback (non recommandé en prod)
      paymentVerified = !!(payload.status && ['success', 'successful', 'completed'].includes(String(payload.status).toLowerCase()))
    }

    if (!paymentVerified) {
      console.warn('[wallet-recharge/callback] Paiement non confirmé:', { userId, montant, provider, payload })
      return NextResponse.json({ success: false, message: 'Paiement non confirmé' }, { status: 200 })
    }

    // Vérifier que l'utilisateur existe et est un client
    const { data: user } = await supabaseAdmin
      .from('utilisateurs').select('id, role').eq('id', userId).single()
    if (!user || user.role !== 'client') {
      return NextResponse.json({ error: 'Utilisateur introuvable ou rôle incorrect' }, { status: 404 })
    }

    // Idempotence — vérifier si cette transaction n'a pas déjà été traitée
    const ref = externalRef || `RECH_${userId.slice(0,8)}_${Date.now()}`
    const { data: existingTx } = await supabaseAdmin
      .from('transactions_wallet')
      .select('id')
      .eq('reference', ref)
      .eq('status', 'completed')
      .single()

    if (existingTx) {
      console.log('[wallet-recharge/callback] Transaction déjà traitée:', ref)
      return NextResponse.json({ success: true, message: 'Transaction déjà traitée', idempotent: true })
    }

    // Créditer le wallet via la fonction RPC Supabase
    const { data: txId, error: rpcErr } = await supabaseAdmin.rpc('process_wallet_transaction', {
      p_user_id:        userId,
      p_type:           'recharge',
      p_montant:        montant,   // positif = crédit
      p_reference:      ref,
      p_livraison_id:   null,
      p_note:           `Recharge wallet via ${provider} — ${montant.toLocaleString('fr-FR')} XOF`,
      p_payment_method: provider === 'wallet' ? 'wallet' : 'mobile_money',
    })

    if (rpcErr) {
      console.error('[wallet-recharge/callback] RPC error:', rpcErr)
      return NextResponse.json({ error: `Erreur crédit wallet : ${rpcErr.message}` }, { status: 500 })
    }

    // Envoyer notification in-app
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type:    'paiement',
      titre:   '💳 Wallet rechargé !',
      message: `${montant.toLocaleString('fr-FR')} XOF ont été ajoutés à votre wallet NYME.`,
      data:    { montant, provider, transaction_id: txId, reference: ref },
      lu:      false,
    })

    console.log('[wallet-recharge/callback] Wallet crédité:', { userId, montant, provider, txId })

    return NextResponse.json({
      success: true,
      transaction_id: txId,
      montant,
      message: `Wallet crédité de ${montant.toLocaleString('fr-FR')} XOF`,
    })

  } catch (err: unknown) {
    console.error('[api/payment/wallet-recharge/callback]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}

// GET — Pour les redirections web après paiement réussi (DuniaPay redirect)
export async function GET(req: NextRequest) {
  const url      = new URL(req.url)
  const montant  = url.searchParams.get('montant') || '0'
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL || 'https://nyme.bf'
  return NextResponse.redirect(`${siteUrl}/client/wallet?recharge=success&montant=${montant}`)
}