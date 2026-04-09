// src/app/api/payment/verify/route.ts
// ══════════════════════════════════════════════════════════════════
// VÉRIFICATION PAIEMENT — NYME
// POST /api/payment/verify
// ══════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { paymentService, type PaymentProvider } from '@/services/payment-service'

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { livraison_id, provider, external_ref } = await req.json()
    if (!livraison_id || !provider || !external_ref) {
      return NextResponse.json({ error: 'livraison_id, provider et external_ref requis' }, { status: 400 })
    }

    // Vérifier que la livraison appartient au client
    const { data: livraison } = await supabaseAdmin
      .from('livraisons')
      .select('id, client_id, prix_final, prix_calcule, statut_paiement, type')
      .eq('id', livraison_id)
      .eq('client_id', session.user.id)
      .single()

    if (!livraison) {
      return NextResponse.json({ error: 'Livraison introuvable' }, { status: 404 })
    }

    if (livraison.statut_paiement === 'paye') {
      return NextResponse.json({ success: true, status: 'success', message: 'Déjà payé' })
    }

    // Vérifier auprès du provider
    const result = await paymentService.verifyPayment(provider as PaymentProvider, external_ref)

    if (result.status === 'success') {
      const montant = Number(livraison.prix_final || livraison.prix_calcule)

      // Mettre à jour la livraison
      await supabaseAdmin.from('livraisons').update({
        statut_paiement:    'paye',
        payment_api_status: 'success',
      }).eq('id', livraison_id)

      // Mettre à jour le paiement
      await supabaseAdmin.from('paiements').update({
        statut:  'succes',
        paye_le: new Date().toISOString(),
        metadata: result.metadata || {},
      }).eq('reference', external_ref)

      // Notification
      await supabaseAdmin.from('notifications').insert({
        user_id: session.user.id,
        type:    'paiement',
        titre:   '✅ Paiement confirmé',
        message: `Paiement de ${montant.toLocaleString('fr-FR')} FCFA confirmé.`,
        data:    { livraison_id, montant, provider },
        lu:      false,
      })
    } else if (result.status === 'failed') {
      await supabaseAdmin.from('livraisons').update({ payment_api_status: 'failed' }).eq('id', livraison_id)
      await supabaseAdmin.from('paiements').update({ statut: 'echec' }).eq('reference', external_ref)
    }

    return NextResponse.json({
      success:  result.status === 'success',
      status:   result.status,
      provider: result.provider,
      message:  result.status === 'success' ? 'Paiement confirmé' : result.status === 'pending' ? 'En cours de traitement' : 'Paiement échoué',
    })

  } catch (err: unknown) {
    console.error('[api/payment/verify]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}