'use client'
// src/app/suivi-tiers/[token]/page.tsx
// ══════════════════════════════════════════════════════════════════
// SUIVI LIVRAISON TIERS (SANS AUTHENTIFICATION) — NYME
// Accessible via un token unique partagé par le client
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Zap, MapPin, Package, CheckCircle, Clock, XCircle, Loader2, Phone } from 'lucide-react'
import dynamic from 'next/dynamic'

const MapAdvanced = dynamic(() => import('@/components/MapAdvanced'), { ssr: false })

interface Livraison {
  id: string
  depart_adresse: string
  arrivee_adresse: string
  statut: string
  type: string
  prix_final: number | null
  prix_calcule: number
  destinataire_nom: string
  destinataire_tel: string
  created_at: string
  coursier_id: string | null
  depart_lat: number
  depart_lng: number
  arrivee_lat: number
  arrivee_lng: number
}

interface CoursierInfo {
  nom: string
  telephone: string | null
  whatsapp: string | null
  note_moyenne: number
  lat_actuelle: number | null
  lng_actuelle: number | null
}

const STATUT_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; emoji: string }> = {
  en_attente:       { label: 'En attente de coursier',         color: 'text-amber-600 bg-amber-50 border-amber-200',  icon: Clock,        emoji: '⏳' },
  acceptee:         { label: 'Coursier en route pour ramasser', color: 'text-blue-600 bg-blue-50 border-blue-200',     icon: Package,      emoji: '✅' },
  en_rout_depart:   { label: 'Coursier se déplace vers vous',  color: 'text-blue-600 bg-blue-50 border-blue-200',     icon: MapPin,       emoji: '🛵' },
  colis_recupere:   { label: 'Colis récupéré — en route',      color: 'text-purple-600 bg-purple-50 border-purple-200', icon: Package,    emoji: '📦' },
  en_route_arrivee: { label: 'En route vers la destination',   color: 'text-indigo-600 bg-indigo-50 border-indigo-200', icon: MapPin,     emoji: '🚀' },
  livree:           { label: 'Livraison effectuée !',           color: 'text-green-600 bg-green-50 border-green-200',  icon: CheckCircle,  emoji: '🎉' },
  annulee:          { label: 'Livraison annulée',               color: 'text-red-600 bg-red-50 border-red-200',        icon: XCircle,      emoji: '❌' },
}

const ETAPES = ['en_attente', 'acceptee', 'en_rout_depart', 'colis_recupere', 'en_route_arrivee', 'livree']

