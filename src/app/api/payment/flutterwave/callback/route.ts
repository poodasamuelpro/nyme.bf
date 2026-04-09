// src/app/api/payment/flutterwave/callback/route.ts
// ══════════════════════════════════════════════════════════════════
// WEBHOOK FLUTTERWAVE — NYME
// POST /api/payment/flutterwave/callback
// ══════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { paymentService } from '@/services/payment-service'

export async function POST(req: NextRequest) {
  try {
    const rawBody   = await req.text()
    const signature = req.headers.get('verif-hash') || req.headers.get('x-flutterwave-signature') || ''

    // Vérifier la signature
    if (!paymentService.verifyFlutterwaveWebhook(rawBody, signature)) {
      console.warn('[FW Webhook] Signature invalide')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(rawBody) as {
      event: string
      data: {
        tx_ref: string
        id: number
        status: string
        amount: number
        currency: string
        meta?: { livraison_id?: string; client_id?: string }
      }
    }

    if (event.event !== 'charge.completed') {
      return NextResponse.json({ received: true })
    }

    const { tx_ref, status, amount, meta } = event.data
    const livraisonId = meta?.livraison_id

    if (!livraisonId) {
      console.warn('[FW Webhook] Pas de livraison_id dans meta')
      return NextResponse.json({ received: true })
    }

    if (status === 'successful') {
      // Marquer la livraison comme payée
      await supabaseAdmin.from('livraisons').update({
        statut_paiement:    'paye',
        payment_api_status: 'success',
      }).eq('id', livraisonId)

      // Mettre à jour le paiement
      await supabaseAdmin.from('paiements')
        .update({ statut: 'succes', paye_le: new Date().toISOString(), metadata: event.data as unknown as Record<string, unknown> })
        .eq('reference', tx_ref)

      // Récupérer la livraison pour notifier
      const { data: liv } = await supabaseAdmin
        .from('livraisons').select('client_id, coursier_id').eq('id', livraisonId).single()

      if (liv?.client_id) {
        await supabaseAdmin.from('notifications').insert({
          user_id: liv.client_id,
          type:    'paiement',
          titre:   '✅ Paiement confirmé — Flutterwave',
          message: `Paiement de ${amount.toLocaleString('fr-FR')} FCFA confirmé.`,
          data:    { livraison_id: livraisonId, amount, provider: 'flutterwave', tx_ref },
          lu:      false,
        })
      }

      console.log(`[FW Webhook] ✅ Paiement confirmé : ${tx_ref} — ${amount} XOF`)
    } else {
      await supabaseAdmin.from('livraisons').update({ payment_api_status: 'failed' }).eq('id', livraisonId)
      await supabaseAdmin.from('paiements').update({ statut: 'echec' }).eq('reference', tx_ref)
      console.warn(`[FW Webhook] ❌ Paiement échoué : ${tx_ref} — statut: ${status}`)
    }

    return NextResponse.json({ received: true })

  } catch (err: unknown) {
    console.error('[FW Webhook] Erreur:', err)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}

// GET pour vérification Flutterwave lors du retour du client
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const txRef  = searchParams.get('tx_ref')
  const status = searchParams.get('status')
  const transId = searchParams.get('transaction_id')

  if (!txRef) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/client/dashboard?payment=error`)
  }

  // Vérifier le paiement
  const result = await paymentService.verifyPayment('flutterwave', txRef)
  const livraisonId = txRef.split('_')[1]?.toLowerCase()

  if (result.status === 'success') {
    // Mettre à jour si besoin
    if (livraisonId && livraisonId.length > 8) {
      await supabaseAdmin.from('livraisons').update({
        statut_paiement:    'paye',
        payment_api_status: 'success',
      }).eq('payment_api_reference', txRef)
    }
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/client/suivi/${livraisonId}?payment=success`)
  }

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/client/suivi/${livraisonId}?payment=${status || 'error'}`)
}