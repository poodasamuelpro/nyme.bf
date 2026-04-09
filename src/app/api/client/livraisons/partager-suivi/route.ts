// src/app/api/client/livraisons/partager-suivi/route.ts
// ══════════════════════════════════════════════════════════════════
// PARTAGE LIEN SUIVI TIERS — NYME
// POST /api/client/livraisons/partager-suivi
// Génère un token unique pour permettre le suivi sans authentification
// ══════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail, buildNotificationEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { livraison_id, destinataire_email, destinataire_nom } = await req.json()
    if (!livraison_id) return NextResponse.json({ error: 'livraison_id requis' }, { status: 400 })

    // Vérifier que la livraison appartient au client
    const { data: livraison, error: livErr } = await supabaseAdmin
      .from('livraisons')
      .select('id, client_id, depart_adresse, arrivee_adresse, statut, destinataire_nom, destinataire_tel, destinataire_email')
      .eq('id', livraison_id)
      .eq('client_id', session.user.id)
      .single()

    if (livErr || !livraison) {
      return NextResponse.json({ error: 'Livraison introuvable' }, { status: 404 })
    }

    // Vérifier si un token existe déjà pour cette livraison
    const { data: existingToken } = await supabaseAdmin
      .from('suivi_tokens')
      .select('token, expires_at')
      .eq('livraison_id', livraison_id)
      .eq('actif', true)
      .gt('expires_at', new Date().toISOString())
      .single()

    let token: string

    if (existingToken) {
      token = existingToken.token
    } else {
      // Générer un nouveau token
      const randomBytes = crypto.getRandomValues(new Uint8Array(24))
      token = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')

      // Expiration dans 7 jours
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { error: tokenErr } = await supabaseAdmin.from('suivi_tokens').insert({
        livraison_id,
        token,
        expires_at:   expiresAt.toISOString(),
        created_by:   session.user.id,
        actif:        true,
      })

      if (tokenErr) {
        return NextResponse.json({ error: `Erreur création token : ${tokenErr.message}` }, { status: 500 })
      }
    }

    const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL || 'https://nyme.bf'
    const suiviUrl = `${siteUrl}/suivi-tiers/${token}`

    // Envoyer l'email si demandé
    let emailSent = false
    const emailTarget = destinataire_email || livraison.destinataire_email

    if (emailTarget) {
      const nomDest = destinataire_nom || livraison.destinataire_nom || 'Destinataire'
      const emailResult = await sendEmail({
        to:      emailTarget,
        toName:  nomDest,
        subject: '📦 Suivez votre livraison NYME en temps réel',
        html:    buildNotificationEmail({
          nom:     nomDest,
          titre:   '📦 Suivi de votre livraison',
          message: `Vous pouvez suivre votre colis en temps réel sur le lien ci-dessous.<br/>
                    De : <strong>${livraison.depart_adresse}</strong><br/>
                    Vers : <strong>${livraison.arrivee_adresse}</strong>`,
          ctaText: 'Suivre ma livraison en temps réel',
          ctaUrl:  suiviUrl,
        }),
      })
      emailSent = emailResult.sent
    }

    return NextResponse.json({
      success:     true,
      token,
      suiviUrl,
      emailSent,
      expires_in:  '7 jours',
    })

  } catch (err: unknown) {
    console.error('[api/client/livraisons/partager-suivi]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}