export default function SuiviTiersPage() {
  const { token } = useParams<{ token: string }>()

  const [livraison,   setLivraison]   = useState<Livraison | null>(null)
  const [coursier,    setCoursier]    = useState<CoursierInfo | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [coursierLat, setCoursierLat] = useState<number | null>(null)
  const [coursierLng, setCoursierLng] = useState<number | null>(null)
  const [route,       setRoute]       = useState<import('@/services/map-service').RouteResult | null>(null)
  const [lastUpdate,  setLastUpdate]  = useState<string>('')

  useEffect(() => {
    if (!token) return
    loadData()
  }, [token])

  const loadData = async () => {
    try {
      // Vérifier le token
      const { data: tokenData, error: tokenErr } = await supabase
        .from('suivi_tokens')
        .select('livraison_id, expires_at, actif')
        .eq('token', token)
        .single()

      if (tokenErr || !tokenData) {
        setError('Lien de suivi invalide ou expiré.')
        setLoading(false)
        return
      }

      if (!tokenData.actif || new Date(tokenData.expires_at) < new Date()) {
        setError('Ce lien de suivi a expiré (valable 7 jours).')
        setLoading(false)
        return
      }

      // Récupérer la livraison (sans RLS car lecture publique via token)
      const { data: liv, error: livErr } = await supabase
        .from('livraisons')
        .select('id, depart_adresse, arrivee_adresse, statut, type, prix_final, prix_calcule, destinataire_nom, destinataire_tel, created_at, coursier_id, depart_lat, depart_lng, arrivee_lat, arrivee_lng')
        .eq('id', tokenData.livraison_id)
        .single()

      if (livErr || !liv) {
        setError('Livraison introuvable.')
        setLoading(false)
        return
      }

      setLivraison(liv)

      // Récupérer le coursier si assigné
      if (liv.coursier_id) {
        const { data: coursierData } = await supabase
          .from('coursiers')
          .select('lat_actuelle, lng_actuelle')
          .eq('id', liv.coursier_id)
          .single()

        const { data: userCoursier } = await supabase
          .from('utilisateurs')
          .select('nom, telephone, whatsapp, note_moyenne')
          .eq('id', liv.coursier_id)
          .single()

        if (userCoursier || coursierData) {
          setCoursier({
            nom:          userCoursier?.nom          || 'Coursier',
            telephone:    userCoursier?.telephone     || null,
            whatsapp:     userCoursier?.whatsapp      || null,
            note_moyenne: userCoursier?.note_moyenne  || 0,
            lat_actuelle: coursierData?.lat_actuelle  || null,
            lng_actuelle: coursierData?.lng_actuelle  || null,
          })
          if (coursierData?.lat_actuelle) setCoursierLat(coursierData.lat_actuelle)
          if (coursierData?.lng_actuelle) setCoursierLng(coursierData.lng_actuelle)
        }
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  // Realtime updates
  useEffect(() => {
    if (!livraison?.id) return

    const channel = supabase
      .channel(`suivi-tiers-${livraison.id}`)
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'livraisons',
        filter: `id=eq.${livraison.id}`,
      }, (payload) => {
        setLivraison(prev => prev ? { ...prev, ...payload.new as Partial<Livraison> } : prev)
        setLastUpdate(new Date().toLocaleTimeString('fr-FR'))
      })
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'localisation_coursier',
        filter: `livraison_id=eq.${livraison.id}`,
      }, (payload) => {
        const d = payload.new as { latitude: number; longitude: number }
        if (d.latitude && d.longitude) {
          setCoursierLat(d.latitude)
          setCoursierLng(d.longitude)
          setLastUpdate(new Date().toLocaleTimeString('fr-FR'))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [livraison?.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A2E8A] flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-white"/>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A2E8A] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center">
          <XCircle size={48} className="text-red-500 mx-auto mb-4"/>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Lien invalide</h2>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!livraison) return null

  const cfg     = STATUT_CONFIG[livraison.statut] || STATUT_CONFIG.en_attente
  const etapeIdx = ETAPES.indexOf(livraison.statut)
  const IconComp = cfg.icon

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      {/* Header */}
      <header className="bg-[#0A2E8A] text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[#E87722] to-[#F59343] rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" strokeWidth={2.5}/>
          </div>
          <div>
            <span className="font-black text-lg tracking-tight">NYME</span>
            <p className="text-white/60 text-xs">Suivi de livraison</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Statut principal */}
        <div className={`bg-white rounded-2xl p-5 shadow-sm border ${cfg.color}`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{cfg.emoji}</span>
            <div>
              <p className="font-bold text-slate-800 text-base">{cfg.label}</p>
              {lastUpdate && (
                <p className="text-xs text-slate-400">Mis à jour à {lastUpdate}</p>
              )}
            </div>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            {ETAPES.map((etape, i) => (
              <div key={etape} className="flex flex-col items-center flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i <= etapeIdx
                    ? 'bg-[#0A2E8A] text-white'
                    : 'bg-slate-200 text-slate-400'
                }`}>
                  {i < etapeIdx ? '✓' : i + 1}
                </div>
                {i < ETAPES.length - 1 && (
                  <div className={`h-0.5 w-full mt-2 -mb-2 ${i < etapeIdx ? 'bg-[#0A2E8A]' : 'bg-slate-200'}`}/>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Carte GPS */}
        {(coursierLat && coursierLng) || livraison.depart_lat ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" style={{ height: '260px' }}>
            <MapAdvanced
              depart={{ lat: livraison.depart_lat, lng: livraison.depart_lng, label: livraison.depart_adresse }}
              arrivee={{ lat: livraison.arrivee_lat, lng: livraison.arrivee_lng, label: livraison.arrivee_adresse }}
              coursier={coursierLat && coursierLng ? { lat: coursierLat, lng: coursierLng, nom: coursier?.nom } : undefined}
              route={route || undefined}
            />
          </div>
        ) : null}

        {/* Détails livraison */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
          <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Détails</h3>
          <div className="flex gap-3">
            <div className="flex flex-col items-center gap-1 pt-1">
              <div className="w-2.5 h-2.5 rounded-full bg-[#0A2E8A]"/>
              <div className="w-0.5 flex-1 bg-slate-200 min-h-[20px]"/>
              <div className="w-2.5 h-2.5 rounded-full bg-[#E87722]"/>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-xs text-slate-400 font-medium">Départ</p>
                <p className="text-sm text-slate-700 font-semibold">{livraison.depart_adresse}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Destination</p>
                <p className="text-sm text-slate-700 font-semibold">{livraison.arrivee_adresse}</p>
              </div>
            </div>
          </div>

          {livraison.destinataire_nom && (
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-400 font-medium">Destinataire</p>
              <p className="text-sm font-bold text-slate-700">{livraison.destinataire_nom}</p>
            </div>
          )}
        </div>

        {/* Coursier */}
        {coursier && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide mb-3">Votre coursier</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">{coursier.nom}</p>
                {coursier.note_moyenne > 0 && (
                  <p className="text-sm text-amber-500">⭐ {coursier.note_moyenne.toFixed(1)}</p>
                )}
              </div>
              {coursier.telephone && (
                <a
                  href={`tel:${coursier.telephone}`}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0A2E8A] text-white rounded-xl text-sm font-bold hover:bg-[#0d38a5] transition-all">
                  <Phone size={14}/> Appeler
                </a>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-slate-400">
            Propulsé par <strong className="text-[#E87722]">NYME</strong> · Livraison intelligente à Ouagadougou
          </p>
        </div>
      </main>
    </div>
  )
}