// src/app/api/client/wallet/recharger/route.ts — NOUVEAU FICHIER
// Initie une recharge du wallet client via paiement mobile money / carte
// POST /api/client/wallet/recharger
// Fallback : DuniaPay → Flutterwave → Orange Money
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

    const { data: utilisateur } = await supabaseAdmin
      .from('utilisateurs')
      .select('id, nom, email, telephone, role')
      .eq('id', session.user.id)
      .single()

    if (!utilisateur || utilisateur.role !== 'client') {
      return NextResponse.json({ error: 'Accès réservé aux clients' }, { status: 403 })
    }

    const body = await req.json()
    const { montant, mode, phone, return_url } = body

    // Validations
    if (!montant || isNaN(Number(montant))) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
    }
    const montantNum = Number(montant)
    if (montantNum < 500) {
      return NextResponse.json({ error: 'Montant minimum 500 XOF' }, { status: 400 })
    }
    if (montantNum > 500_000) {
      return NextResponse.json({ error: 'Montant maximum 500 000 XOF par transaction' }, { status: 400 })
    }

    const modeValide: PaymentMode[] = ['mobile_money', 'carte']
    if (!mode || !modeValide.includes(mode as PaymentMode)) {
      return NextResponse.json({ error: `Mode invalide. Valeurs: ${modeValide.join(', ')}` }, { status: 400 })
    }

    // Générer un ID de transaction unique pour la recharge
    const rechargeId = `rech_${session.user.id.replace(/-/g, '').slice(0, 8)}_${Date.now()}`
    const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL || 'https://nyme.bf'

    // Initier le paiement via PaymentService
    const result = await paymentService.initPayment({
      livraisonId:  rechargeId,   // champ réutilisé comme identifiant unique de la recharge
      montant:      montantNum,
      mode:         mode as PaymentMode,
      clientId:     session.user.id,
      clientEmail:  utilisateur.email || session.user.email || '',
      clientPhone:  phone || utilisateur.telephone || '',
      clientName:   utilisateur.nom || 'Client NYME',
      description:  `Recharge wallet NYME — ${montantNum.toLocaleString('fr-FR')} XOF`,
      returnUrl:    return_url || `${siteUrl}/client/wallet?recharge=success&montant=${montantNum}`,
      callbackUrl:  `${siteUrl}/api/payment/wallet-recharge/callback?user_id=${session.user.id}&montant=${montantNum}`,
    })

    if (!result.success || !result.paymentUrl) {
      return NextResponse.json({
        error:    result.error || 'Échec initiation paiement',
        provider: result.provider,
      }, { status: 502 })
    }

    // Enregistrer la tentative de recharge (pour tracking)
    try {
      await supabaseAdmin.from('transactions_wallet').insert({
        user_id:          session.user.id,
        type:             'recharge',
        montant:          montantNum,
        solde_avant:      0,        // sera mis à jour au callback
        solde_apres:      0,        // sera mis à jour au callback
        reference:        result.externalRef || result.transactionId,
        note:             `Recharge wallet via ${mode} — ref: ${result.externalRef || result.transactionId}`,
        status:           'pending',
        payment_method:   mode as 'mobile_money' | 'carte',
        idempotency_key:  rechargeId,
      })
    } catch {
      // Non bloquant — le callback mettra à jour
    }

    return NextResponse.json({
      success:     true,
      provider:    result.provider,
      paymentUrl:  result.paymentUrl,
      externalRef: result.externalRef,
      montant:     montantNum,
      message:     `Redirection vers le paiement ${result.provider}`,
    })

  } catch (err: unknown) {
    console.error('[api/client/wallet/recharger]', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Erreur serveur',
    }, { status: 500 })
  }
}