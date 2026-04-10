// src/app/client/payment/failed/page.tsx  [NOUVEAU FICHIER]
// Page d'erreur après un paiement échoué ou annulé
// Route : /client/payment/failed?livraison=<uuid>&reason=<reason>&provider=<provider>
'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { XCircle, RefreshCw, Home, AlertTriangle } from 'lucide-react'

function PaymentFailedContent() {
  const router      = useRouter()
  const params      = useSearchParams()
  const livraisonId = params.get('livraison')
  const reason      = params.get('reason') || 'failed'
  const provider    = params.get('provider') || ''

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      setLoading(false)
    })
  }, [router])

  const isCancelled = reason === 'cancelled' || reason === 'cancel'

  const reasonMessages: Record<string, { title: string; description: string; emoji: string }> = {
    cancelled: {
      emoji:       '🚫',
      title:       'Paiement annulé',
      description: 'Vous avez annulé la transaction. Votre livraison est toujours en attente de paiement.',
    },
    failed: {
      emoji:       '❌',
      title:       'Paiement échoué',
      description: 'La transaction n\'a pas pu être finalisée. Vérifiez vos informations bancaires ou essayez un autre moyen de paiement.',
    },
    insufficient_funds: {
      emoji:       '💸',
      title:       'Solde insuffisant',
      description: 'Votre solde est insuffisant pour effectuer ce paiement. Rechargez votre compte et réessayez.',
    },
    timeout: {
      emoji:       '⏱️',
      title:       'Délai expiré',
      description: 'La session de paiement a expiré. Veuillez recommencer.',
    },
  }

  const msg = reasonMessages[reason] || reasonMessages.failed

  const providerLabels: Record<string, string> = {
    duniapay:    'DuniaPay',
    flutterwave: 'Flutterwave',
    orange:      'Orange Money',
    wallet:      'Wallet NYME',
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-red-50 to-white px-4">
      {/* Icône état */}
      <div className={`mb-6 flex items-center justify-center w-24 h-24 rounded-full ${isCancelled ? 'bg-amber-100' : 'bg-red-100'}`}>
        {isCancelled
          ? <AlertTriangle size={52} className="text-amber-500" strokeWidth={1.5} />
          : <XCircle size={52} className="text-red-500" strokeWidth={1.5} />
        }
      </div>

      <div className="text-5xl mb-3">{msg.emoji}</div>
      <h1 className="text-2xl font-black text-gray-900 mb-2 text-center">{msg.title}</h1>
      <p className="text-gray-500 text-center mb-3 max-w-xs leading-relaxed">
        {msg.description}
      </p>

      {provider && (
        <p className="text-xs text-gray-400 mb-8">
          Via {providerLabels[provider] || provider}
        </p>
      )}

      {/* Tips */}
      <div className="w-full max-w-sm bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
        <p className="text-amber-800 font-bold text-sm mb-2">💡 Que faire ?</p>
        <ul className="text-amber-700 text-xs space-y-1">
          <li>• Vérifiez le solde de votre compte mobile money</li>
          <li>• Essayez un autre mode de paiement (cash, wallet, autre réseau)</li>
          <li>• Contactez votre opérateur si le problème persiste</li>
        </ul>
      </div>

      {/* CTA */}
      <div className="w-full max-w-sm space-y-3">
        {livraisonId && (
          <Link href={`/client/suivi/${livraisonId}`}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #1a56db, #3b82f6)' }}>
            <RefreshCw size={16} />
            Réessayer le paiement
          </Link>
        )}
        <Link href="/client/dashboard"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-gray-700 font-bold text-sm bg-gray-100">
          <Home size={16} />
          Retour au dashboard
        </Link>
      </div>

      {/* Support */}
      <p className="mt-8 text-xs text-gray-400 text-center">
        Besoin d'aide ?{' '}
        <a href="mailto:nyme.contact@gmail.com" className="text-blue-500 font-semibold">
          nyme.contact@gmail.com
        </a>
      </p>
    </div>
  )
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PaymentFailedContent />
    </Suspense>
  )
}