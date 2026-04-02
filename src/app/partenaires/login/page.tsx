'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, Building2, User, Phone } from 'lucide-react'
import Link from 'next/link'

type Mode = 'login' | 'signup' | 'reset'

export default function PartenairesLoginPage() {
  const router = useRouter()
  const [mode,       setMode]       = useState<Mode>('login')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [entreprise, setEntreprise] = useState('')
  const [nomContact, setNomContact] = useState('')
  const [telephone,  setTelephone]  = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Vérifier si c'est bien un partenaire
        supabase.from('partenaires').select('id').eq('user_id', session.user.id).single()
          .then(({ data }) => {
            if (data) router.replace('/partenaires/dashboard')
          })
      }
    })
  }, [router])

  const reset = () => { setError(''); setSuccess('') }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); reset()
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password,
      })
      if (authErr) {
        throw new Error(
          authErr.message.includes('Invalid login credentials')
            ? 'Email ou mot de passe incorrect'
            : authErr.message
        )
      }
      if (!data.session) throw new Error('Connexion échouée, réessayez')

      // Vérifier le compte partenaire
      const { data: part, error: partErr } = await supabase
        .from('partenaires')
        .select('id, statut')
        .eq('user_id', data.session.user.id)
        .single()

      if (partErr || !part) {
        await supabase.auth.signOut()
        throw new Error('Aucun compte partenaire trouvé. Veuillez vous inscrire.')
      }
      if (part.statut === 'suspendu' || part.statut === 'rejete') {
        await supabase.auth.signOut()
        throw new Error('Compte suspendu ou rejeté. Contactez le support.')
      }

      setSuccess('Connexion réussie ! Redirection...')
      setTimeout(() => router.push('/partenaires/dashboard'), 800)

    } catch (err: any) {
      setError(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); reset()

    if (password.length < 8) {
      setError('Mot de passe : minimum 8 caractères')
      setLoading(false); return
    }

    try {
      // 1. Créer le compte Supabase Auth avec le rôle partenaire dans les metadata
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            role: 'partenaire',
            nom: nomContact.trim(),
            telephone: telephone.trim() || null,
          },
        },
      })

      if (authErr) throw new Error(authErr.message)
      if (!authData.user) throw new Error('Erreur lors de la création du compte')

      const userId = authData.user.id

      // 2. Créer le profil partenaire (le trigger handle_new_user s'occupe de la table utilisateurs)
      const { error: partErr } = await supabase
        .from('partenaires')
        .insert({
          user_id:         userId,
          entreprise:      entreprise.trim(),
          nom_contact:     nomContact.trim(),
          telephone:       telephone.trim() || null,
          email_pro:       email.trim().toLowerCase(),
          plan:            'starter',
          statut:          'en_attente',
          livraisons_max:  30,
          livraisons_mois: 0,
          taux_commission: 12.0,
          date_debut:      new Date().toISOString(),
        })

      if (partErr) throw new Error('Erreur lors de la création du profil partenaire.')

      setSuccess('🎉 Compte créé avec succès ! Votre demande est en cours de validation par l\'administration.')
      setMode('login')
      setPassword('')

    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'inscription')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError('Entrez votre email'); return }
    setLoading(true); reset()
    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/partenaires/reset-password` }
    )
    setLoading(false)
    if (err) { setError(err.message) }
    else {
      setSuccess('Email envoyé ! Vérifiez votre boîte.')
      setTimeout(() => { setMode('login'); setSuccess('') }, 5000)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A2E8A] flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#E87722] to-[#F59343] flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-heading text-2xl font-extrabold text-white tracking-wider">NYME</span>
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20">
            <span className="text-[#F59343] text-sm font-semibold">
              {mode === 'reset' ? '🔐 Réinitialisation' : '⭐ Espace Partenaires'}
            </span>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/15 shadow-2xl">
          {success && (
            <div className="mb-6 p-4 rounded-xl bg-green-500/20 border border-green-500/30 flex items-start gap-3 text-green-400 text-sm">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5"/>
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5"/>
              <span>{error}</span>
            </div>
          )}

          {mode === 'reset' ? (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-white/70 text-xs uppercase tracking-wider font-semibold mb-1.5">Email professionnel</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@entreprise.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#E87722] transition-all" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#E87722] to-[#F59343] text-white font-bold text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                {loading ? 'Envoi...' : 'Réinitialiser le mot de passe'}
              </button>
              <button type="button" onClick={() => { setMode('login'); reset() }} className="w-full text-white/50 text-xs hover:text-white transition-colors">
                ← Retour à la connexion
              </button>
            </form>
          ) : (
            <>
              <div className="flex rounded-xl bg-white/5 p-1 mb-6">
                {(['login','signup'] as Mode[]).map(m => (
                  <button key={m} onClick={() => { setMode(m); reset() }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode===m ? 'bg-[#E87722] text-white shadow-lg' : 'text-white/50 hover:text-white'}`}>
                    {m === 'login' ? 'Se connecter' : 'S\'inscrire'}
                  </button>
                ))}
              </div>

              <form onSubmit={mode==='login' ? handleLogin : handleSignup} className="space-y-4">
                {mode === 'signup' && (
                  <>
                    <div>
                      <label className="block text-white/70 text-xs uppercase tracking-wider font-semibold mb-1.5">Nom de l'entreprise *</label>
                      <div className="relative">
                        <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input type="text" required value={entreprise} onChange={e => setEntreprise(e.target.value)} placeholder="Ma Boutique SARL"
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#E87722] transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-white/70 text-xs uppercase tracking-wider font-semibold mb-1.5">Votre nom complet *</label>
                      <div className="relative">
                        <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input type="text" required value={nomContact} onChange={e => setNomContact(e.target.value)} placeholder="Jean Dupont"
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#E87722] transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-white/70 text-xs uppercase tracking-wider font-semibold mb-1.5">Téléphone (optionnel)</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="+226 70 00 00 00"
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#E87722] transition-all" />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-white/70 text-xs uppercase tracking-wider font-semibold mb-1.5">Email professionnel *</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@entreprise.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#E87722] transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-white/70 text-xs uppercase tracking-wider font-semibold mb-1.5">
                    Mot de passe * {mode==='signup' && <span className="normal-case text-white/30 ml-1">(min. 8)</span>}
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                    <input type={showPw ? 'text' : 'password'} required minLength={mode==='signup'?8:1} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                      className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#E87722] transition-all" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {mode === 'login' && (
                  <div className="text-right">
                    <button type="button" onClick={() => setMode('reset')} className="text-white/50 text-xs hover:text-[#F59343] transition-colors">
                      Mot de passe oublié ?
                    </button>
                  </div>
                )}

                <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#E87722] to-[#F59343] text-white font-bold text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                  {loading ? 'Patientez...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                </button>
              </form>
            </>
          )}
        </div>
        <p className="text-center text-white/30 text-xs mt-8 font-body">
          © {new Date().getFullYear()} NYME — Service de livraison professionnel
        </p>
      </div>
    </div>
  )
}
