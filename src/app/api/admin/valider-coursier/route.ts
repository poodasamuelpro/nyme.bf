// src/app/api/admin/valider-coursier/route.ts — MODIFIÉ
// ═══════════════════════════════════════════════════════════════════════════
// CORRECTIONS AUDIT :
//   1. Remplacement du verifyAdmin() inline par verifyAdminRole() centralisé
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyAdminRole } from '@/lib/auth-middleware'
import { firebaseNotificationService } from '@/services/firebase-notification-service'

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(req)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

    const { coursier_id, statut_verification, motif } = await req.json()

    if (!coursier_id || !statut_verification) {
      return NextResponse.json({ error: 'coursier_id et statut_verification requis' }, { status: 400 })
    }

    const statutsValides = ['en_attente', 'verifie', 'rejete']
    if (!statutsValides.includes(statut_verification)) {
      return NextResponse.json({
        error: `Statut invalide. Valeurs acceptées : ${statutsValides.join(', ')}`,
      }, { status: 400 })
    }

    // Mise à jour du coursier
    const updateData: Record<string, unknown> = {
      statut_verification,
      updated_at: new Date().toISOString(),
    }

    // Si vérifié, activer le statut disponible
    if (statut_verification === 'verifie') {
      updateData.statut = 'disponible'
    }

    const { data, error: updErr } = await supabaseAdmin
      .from('coursiers')
      .update(updateData)
      .eq('id', coursier_id)
      .select()
      .single()

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 400 })
    }

    // Notification in-app
    const notifMap: Record<string, { titre: string; message: string }> = {
      verifie: {
        titre:   '✅ Documents vérifiés — Vous pouvez commencer !',
        message: 'Félicitations ! Vos documents ont été validés par l\'équipe NYME. Vous pouvez maintenant accepter des courses et commencer à gagner.',
      },
      rejete: {
        titre:   '❌ Documents non conformes',
        message: `Vos documents n'ont pas pu être validés.${motif ? ` Motif : ${motif}` : ''} Veuillez resoumettre des documents lisibles et en cours de validité. Contactez nyme.contact@gmail.com pour toute aide.`,
      },
    }

    const notif = notifMap[statut_verification]
    if (notif) {
      await supabaseAdmin.from('notifications').insert({
        user_id:    coursier_id,
        type:       'verification_documents',
        titre:      notif.titre,
        message:    notif.message,
        lu:         false,
        created_at: new Date().toISOString(),
      })

      // Notification push FCM si configuré
      if (firebaseNotificationService.isConfigured()) {
        try {
          await firebaseNotificationService.sendToUser(coursier_id, {
            title: notif.titre,
            body:  notif.message,
            data: {
              type:                'verification_documents',
              statut_verification,
              coursier_id,
            },
          }, 'verification_documents')
        } catch (fcmErr) {
          console.warn('[valider-coursier] FCM push échoué (non bloquant):', fcmErr)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Coursier ${statut_verification === 'verifie' ? 'vérifié' : statut_verification === 'rejete' ? 'rejeté' : 'mis en attente'} avec succès`,
      coursier: data,
    })

  } catch (err: unknown) {
    console.error('[admin/valider-coursier]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}