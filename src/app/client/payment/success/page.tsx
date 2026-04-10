// src/app/client/payment/success/page.tsx  [NOUVEAU FICHIER]
// Page de confirmation de paiement réussi
// Route : /client/payment/success?livraison=<uuid>&provider=<provider>&ref=<ref>
'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { CheckCircle, Package, ArrowRight, Home } from 'lucide-react'

function PaymentSuccessContent() {
  const router       = useRouter()
  const params       = useSearchParams()
  const livraisonId  = params.get('livraison')
  const provider     = params.get('provider') || ''
  const ref          = params.get('ref')       || ''

  const [livraison, setLivraison] = useState<{
    id: string
    depart_adresse: string
    arrivee_adresse: string
    prix_final: number | null
    statut: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Vérifier la session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
    })

    // Charger les détails de la livraison
    if (livraisonId) {
      supabase
        .from('livraisons')
        .select('id, depart_adresse, arrivee_adresse, prix_final, statut')
        .eq('id', livraisonId)
        .single()
        .then(({ data }) => {
          if (data) setLivraison(data)
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [livraisonId, router])

  const providerLabels: Record<string, string> = {
    duniapay:    'DuniaPay',
    flutterwave: 'Flutterwave',
    orange:      'Orange Money',
    wallet:      'Wallet NYME',
    cash:        'Paiement cash',
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white px-4">
      {/* Icône succès animée */}
      <div className="mb-6 flex items-center justify-center w-24 h-24 rounded-full bg-green-100">
        <CheckCircle size={52} className="text-green-500" strokeWidth={1.5} />
      </div>

      <h1 className="text-2xl font-black text-gray-900 mb-2 text-center">Paiement réussi ✅</h1>
      <p className="text-gray-500 text-center mb-8 max-w-xs">
        Votre paiement a été confirmé.{provider && ` Traité via ${providerLabels[provider] || provider}.`}
      </p>

      {/* Carte détails livraison */}
      {!loading && livraison && (
        <div className="w-full max-w-sm bg-white rounded-3xl border border-gray-100 shadow-sm p-5 mb-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
              <Package size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Livraison</p>
              <p className="font-bold text-gray-900 text-sm">
                #{livraison.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1 border-t border-gray-50">
            <div className="flex gap-2 text-sm">
              <span className="text-gray-400 shrink-0 w-16">Départ</span>
              <span className="text-gray-700 font-medium truncate">{livraison.depart_adresse}</span>
            </div>
            <div className="flex gap-2 text-sm">
              <span className="text-gray-400 shrink-0 w-16">Arrivée</span>
              <span className="text-gray-700 font-medium truncate">{livraison.arrivee_adresse}</span>
            </div>
            {livraison.prix_final != null && (
              <div className="flex gap-2 text-sm">
                <span className="text-gray-400 shrink-0 w-16">Montant</span>
                <span className="text-green-600 font-black">
                  {livraison.prix_final.toLocaleString('fr-FR')} XOF
                </span>
              </div>
            )}
          </div>

          {ref && (
            <div className="pt-2 border-t border-gray-50">
              <p className="text-xs text-gray-400">Référence</p>
              <p className="text-xs font-mono text-gray-600 break-all">{ref}</p>
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="w-full max-w-sm space-y-3">
        {livraisonId && (
          <Link href={`/client/suivi/${livraisonId}`}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #1a56db, #3b82f6)' }}>
            <Package size={16} />
            Suivre ma livraison
            <ArrowRight size={14} />
          </Link>
        )}
        <Link href="/client/dashboard"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-gray-700 font-bold text-sm bg-gray-100">
          <Home size={16} />
          Retour au dashboard
        </Link>
      </div>

      {/* Badge sécurité */}
      <div className="mt-8 flex items-center gap-1.5 text-xs text-gray-400">
        <CheckCircle size={12} className="text-green-400" />
        Paiement sécurisé — NYME
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}