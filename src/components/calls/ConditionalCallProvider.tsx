// src/components/calls/ConditionalCallProvider.tsx — NOUVEAU FICHIER
// ═══════════════════════════════════════════════════════════════════════════
// CORRECTION AUDIT : Isolation du CallProvider
//   Ce composant vérifie si une session utilisateur existe avant de monter
//   le CallProvider WebRTC. Cela évite l'initialisation inutile des
//   connexions WebRTC sur les pages publiques (landing, contact, partenaires).
//
//   Remplace l'import direct de CallProvider dans layout.tsx.
// ═══════════════════════════════════════════════════════════════════════════
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import CallProvider from '@/components/calls/CallProvider'

interface Props {
  children: React.ReactNode
}

/**
 * Wrapper conditionnel : monte CallProvider uniquement si une session
 * utilisateur est active. Réduit la charge WebRTC sur les pages publiques.
 */
export default function ConditionalCallProvider({ children }: Props) {
  const [hasSession, setHasSession] = useState(false)
  const [checked,    setChecked]    = useState(false)

  useEffect(() => {
    // Vérification initiale de la session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
      setChecked(true)
    })

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session)
      setChecked(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Tant que la vérification n'est pas faite, rendre les enfants sans CallProvider
  // (évite un flash ou un délai visible)
  if (!checked) {
    return <>{children}</>
  }

  // Si aucune session → rendre sans CallProvider (pas de WebRTC)
  if (!hasSession) {
    return <>{children}</>
  }

  // Session active → monter CallProvider avec WebRTC
  return <CallProvider>{children}</CallProvider>
}