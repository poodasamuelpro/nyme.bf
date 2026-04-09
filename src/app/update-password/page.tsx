'use client'
// src/app/update-password/page.tsx
// ══════════════════════════════════════════════════════════════════
// MISE À JOUR MOT DE PASSE — NYME
// Page de destination après clic sur le lien de réinitialisation
// ══════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2, Zap, Eye, EyeOff, CheckCircle } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password,   setPassword]   = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [showPwd,    setShowPwd]    = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [success,    setSuccess]    = useState(false)
  const [sessionOk,  setSessionOk]  = useState(false)
  const [checking,   setChecking]   = useState(true)

  // Vérifier qu'on a une session valide (issue du lien de reset)
  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event !== 'SIGNED_OUT')) {
        setSessionOk(true)
      }
      setChecking(false)
    })

    // Vérifier la session actuelle
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionOk(true)
      setChecking(false)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || !confirm) return

    if (password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    if (password !== confirm) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setSuccess(true)
      toast.success('Mot de passe mis à jour !')

      // Redirection après 2 secondes
      setTimeout(() => {
        router.replace('/login')
      }, 2000)

    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A2E8A] to-[#071e6b] flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-white"/>
      </div>
    )
  }

  if (!sessionOk) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A2E8A] to-[#071e6b] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center">
          <p className="text-red-600 font-bold mb-4">Lien invalide ou expiré</p>
          <p className="text-slate-500 text-sm mb-6">Ce lien de réinitialisation n'est plus valide. Faites une nouvelle demande.</p>
          <button
            onClick={() => router.replace('/reset-password')}
            className="px-6 py-3 bg-[#0A2E8A] text-white font-bold rounded-xl">
            Nouvelle demande
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A2E8A] to-[#071e6b] flex items-center justify-center p-4">
      <Toaster position="top-center"/>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#E87722] to-[#F59343] rounded-2xl mb-4">
            <Zap size={28} className="text-white" strokeWidth={2.5}/>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">NYME</h1>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600"/>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Mot de passe mis à jour !</h2>
              <p className="text-slate-500 text-sm">Redirection vers la connexion...</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800 mb-1">Nouveau mot de passe</h2>
                <p className="text-slate-500 text-sm">Choisissez un mot de passe sécurisé pour votre compte.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                    Nouveau mot de passe *
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="Minimum 8 caractères"
                      className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0A2E8A] focus:ring-2 focus:ring-[#0A2E8A]/10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                    Confirmer le mot de passe *
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    placeholder="Répétez le mot de passe"
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition-all ${
                      confirm && password !== confirm
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-slate-200 focus:border-[#0A2E8A] focus:ring-2 focus:ring-[#0A2E8A]/10'
                    }`}
                  />
                  {confirm && password !== confirm && (
                    <p className="text-red-500 text-xs mt-1">Les mots de passe ne correspondent pas</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || (!!confirm && password !== confirm)}
                  className="w-full py-3.5 bg-gradient-to-r from-[#0A2E8A] to-[#1A4FBF] text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
                  {loading ? <Loader2 size={18} className="animate-spin"/> : null}
                  {loading ? 'Mise à jour...' : 'Mettre à jour'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}