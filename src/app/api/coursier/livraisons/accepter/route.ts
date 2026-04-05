// src/app/api/coursier/livraisons/accepter/route.ts
// ROUTE MANQUANTE — appelée par dashboard coursier mais n'existait pas
// Logique : coursier accepte direct ou fait une contre-proposition de prix
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const { livraison_id, coursier_id, action, montant_propose } = body
    // action = 'accepter' | 'proposer_prix'

    if (!livraison_id || !coursier_id)
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    if (coursier_id !== session.user.id)
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    // Vérifier que le coursier est vérifié et disponible
    const { data: coursierData } = await supabaseAdmin
      .from('coursiers').select('statut_verification, statut').eq('id', session.user.id).single()
    if (!coursierData)
      return NextResponse.json({ error: 'Profil coursier introuvable' }, { status: 404 })
    if (coursierData.statut_verification !== 'verifie')
      return NextResponse.json({ error: 'Compte non encore vérifié par NYME' }, { status: 403 })

    // Récupérer la livraison
    const { data: livraison } = await supabaseAdmin
      .from('livraisons')
      .select('id, statut, client_id, prix_calcule, prix_final')
      .eq('id', livraison_id).single()
    if (!livraison)
      return NextResponse.json({ error: 'Livraison introuvable' }, { status: 404 })
    if (livraison.statut !== 'en_attente')
      return NextResponse.json({ error: 'Livraison déjà prise ou annulée' }, { status: 409 })

    // ── CAS 1 : Acceptation directe au prix proposé par le client ──
    if (!action || action === 'accepter') {
      // Assigner le coursier (UPDATE atomique pour éviter race condition)
      const { error: updateErr } = await supabaseAdmin
        .from('livraisons')
        .update({
          coursier_id: session.user.id,
          statut: 'acceptee',
          acceptee_at: new Date().toISOString(),
          prix_final: livraison.prix_final || livraison.prix_calcule,
        })
        .eq('id', livraison_id)
        .eq('statut', 'en_attente') // condition atomique

      if (updateErr)
        return NextResponse.json({ error: 'Course déjà acceptée par un autre coursier' }, { status: 409 })

      // Mettre à jour statut coursier → occupé
      await supabaseAdmin.from('coursiers').update({
        statut: 'occupe',
        derniere_activite: new Date().toISOString(),
      }).eq('id', session.user.id)

      // Notifier le client
      await supabaseAdmin.from('notifications').insert({
        user_id: livraison.client_id,
        type: 'course_acceptee',
        titre: '🛵 Coursier en route !',
        message: 'Un coursier a accepté votre livraison et arrive vers vous.',
        data: { livraison_id, coursier_id: session.user.id },
        lu: false,
      })

      // Historique statut
      await supabaseAdmin.from('statuts_livraison').insert({
        livraison_id,
        statut: 'acceptee',
        note: `Course acceptée par coursier ${session.user.id.slice(0, 8)}`,
      })

      // Rejeter les autres propositions de ce coursier sur d'autres livraisons si besoin
      await supabaseAdmin.from('propositions_prix').update({ statut: 'refuse' })
        .eq('auteur_id', session.user.id)
        .eq('statut', 'en_attente')
        .neq('livraison_id', livraison_id)

      return NextResponse.json({ success: true, action: 'acceptee', message: 'Course acceptée avec succès' })
    }

    // ── CAS 2 : Contre-proposition de prix par le coursier ──
    if (action === 'proposer_prix') {
      if (!montant_propose || montant_propose < 500)
        return NextResponse.json({ error: 'Montant minimum 500 XOF' }, { status: 400 })

      // Vérifier que ce coursier n'a pas déjà une proposition active pour cette livraison
      const { data: existingProp } = await supabaseAdmin
        .from('propositions_prix')
        .select('id')
        .eq('livraison_id', livraison_id)
        .eq('auteur_id', session.user.id)
        .eq('statut', 'en_attente')
        .single()

      if (existingProp) {
        // Mettre à jour la proposition existante
        await supabaseAdmin.from('propositions_prix').update({
          montant: montant_propose,
        }).eq('id', existingProp.id)
      } else {
        // Nouvelle proposition
        await supabaseAdmin.from('propositions_prix').insert({
          livraison_id,
          auteur_id: session.user.id,
          role_auteur: 'coursier',
          montant: montant_propose,
          statut: 'en_attente',
        })
      }

      // Récupérer les infos du coursier pour la notif
      const { data: userInfo } = await supabaseAdmin
        .from('utilisateurs').select('nom').eq('id', session.user.id).single()

      // Notifier le client qu'une proposition a été reçue
      await supabaseAdmin.from('notifications').insert({
        user_id: livraison.client_id,
        type: 'nouvelle_proposition',
        titre: '🛵 Nouvelle proposition !',
        message: `${userInfo?.nom || 'Un coursier'} propose ${new Intl.NumberFormat('fr-FR').format(montant_propose)} XOF`,
        data: { livraison_id, coursier_id: session.user.id, montant: montant_propose },
        lu: false,
      })

      return NextResponse.json({
        success: true,
        action: 'proposition_envoyee',
        message: `Contre-proposition de ${montant_propose} XOF envoyée au client`,
      })
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
  } catch (err: unknown) {
    console.error('[api/coursier/accepter]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}
