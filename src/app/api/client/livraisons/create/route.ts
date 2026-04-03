// src/app/api/client/livraisons/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const {
      client_id, depart_adresse, depart_lat, depart_lng,
      arrivee_adresse, arrivee_lat, arrivee_lng,
      destinataire_nom, destinataire_tel, destinataire_whatsapp, destinataire_email,
      instructions, photos_colis, type = 'immediate', prix_calcule, programme_le,
    } = body

    if (!client_id || !depart_adresse || !arrivee_adresse || !destinataire_nom || !destinataire_tel) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const dLat = depart_lat || 12.3547
    const dLng = depart_lng || -1.5247
    const aLat = arrivee_lat || 12.3647
    const aLng = arrivee_lng || -1.5147

    const distanceKm = Math.sqrt(
      Math.pow((aLat - dLat) * 111, 2) +
      Math.pow((aLng - dLng) * 111 * Math.cos((dLat * Math.PI) / 180), 2)
    )
    const prixFinal = prix_calcule || Math.max(1000, Math.round(distanceKm * 200 + 800))

    const { data, error } = await supabase.from('livraisons').insert({
      client_id, statut: 'en_attente', type, pour_tiers: false,
      depart_adresse, depart_lat: dLat, depart_lng: dLng,
      arrivee_adresse, arrivee_lat: aLat, arrivee_lng: aLng,
      destinataire_nom, destinataire_tel,
      destinataire_whatsapp: destinataire_whatsapp || destinataire_tel,
      destinataire_email: destinataire_email || null,
      instructions: instructions || null,
      photos_colis: photos_colis || [],
      prix_calcule: prixFinal,
      distance_km: Math.round(distanceKm * 10) / 10,
      statut_paiement: 'en_attente',
      programme_le: programme_le || null,
      is_paid_to_courier: false,
    }).select().single()

    if (error) throw error

    await supabase.from('notifications').insert({
      user_id: client_id, type: 'livraison', titre: 'Livraison créée',
      message: `Votre livraison vers ${arrivee_adresse} a été créée. Recherche d'un coursier...`,
      data: { livraison_id: data.id }, lu: false,
    })

    return NextResponse.json({ success: true, livraison: data })
  } catch (err) {
    console.error('[API] create livraison:', err)
    return NextResponse.json({ error: 'Erreur création livraison' }, { status: 500 })
  }
}
