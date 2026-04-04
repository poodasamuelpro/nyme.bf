// src/app/client/nouvelle-livraison/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { mapService } from '@/services/map-service'
import { priceNegotiationService } from '@/services/price-negotiation-service'
import toast from 'react-hot-toast'

const MapAdvanced = dynamic(() => import('@/components/MapAdvanced'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center">
      Chargement...
    </div>
  ),
})

type TypeCourse = 'immediate' | 'urgente' | 'programmee'

interface LocationPoint {
  lat: number
  lng: number
  label: string
}

export default function NouvelleLivraisonPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  // "type" correspond à la colonne SQL : 'immediate' | 'urgente' | 'programmee'
  const [typeCourse, setTypeCourse] = useState<TypeCourse>('immediate')
  const [depart, setDepart]   = useState<LocationPoint | null>(null)
  const [arrivee, setArrivee] = useState<LocationPoint | null>(null)
  const [prixCalcule, setPrixCalcule]           = useState<number | null>(null)
  const [prixProposeClient, setPrixProposeClient] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [route, setRoute]     = useState<{ distance: number; duration: number } | null>(null)

  // Recalcul du prix dès que départ / arrivée / type changent
  useEffect(() => {
    if (depart && arrivee) {
      mapService
        .getRoute(depart.lat, depart.lng, arrivee.lat, arrivee.lng)
        .then(res => {
          setRoute(res)
          // calculateRecommendedPrice accepte 'immediate' | 'urgente' | 'programmee'
          const price = priceNegotiationService.calculateRecommendedPrice(res.distance, typeCourse)
          setPrixCalcule(price)
          setPrixProposeClient(price)
        })
        .catch(() => { /* silencieux */ })
    }
  }, [depart, arrivee, typeCourse])

  const handleSubmit = async () => {
    if (!depart || !arrivee) {
      toast.error('Veuillez sélectionner un point de départ et une destination')
      return
    }
    if (!prixProposeClient) {
      toast.error('Veuillez indiquer un prix')
      return
    }
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // INSERT livraison — colonnes exactes de la table SQL
      const { data: livraison, error } = await supabase
        .from('livraisons')
        .insert({
          client_id:       session.user.id,
          depart_adresse:  depart.label,
          depart_lat:      depart.lat,
          depart_lng:      depart.lng,
          arrivee_adresse: arrivee.label,
          arrivee_lat:     arrivee.lat,
          arrivee_lng:     arrivee.lng,
          // Colonne : "type" (pas "type_course")
          type:            typeCourse,
          prix_calcule:    prixCalcule ?? Number(prixProposeClient),
          distance_km:     route?.distance ?? null,
          duree_estimee:   route ? Math.round(route.duration / 60) : null,
          statut:          'en_attente',
          statut_paiement: 'en_attente',
          is_paid_to_courier: false,
          // Champs obligatoires non-null dans le schéma
          destinataire_nom: '',
          destinataire_tel: '',
        })
        .select()
        .single()

      if (error) throw error

      // Proposition de prix client
      await priceNegotiationService.proposePriceAsClient(
        livraison.id, session.user.id, Number(prixProposeClient)
      )

      toast.success('Livraison créée !')
      router.push(`/client/suivi/${livraison.id}`)
    } catch (e: unknown) {
      console.error(e)
      toast.error('Erreur de création')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-primary-600 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 h-16">
            <button onClick={() => router.back()}
              className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30">←</button>
            <div>
              <h1 className="font-bold">Nouvelle livraison</h1>
              <p className="text-white/60 text-xs">Étape {step}/3</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-4">

        {/* ── ÉTAPE 1 : Type de course ── */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Type de livraison</h2>
            {([
              { value: 'immediate',  label: '⚡ Immédiate',  desc: 'Dans les 30 minutes' },
              { value: 'urgente',    label: '🚨 Urgente',    desc: 'Dans les 15 minutes (+30%)' },
              { value: 'programmee', label: '📅 Programmée', desc: 'À une date ultérieure' },
            ] as { value: TypeCourse; label: string; desc: string }[]).map(opt => (
              <button key={opt.value} onClick={() => setTypeCourse(opt.value)}
                className={`w-full p-4 rounded-2xl text-left border-2 transition-all ${typeCourse === opt.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'}`}>
                <p className="font-bold text-gray-900">{opt.label}</p>
                <p className="text-sm text-gray-500">{opt.desc}</p>
              </button>
            ))}
            <button onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600">
              Continuer →
            </button>
          </div>
        )}

        {/* ── ÉTAPE 2 : Points de départ / arrivée ── */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Sélectionnez les adresses</h2>

            <div className="h-72 rounded-2xl overflow-hidden border border-gray-200">
              <MapAdvanced
                depart={depart ?? undefined}
                arrivee={arrivee ?? undefined}
                route={route as any}
                onLocationSelect={(lat, lng, label) => {
                  if (!depart) setDepart({ lat, lng, label })
                  else setArrivee({ lat, lng, label })
                }}
              />
            </div>

            <p className="text-xs text-gray-500 text-center">
              {!depart ? '📍 Cliquez sur la carte pour le point de départ'
                : !arrivee ? '🎯 Cliquez pour la destination'
                : '✅ Adresses sélectionnées'}
            </p>

            {depart && (
              <div className="bg-white rounded-xl p-3 border border-gray-200 flex items-center justify-between">
                <div><p className="text-xs text-gray-500">Départ</p><p className="text-sm font-semibold truncate">{depart.label}</p></div>
                <button onClick={() => setDepart(null)} className="text-red-400 text-xs hover:text-red-600">✕</button>
              </div>
            )}
            {arrivee && (
              <div className="bg-white rounded-xl p-3 border border-gray-200 flex items-center justify-between">
                <div><p className="text-xs text-gray-500">Destination</p><p className="text-sm font-semibold truncate">{arrivee.label}</p></div>
                <button onClick={() => setArrivee(null)} className="text-red-400 text-xs hover:text-red-600">✕</button>
              </div>
            )}

            {route && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-500">Distance</p>
                  <p className="font-bold text-blue-700">{route.distance.toFixed(1)} km</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-500">Durée estimée</p>
                  <p className="font-bold text-blue-700">{Math.round(route.duration / 60)} min</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-700">← Retour</button>
              <button onClick={() => setStep(3)} disabled={!depart || !arrivee}
                className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 disabled:opacity-50">
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : Prix ── */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Proposer un prix</h2>

            {prixCalcule && (
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
                <p className="text-xs text-amber-600 mb-1">Prix recommandé</p>
                <p className="text-2xl font-black text-amber-700">{prixCalcule.toLocaleString()} XOF</p>
                <p className="text-xs text-amber-500 mt-1">Basé sur {route?.distance.toFixed(1)} km</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Votre offre (XOF)</label>
              <input
                type="number"
                value={prixProposeClient}
                onChange={e => setPrixProposeClient(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary-400 text-lg font-bold"
                placeholder="Entrez un montant"
                min={0}
              />
            </div>

            {prixCalcule && prixProposeClient && (
              <div className={`rounded-xl p-3 text-sm ${
                priceNegotiationService.validateProposal(Number(prixProposeClient), prixCalcule).valid
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {priceNegotiationService.validateProposal(Number(prixProposeClient), prixCalcule).message
                  || '✅ Prix valide — les coursiers pourront accepter ou contre-proposer'}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-700">← Retour</button>
              <button onClick={handleSubmit} disabled={loading || !prixProposeClient}
                className="flex-1 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 disabled:opacity-50">
                {loading ? '⏳ Création...' : '🚀 Créer la livraison'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
