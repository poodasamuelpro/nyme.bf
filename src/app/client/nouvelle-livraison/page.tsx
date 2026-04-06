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
      <p className="text-gray-400 text-sm">Chargement de la carte...</p>
    </div>
  ),
})

type TypeCourse = 'immediate' | 'urgente' | 'programmee'
type ModePaiement = 'cash' | 'mobile_money'

interface LocationPoint {
  lat: number
  lng: number
  label: string
}

export default function NouvelleLivraisonPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [typeCourse, setTypeCourse] = useState<TypeCourse>('immediate')

  // Adresses
  const [depart, setDepart]   = useState<LocationPoint | null>(null)
  const [arrivee, setArrivee] = useState<LocationPoint | null>(null)
  const [route, setRoute]     = useState<{ distance: number; duration: number } | null>(null)

  // Prix
  const [prixCalcule, setPrixCalcule]             = useState<number | null>(null)
  const [prixProposeClient, setPrixProposeClient] = useState<number | ''>('')

  // Course programmée
  const [dateProgrammee, setDateProgrammee] = useState<string>('')

  // Pour un tiers
  const [pourTiers, setPourTiers]       = useState(false)
  const [destNom, setDestNom]           = useState('')
  const [destTel, setDestTel]           = useState('')
  const [destWhatsapp, setDestWhatsapp] = useState('')

  // Mode paiement — 'cash' ou 'mobile_money' (seuls acceptés par la BDD)
  const [modePaiement, setModePaiement] = useState<ModePaiement>('cash')

  const [loading, setLoading] = useState(false)

  // Recalcul du prix dès que départ / arrivée / type changent
  useEffect(() => {
    if (depart && arrivee) {
      mapService
        .getRoute(depart.lat, depart.lng, arrivee.lat, arrivee.lng)
        .then(res => {
          setRoute(res)
          const price = priceNegotiationService.calculateRecommendedPrice(res.distance, typeCourse)
          setPrixCalcule(price)
          setPrixProposeClient(price)
        })
        .catch(() => {})
    }
  }, [depart, arrivee, typeCourse])

  // Min datetime pour course programmée : dans 30 minutes
  const minDatetime = new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16)
  // Max datetime : dans 15 jours
  const maxDatetime = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)

  const handleSubmit = async () => {
    // Validations
    if (!depart || !arrivee) {
      toast.error('Veuillez sélectionner un point de départ et une destination')
      return
    }
    if (!prixProposeClient) {
      toast.error('Veuillez indiquer un prix')
      return
    }
    if (typeCourse === 'programmee' && !dateProgrammee) {
      toast.error('Veuillez choisir une date et heure pour la course programmée')
      return
    }
    if (pourTiers && !destNom.trim()) {
      toast.error('Le nom du destinataire est requis')
      return
    }
    if (pourTiers && !destTel.trim()) {
      toast.error('Le téléphone du destinataire est requis')
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: livraison, error } = await supabase
        .from('livraisons')
        .insert({
          client_id:             session.user.id,
          depart_adresse:        depart.label,
          depart_lat:            depart.lat,
          depart_lng:            depart.lng,
          arrivee_adresse:       arrivee.label,
          arrivee_lat:           arrivee.lat,
          arrivee_lng:           arrivee.lng,
          type:                  typeCourse,
          prix_calcule:          prixCalcule ?? Number(prixProposeClient),
          distance_km:           route?.distance ?? null,
          duree_estimee:         route ? Math.round(route.duration / 60) : null,
          statut:                'en_attente',
          statut_paiement:       'en_attente',
          is_paid_to_courier:    false,
          mode_paiement:         modePaiement,
          pour_tiers:            pourTiers,
          programme_le:          typeCourse === 'programmee' ? new Date(dateProgrammee).toISOString() : null,
          destinataire_nom:      pourTiers ? destNom.trim()  : '',
          destinataire_tel:      pourTiers ? destTel.trim()  : '',
          destinataire_whatsapp: pourTiers ? (destWhatsapp.trim() || destTel.trim()) : null,
        })
        .select()
        .single()

      if (error) throw error

      // Proposition de prix client
      await priceNegotiationService.proposePriceAsClient(
        livraison.id, session.user.id, Number(prixProposeClient)
      )

      toast.success('Livraison créée !')
      router.push(`/client/propositions/${livraison.id}`)
    } catch (e: unknown) {
      console.error(e)
      toast.error('Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec bouton retour */}
      <header className="sticky top-0 z-40 bg-primary-600 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 h-16">
            <button
              onClick={() => step > 1 ? setStep(step - 1) : router.back()}
              className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              ←
            </button>
            <div>
              <h1 className="font-bold">Nouvelle livraison</h1>
              <p className="text-white/60 text-xs">Étape {step}/3</p>
            </div>
          </div>
        </div>
      </header>

      {/* Barre de progression */}
      <div className="w-full h-1 bg-white/20">
        <div
          className="h-full bg-white transition-all duration-300"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-4">

        {/* ── ÉTAPE 1 : Type de course ── */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Type de livraison</h2>

            {([
              { value: 'immediate',  label: '⚡ Immédiate',  desc: 'Dans les 30 minutes' },
              { value: 'urgente',    label: '🚨 Urgente',    desc: 'Dans les 15 minutes (+30%)' },
              { value: 'programmee', label: '📅 Programmée', desc: 'À une date ultérieure (max 15 jours)' },
            ] as { value: TypeCourse; label: string; desc: string }[]).map(opt => (
              <button
                key={opt.value}
                onClick={() => setTypeCourse(opt.value)}
                className={`w-full p-4 rounded-2xl text-left border-2 transition-all ${
                  typeCourse === opt.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <p className="font-bold text-gray-900">{opt.label}</p>
                <p className="text-sm text-gray-500">{opt.desc}</p>
              </button>
            ))}

            {/* Sélecteur date/heure si programmée */}
            {typeCourse === 'programmee' && (
              <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200 space-y-2">
                <p className="text-sm font-bold text-purple-800">📅 Date et heure de la livraison</p>
                <input
                  type="datetime-local"
                  value={dateProgrammee}
                  onChange={e => setDateProgrammee(e.target.value)}
                  min={minDatetime}
                  max={maxDatetime}
                  className="w-full px-4 py-3 border border-purple-200 rounded-xl text-sm outline-none focus:border-purple-400 bg-white"
                />
                <p className="text-xs text-purple-600">Minimum 30 min à l'avance · Maximum 15 jours</p>
              </div>
            )}

            <button
              onClick={() => {
                if (typeCourse === 'programmee' && !dateProgrammee) {
                  toast.error('Veuillez choisir une date pour la course programmée')
                  return
                }
                setStep(2)
              }}
              className="w-full py-3 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 transition-colors"
            >
              Continuer →
            </button>
          </div>
        )}

        {/* ── ÉTAPE 2 : Adresses + pour un tiers ── */}
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
              {!depart
                ? '📍 Cliquez sur la carte pour le point de départ'
                : !arrivee
                ? '🎯 Cliquez pour la destination'
                : '✅ Adresses sélectionnées'}
            </p>

            {depart && (
              <div className="bg-white rounded-xl p-3 border border-gray-200 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Départ</p>
                  <p className="text-sm font-semibold truncate">{depart.label}</p>
                </div>
                <button onClick={() => setDepart(null)} className="text-red-400 text-xs hover:text-red-600 p-1">✕</button>
              </div>
            )}
            {arrivee && (
              <div className="bg-white rounded-xl p-3 border border-gray-200 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Destination</p>
                  <p className="text-sm font-semibold truncate">{arrivee.label}</p>
                </div>
                <button onClick={() => setArrivee(null)} className="text-red-400 text-xs hover:text-red-600 p-1">✕</button>
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

            {/* Toggle pour un tiers */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <button
                onClick={() => setPourTiers(!pourTiers)}
                className="flex items-center gap-3 w-full text-left"
              >
                <div className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${pourTiers ? 'bg-primary-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-all ${pourTiers ? 'left-6' : 'left-0.5'}`} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">📦 Livraison pour quelqu'un d'autre</p>
                  <p className="text-xs text-gray-400">Le destinataire est différent de vous</p>
                </div>
              </button>

              {pourTiers && (
                <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                  <p className="text-sm font-bold text-gray-700">Informations du destinataire</p>
                  <input
                    type="text"
                    placeholder="Nom du destinataire *"
                    value={destNom}
                    onChange={e => setDestNom(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary-400"
                  />
                  <input
                    type="tel"
                    placeholder="Téléphone *"
                    value={destTel}
                    onChange={e => setDestTel(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary-400"
                  />
                  <input
                    type="tel"
                    placeholder="WhatsApp (optionnel)"
                    value={destWhatsapp}
                    onChange={e => setDestWhatsapp(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary-400"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ← Retour
              </button>
              <button
                onClick={() => {
                  if (!depart || !arrivee) { toast.error('Sélectionnez départ et destination'); return }
                  if (pourTiers && !destNom.trim()) { toast.error('Nom du destinataire requis'); return }
                  if (pourTiers && !destTel.trim()) { toast.error('Téléphone du destinataire requis'); return }
                  setStep(3)
                }}
                disabled={!depart || !arrivee}
                className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : Prix + Mode paiement ── */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Prix & paiement</h2>

            {prixCalcule && (
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
                <p className="text-xs text-amber-600 mb-1">Prix recommandé</p>
                <p className="text-2xl font-black text-amber-700">{prixCalcule.toLocaleString()} XOF</p>
                <p className="text-xs text-amber-500 mt-1">
                  Basé sur {route?.distance.toFixed(1)} km
                  {typeCourse === 'urgente' && ' · +30% urgence'}
                </p>
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
                min={500}
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

            {/* Sélection mode paiement */}
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">💳 Mode de paiement</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['cash',         '💵 Espèces',       'Payez au coursier à la livraison'],
                  ['mobile_money', '📱 Mobile Money',  'Orange Money, Moov, Wave'],
                ] as [ModePaiement, string, string][]).map(([m, label, sub]) => (
                  <button
                    key={m}
                    onClick={() => setModePaiement(m)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      modePaiement === m
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <p className="font-bold text-sm text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                  </button>
                ))}
              </div>
              {modePaiement === 'mobile_money' && (
                <div className="mt-2 bg-amber-50 rounded-xl p-3 border border-amber-200">
                  <p className="text-amber-700 text-xs">
                    ⚠️ Paiement Mobile Money en cours d'intégration.
                    Le coursier vous contactera pour confirmer le transfert.
                  </p>
                </div>
              )}
            </div>

            {/* Récapitulatif */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
              <p className="font-bold text-gray-900 text-sm">Récapitulatif</p>
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between"><span>Type</span><span className="font-semibold text-gray-800 capitalize">{typeCourse}</span></div>
                {typeCourse === 'programmee' && dateProgrammee && (
                  <div className="flex justify-between"><span>Date</span><span className="font-semibold text-gray-800">{new Date(dateProgrammee).toLocaleString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span></div>
                )}
                <div className="flex justify-between"><span>Départ</span><span className="font-semibold text-gray-800 text-right max-w-[60%] truncate">{depart?.label}</span></div>
                <div className="flex justify-between"><span>Arrivée</span><span className="font-semibold text-gray-800 text-right max-w-[60%] truncate">{arrivee?.label}</span></div>
                {pourTiers && <div className="flex justify-between"><span>Destinataire</span><span className="font-semibold text-gray-800">{destNom} · {destTel}</span></div>}
                <div className="flex justify-between"><span>Paiement</span><span className="font-semibold text-gray-800">{modePaiement === 'cash' ? 'Espèces' : 'Mobile Money'}</span></div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ← Retour
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !prixProposeClient}
                className="flex-1 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                {loading ? '⏳ Création...' : '🚀 Créer la livraison'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
