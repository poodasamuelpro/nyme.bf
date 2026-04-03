// src/app/auth/callback/page.tsx — Callback OAuth Google
// Gère le rôle post-OAuth et crée les profils nécessaires
'use client'
import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Zap } from 'lucide-react'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) { router.replace('/login'); return }

      const userId = session.user.id
      const roleDemande = searchParams.get('role') as 'client' | 'coursier' | 'partenaire' | null

      // Vérifier si l'utilisateur existe déjà
      const { data: existing } = await supabase.from('utilisateurs').select('role').eq('id', userId).single()

      if (!existing) {
        // Nouvel utilisateur OAuth — créer le profil avec le bon rôle
        const role = roleDemande || 'client'
        const nom = session.user.user_metadata?.full_name ||
                    session.user.user_metadata?.name ||
                    session.user.email?.split('@')[0] || 'Utilisateur'

        await supabase.from('utilisateurs').upsert({
          id: userId,
          nom,
          email: session.user.email,
          role,
          est_verifie: false,
          est_actif: true,
        }, { onConflict: 'id' })

        await supabase.from('wallets').upsert({ user_id: userId, solde: 0 }, { onConflict: 'user_id' })

        if (role === 'coursier') {
          await supabase.from('coursiers').upsert({
            id: userId,
            statut: 'hors_ligne',
            statut_verification: 'en_attente',
            total_courses: 0,
            total_gains: 0,
          }, { onConflict: 'id' })
        }
      }

      // Redirection selon le rôle final
      const role = existing?.role || roleDemande || 'client'
      if (role === 'coursier') router.replace('/coursier/dashboard-new')
      else if (role === 'admin') router.replace('/admin-x9k2m/dashboard')
      else if (role === 'partenaire') router.replace('/partenaires/dashboard')
      else router.replace('/client/dashboard')
    }

    handleCallback()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-nyme-dark flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-nyme-orange to-orange-400 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Zap size={24} className="text-white" />
        </div>
        <p className="text-white/70 text-sm">Connexion en cours...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-nyme-dark flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/20 border-t-nyme-orange rounded-full animate-spin" />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
