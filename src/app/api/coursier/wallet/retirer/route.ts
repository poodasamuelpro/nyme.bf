// src/app/api/coursier/wallet/retirer/route.ts
// ══════════════════════════════════════════════════════════════════
// RETRAIT WALLET COURSIER — NYME  [NOUVEAU FICHIER]
// POST /api/coursier/wallet/retirer
//
// Flux :
//   1. Authentification coursier via verifyAuthUser
//   2. Validation montant (min 500 XOF, max solde disponible)
//   3. Appel RPC process_wallet_transaction (montant négatif)
//   4. Notification in-app + email de confirmation
// ══════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyAuthUser } from '@/lib/auth-middleware'
import { sendEmail, buildNotificationEmail } from '@/lib/email'

const MONTANT_MIN   = 500    // XOF — seuil minimum de retrait
const MONTANT_MAX   = 500_000 // XOF — plafond par opération

export async function POST(req: NextRequest) {
  try {
    // ── 1. Authentification coursier ─────────────────────────────
    const auth = await verifyAuthUser(req, 'coursier')
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

    const coursierUserId = auth.userId!

    // ── 2. Parser le body ─────────────────────────────────────────
    const body = await req.json()
    const { montant, methode_retrait, numero_mobile } = body

    // Validation montant
    if (!montant || typeof montant !== 'number') {
      return NextResponse.json({ error: 'montant requis (nombre)' }, { status: 400 })
    }
    if (montant < MONTANT_MIN) {
      return NextResponse.json({ error: `Montant minimum : ${MONTANT_MIN.toLocaleString('fr-FR')} XOF` }, { status: 400 })
    }
    if (montant > MONTANT_MAX) {
      return NextResponse.json({ error: `Montant maximum par opération : ${MONTANT_MAX.toLocaleString('fr-FR')} XOF` }, { status: 400 })
    }

    // Validation méthode de retrait
    const methodesValides = ['orange_money', 'moov_money', 'wave', 'coris', 'bank']
    if (!methode_retrait || !methodesValides.includes(methode_retrait)) {
      return NextResponse.json({
        error: `methode_retrait requis. Valeurs acceptées : ${methodesValides.join(', ')}`,
      }, { status: 400 })
    }

    // Validation numéro pour mobile money
    const methodesMobile = ['orange_money', 'moov_money', 'wave', 'coris']
    if (methodesMobile.includes(methode_retrait) && !numero_mobile) {
      return NextResponse.json({ error: 'numero_mobile requis pour le mobile money' }, { status: 400 })
    }

    // ── 3. Vérifier le wallet du coursier ─────────────────────────
    const { data: wallet, error: walletErr } = await supabaseAdmin
      .from('wallets')
      .select('id, solde, user_id')
      .eq('user_id', coursierUserId)
      .single()

    if (walletErr || !wallet) {
      return NextResponse.json({ error: 'Wallet introuvable' }, { status: 404 })
    }

    if ((wallet.solde || 0) < montant) {
      return NextResponse.json({
        error:  `Solde insuffisant. Solde disponible : ${(wallet.solde || 0).toLocaleString('fr-FR')} XOF`,
        solde:  wallet.solde || 0,
      }, { status: 400 })
    }

    // ── 4. Générer une référence unique ───────────────────────────
    const ts  = Date.now().toString(36).toUpperCase()
    const uid = coursierUserId.replace(/-/g, '').slice(0, 6).toUpperCase()
    const reference = `RET_${uid}_${ts}`

    // ── 5. Appel RPC process_wallet_transaction (montant négatif) ─
    const { data: txId, error: rpcErr } = await supabaseAdmin.rpc('process_wallet_transaction', {
      p_user_id:   coursierUserId,
      p_type:      'retrait',
      p_montant:   -montant,   // NÉGATIF = débit
      p_reference: reference,
      p_note:      `Retrait ${methode_retrait.replace('_', ' ')}${numero_mobile ? ` — ${numero_mobile}` : ''} — ${montant.toLocaleString('fr-FR')} XOF`,
    })

    if (rpcErr) {
      console.error('[coursier/wallet/retirer] RPC error:', rpcErr)
      return NextResponse.json({ error: `Erreur transaction : ${rpcErr.message}` }, { status: 500 })
    }

    // ── 6. Lire le nouveau solde ──────────────────────────────────
    const { data: walletMaj } = await supabaseAdmin
      .from('wallets')
      .select('solde')
      .eq('user_id', coursierUserId)
      .single()

    const nouveauSolde = walletMaj?.solde ?? (wallet.solde - montant)

    // ── 7. Récupérer infos du coursier pour la notification ────────
    const { data: utilisateur } = await supabaseAdmin
      .from('utilisateurs')
      .select('nom, email')
      .eq('id', coursierUserId)
      .single()

    const nomCoursier   = utilisateur?.nom   || 'Coursier'
    const emailCoursier = utilisateur?.email || null

    // ── 8. Notification in-app ────────────────────────────────────
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id:    coursierUserId,
        type:       'retrait_wallet',
        titre:      '💸 Retrait en cours de traitement',
        message:    `Votre demande de retrait de ${montant.toLocaleString('fr-FR')} XOF via ${methode_retrait.replace('_', ' ')} est en cours de traitement. Référence : ${reference}`,
        lu:         false,
        created_at: new Date().toISOString(),
      })
    } catch (notifErr) {
      console.warn('[retrait] Notification in-app échouée:', notifErr)
    }

    // ── 9. Email de confirmation ──────────────────────────────────
    if (emailCoursier) {
      try {
        await sendEmail({
          to:      emailCoursier,
          toName:  nomCoursier,
          subject: `💸 Demande de retrait ${montant.toLocaleString('fr-FR')} XOF — NYME`,
          html:    buildNotificationEmail({
            nom:     nomCoursier,
            titre:   '💸 Demande de retrait reçue',
            message: `Votre demande de retrait de <strong>${montant.toLocaleString('fr-FR')} XOF</strong> via <strong>${methode_retrait.replace('_', ' ')}</strong>${numero_mobile ? ` (${numero_mobile})` : ''} a bien été reçue.<br/><br/>Référence : <strong>${reference}</strong><br/>Nouveau solde : <strong>${nouveauSolde.toLocaleString('fr-FR')} XOF</strong><br/><br/>Le virement sera effectué sous 24-48h ouvrables.`,
          }),
        })
      } catch (emailErr) {
        console.warn('[retrait] Email confirmation échoué:', emailErr)
      }
    }

    // ── 10. Réponse succès ────────────────────────────────────────
    return NextResponse.json({
      success:         true,
      message:         `✅ Demande de retrait de ${montant.toLocaleString('fr-FR')} XOF enregistrée. Traitement sous 24-48h ouvrables.`,
      transaction_id:  txId,
      reference,
      montant,
      methode_retrait,
      nouveau_solde:   nouveauSolde,
    }, { status: 201 })

  } catch (err: unknown) {
    console.error('[coursier/wallet/retirer]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}