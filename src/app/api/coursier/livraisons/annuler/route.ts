// src/app/api/coursier/livraisons/annuler/route.ts  [NOUVEAU FICHIER]
// ══════════════════════════════════════════════════════════════════
// ANNULATION LIVRAISON PAR LE COURSIER — NYME
// POST /api/coursier/livraisons/annuler
//
// Corps :
//   livraison_id  string  UUID de la livraison
//   motif         string  (optionnel) raison de l'annulation
//
// Logique :
//   - Vérification que la livraison est bien assignée au coursier
//   - Statuts autorisés : acceptee | en_rout_depart | colis_recupere
//   - Pénalité éventuelle si annulation après récupération du colis
//   - Libération du coursier → statut = 'disponible'
//   - Notification au client + in-app
// ══════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyAuthUser } from '@/lib/auth-middleware'
import { sendEmail, buildNotificationEmail } from '@/lib/email'

// Seuil pénalité : si le coursier annule APRÈS avoir récupéré le colis
const PENALITE_APRES_RECUPERATION_PCT = 0.10  // 10% du prix final

export async function POST(req: NextRequest) {
  try {
    // ── 1. Authentification coursier ─────────────────────────────
    const auth = await verifyAuthUser(req, 'coursier')
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

    const coursierUserId = auth.userId!

    // ── 2. Parser le body ─────────────────────────────────────────
    const { livraison_id, motif } = await req.json()
    if (!livraison_id) {
      return NextResponse.json({ error: 'livraison_id requis' }, { status: 400 })
    }

    // ── 3. Récupérer et valider la livraison ──────────────────────
    const { data: livraison, error: livErr } = await supabaseAdmin
      .from('livraisons')
      .select(`
        id, client_id, coursier_id, statut, statut_paiement,
        prix_final, prix_calcule, mode_paiement, depart_adresse, arrivee_adresse
      `)
      .eq('id', livraison_id)
      .eq('coursier_id', coursierUserId)  // Sécurité : livraison bien assignée à CE coursier
      .single()

    if (livErr || !livraison) {
      return NextResponse.json({ error: 'Livraison introuvable ou non assignée à ce coursier' }, { status: 404 })
    }

    // Statuts que le coursier peut annuler
    const statutsAutorisés = ['acceptee', 'en_rout_depart', 'colis_recupere']
    if (!statutsAutorisés.includes(livraison.statut)) {
      return NextResponse.json({
        error: `Impossible d'annuler une livraison avec le statut "${livraison.statut}". Annulation possible uniquement si : ${statutsAutorisés.join(', ')}.`,
      }, { status: 400 })
    }

    const now = new Date().toISOString()
    // Le coursier a-t-il déjà récupéré le colis ? → pénalité applicable
    const apresRecuperation = livraison.statut === 'colis_recupere'

    // ── 4. Annuler la livraison ───────────────────────────────────
    const { error: updateErr } = await supabaseAdmin
      .from('livraisons')
      .update({
        statut:      'annulee',
        coursier_id: null,        // Désassigner le coursier
        annulee_at:  now,
        annulee_par: 'coursier',
      })
      .eq('id', livraison_id)

    if (updateErr) {
      return NextResponse.json({ error: `Erreur annulation : ${updateErr.message}` }, { status: 500 })
    }

    // ── 5. Historique statut ──────────────────────────────────────
    await supabaseAdmin.from('statuts_livraison').insert({
      livraison_id,
      statut:    'annulee',
      note:      motif
        ? `Annulé par le coursier : ${motif}${apresRecuperation ? ' (après récupération colis)' : ''}`
        : `Annulé par le coursier${apresRecuperation ? ' (après récupération colis)' : ''}`,
      changed_at: now,
    })

    // ── 6. Libérer le coursier ────────────────────────────────────
    await supabaseAdmin.from('coursiers').update({
      statut:            'disponible',
      derniere_activite: now,
    }).eq('id', coursierUserId)

    // ── 7. Remettre la livraison en attente pour réassignation ────
    // Réouvrir la livraison pour qu'un autre coursier puisse l'accepter
    await supabaseAdmin.from('livraisons').update({
      statut: 'en_attente',
    }).eq('id', livraison_id)

    // ── 8. Logique pénalité (annulation après récupération) ───────
    let penaliteAppliquee    = false
    let montantPenalite      = 0

    if (apresRecuperation) {
      const prixBase = Number(livraison.prix_final || livraison.prix_calcule || 0)
      montantPenalite = Math.round(prixBase * PENALITE_APRES_RECUPERATION_PCT)

      if (montantPenalite > 0) {
        const refPenalite = `PEN_${livraison_id.replace(/-/g,'').slice(0,8)}_${Date.now()}`

        const { error: penErr } = await supabaseAdmin.rpc('process_wallet_transaction', {
          p_user_id:   coursierUserId,
          p_type:      'commission',
          p_montant:   -montantPenalite,   // débit pénalité
          p_reference: refPenalite,
          p_note:      `Pénalité annulation après récupération — Livraison #${livraison_id.slice(0,8).toUpperCase()}`,
        })

        if (!penErr) {
          penaliteAppliquee = true
        } else {
          console.warn('[coursier/annuler] Pénalité non appliquée:', penErr.message)
        }
      }
    }

    // ── 9. Notifications ──────────────────────────────────────────
    // Notification in-app au client
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: livraison.client_id,
        type:    'annulation_livraison',
        titre:   '⚠️ Votre livraison a été annulée',
        message: motif
          ? `Le coursier a annulé votre livraison #${livraison_id.slice(0,8).toUpperCase()}. Motif : ${motif}. Elle va être réassignée.`
          : `Le coursier a annulé votre livraison #${livraison_id.slice(0,8).toUpperCase()}. Elle va être réassignée à un autre coursier.`,
        data:    { livraison_id },
        lu:      false,
        created_at: now,
      })
    } catch (notifErr) {
      console.warn('[coursier/annuler] Notification client échouée:', notifErr)
    }

    // Notification in-app au coursier
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: coursierUserId,
        type:    'annulation_livraison',
        titre:   penaliteAppliquee ? `❌ Livraison annulée — Pénalité ${montantPenalite.toLocaleString('fr-FR')} XOF` : '❌ Livraison annulée',
        message: penaliteAppliquee
          ? `Vous avez annulé la livraison #${livraison_id.slice(0,8).toUpperCase()} après avoir récupéré le colis. Une pénalité de ${montantPenalite.toLocaleString('fr-FR')} XOF a été déduite de votre wallet.`
          : `Vous avez annulé la livraison #${livraison_id.slice(0,8).toUpperCase()}.`,
        data:    { livraison_id, penalite: montantPenalite },
        lu:      false,
        created_at: now,
      })
    } catch { /* non bloquant */ }

    // Email au client
    try {
      const { data: clientUser } = await supabaseAdmin
        .from('utilisateurs')
        .select('nom, email')
        .eq('id', livraison.client_id)
        .single()

      if (clientUser?.email) {
        await sendEmail({
          to:      clientUser.email,
          toName:  clientUser.nom || 'Client',
          subject: `⚠️ Votre livraison a été annulée — NYME #${livraison_id.slice(0,8).toUpperCase()}`,
          html:    buildNotificationEmail({
            nom:     clientUser.nom || 'Client',
            titre:   '⚠️ Livraison annulée par le coursier',
            message: `Votre livraison de <strong>${livraison.depart_adresse}</strong> vers <strong>${livraison.arrivee_adresse}</strong> a été annulée par le coursier.<br/><br/>Ne vous inquiétez pas, elle est de nouveau disponible et sera réassignée à un autre coursier prochainement.`,
            ctaText: 'Voir ma livraison',
            ctaUrl:  `${process.env.NEXT_PUBLIC_SITE_URL || 'https://nyme.bf'}/client/suivi/${livraison_id}`,
          }),
        })
      }
    } catch (emailErr) {
      console.warn('[coursier/annuler] Email client échoué:', emailErr)
    }

    // ── 10. Réponse ───────────────────────────────────────────────
    return NextResponse.json({
      success:           true,
      message:           'Livraison annulée avec succès. Elle sera réassignée à un autre coursier.',
      penalite_appliquee: penaliteAppliquee,
      montant_penalite:  montantPenalite,
      remise_en_attente: true,
    })

  } catch (err: unknown) {
    console.error('[api/coursier/livraisons/annuler]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}