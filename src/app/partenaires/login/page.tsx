'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, Building2, User, Phone } from 'lucide-react'
import Link from 'next/link'

type Mode = 'login' | 'signup' | 'reset'

export default function PartenairesLoginPage() {
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

  const reset = () => { setError(''); setSuccess('') }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); reset()
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (authErr) {
        if (authErr.message.includes('Invalid login credentials') || authErr.message.includes('invalid_credentials'))
          throw new Error('Email ou mot de passe incorrect.')
        if (authErr.message.includes('Email not confirmed'))
          throw new Error('Email non confirmé. Vérifiez votre boîte mail.')
        throw new Error(authErr.message)
      }

      if (!data.session) throw new Error('Connexion échouée, réessayez')

      const userId = data.session.user.id

      const { data: part, error: partErr } = await supabase
        .from('partenaires').select('id, statut').eq('user_id', userId).single()

      if (partErr || !part) {
        await supabase.auth.signOut()
        throw new Error('Aucun compte partenaire trouvé. Contactez nyme.contact@gmail.com')
      }
      if (part.statut === 'suspendu') {
        await supabase.auth.signOut()
        throw new Error('Compte suspendu. Contactez nyme.contact@gmail.com')
      }
      if (part.statut === 'rejete') {
        await supabase.auth.signOut()
        throw new Error('Demande rejetée. Contactez nyme.contact@gmail.com')
      }

      // ✅ Redirection directe sans setTimeout
      window.location.replace('/partenaires/dashboard')

    } catch (err: any) {
      setError(err.message || 'Erreur de connexion')
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); reset()
    if (!entreprise.trim()) { setError("Nom entreprise requis"); setLoading(false); return }
    if (!nomContact.trim()) { setError('Nom contact requis'); setLoading(false); return }
    if (password.length < 8) { setError('Mot de passe : min 8 caractères'); setLoading(false); return }
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(), password,
        options: { data: { role: 'partenaire', nom: nomContact.trim(), telephone: telephone.trim() || null } },
      })
      if (authErr) {
        if (authErr.message.includes('already registered') || authErr.message.includes('already been registered'))
          throw new Error('Email déjà utilisé. Connectez-vous.')
        throw new Error(authErr.message)
      }
      if (!authData.user) throw new Error('Erreur création compte')

      const userId = authData.user.id
      await supabase.from('utilisateurs').upsert({
        id: userId, nom: nomContact.trim(), email: email.trim().toLowerCase(),
        telephone: telephone.trim() || null, role: 'partenaire',
        est_verifie: false, est_actif: true,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

      if (authData.session) {
        await supabase.from('partenaires').insert({
          user_id: userId, entreprise: entreprise.trim(), nom_contact: nomContact.trim(),
          telephone: telephone.trim() || null, email_pro: email.trim().toLowerCase(),
          plan: 'starter', statut: 'en_attente', livraisons_max: 30,
          livraisons_mois: 0, taux_commission: 12.0, date_debut: new Date().toISOString(),
        })
      }

      setSuccess("🎉 Compte créé ! En attente de validation. Vous pouvez vous connecter.")
      setMode('login'); setPassword(''); setEntreprise(''); setNomContact(''); setTelephone('')
    } catch (err: any) {
      setError(err.message || "Erreur inscription")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError('Entrez votre email'); return }
    setLoading(true); reset()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/partenaires/reset-password` })
    setLoading(false)
    if (err) setError(err.message)
    else { setSuccess('📧 Email envoyé !'); setTimeout(() => { setMode('login'); setSuccess('') }, 5000) }
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
              <CheckCircle2 size={18} className="shrink-0 mt-0.5"/><span>{success}</span>
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5"/><span>{error}</span>
            </div>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-white/70 text-xs uppercase tracking-wider font-semibold mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="vous@entreprise.com" autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#E87722] transition-all" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#E87722] to-[#F59343] text-white font-bold text-sm disabled:opacity-50">
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </button>
              <button type="button" onClick={() => { setMode('login'); reset() }}
                className="w-full text-white/50 text-xs hover:text-white transition-colors">
                ← Retour
              </button>
            </form>
          )}

          {mode === 'login' && (
            <>
              <div className="flex mb-6 rounded-xl bg-white/5 border border-white/10 p-1">
                <button onClick={() => { setMode('login'); reset() }}
                  className="flex-1 py-2 rounded-lg text-sm font-bold bg-white text-[#0A2E8A] shadow-sm">Connexion</button>
                <button onClick={() => { setMode('signup'); reset() }}
                  className="flex-1 py-2 rounded-lg text-sm font-bold text-white/50 hover:text-white">Inscription</button>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-white/70 text-xs uppercase tracking-wider font-semibold mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="vous@entreprise.com" autoComplete="email"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#E87722] transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-white/70 text-xs uppercase tracking-wider font-semibold mb-1.5">Mot de passe</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                    <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" autoComplete="current-password"
                      className="w-full pl-10 pr-11 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#E87722] transition-all" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                      {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#E87722] to-[#F59343] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Connexion...</> : <>Se connecter <ArrowRight size={16}/></>}
                </button>
                <button type="button" onClick={() => { setMode('reset'); reset() }}
                  className="w-full text-white/50 text-xs hover:text-white transition-colors text-center">
                  Mot de passe oublié ?
                </button>
              </form>
            </>
          )}

          {mode === 'signup' && (
            <>
              <div className="flex mb-6 rounded-xl bg-white/5 border border-white/10 p-1">
                <button onClick={() => { setMode('login'); reset() }}
                  className="flex-1 py-2 rounded-lg text-sm font-bold text-white/50 hover:text-white">Connexion</button>
                <button onClick={() => { setMode('signup'); reset() }}
                  className="flex-1 py-2 rounded-lg text-sm font-bold bg-white text-[#0A2E8A] shadow-sm">Inscription</button>
              </div>
              <form onSubmit={handleSignup} className="space-y-4">
                {([
                  { label:'Entreprise *', value:entreprise, set:setEntreprise, type:'text', ph:"Nom de l'entreprise", Icon:Building2 },
                  { label:'Nom contact *', value:nomContact, set:setNomContact, type:'text', ph:'Votre nom complet', Icon:User },
                  { label:'Téléphone', value:telephone, set:setTelephone, type:'tel', ph:'+226 XX XX XX XX', Icon:Phone },
                  { label:'Email *', value:email, set:setEmail, type:'email', ph:'vous@entreprise.com', Icon:Mail },
                ] as const).map(({ label, value, set, type, ph, Icon }) => (
                  <div key={label}>
                    <label className="block text-white/70 text-xs uppercase tracking-wider font-semibold mb-1.5">{label}</label>
                    <div className="relative">
                      <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                      <input type={type} required={label.includes('*')} value={value}
                        onChange={e => (set as (v: string) => void)(e.target.value)} placeholder={ph}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#E87722] transition-all" />
                    </div>
                  </div>
                ))}
                <div>
                  <label className="block text-white/70 text-xs uppercase tracking-wider font-semibold mb-1.5">Mot de passe *</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                    <input type={showPw ? 'text' : 'password'} required minLength={8} value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="Minimum 8 caractères" autoComplete="new-password"
                      className="w-full pl-10 pr-11 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#E87722] transition-all" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                      {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#E87722] to-[#F59343] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Création...</> : <>Créer mon compte <ArrowRight size={16}/></>}
                </button>
              </form>
            </>
          )}
        </div>
        <p className="text-center text-white/30 text-xs mt-6">
          Besoin d&apos;aide ? <a href="mailto:nyme.contact@gmail.com" className="text-white/60 hover:text-white underline">nyme.contact@gmail.com</a>
        </p>
      </div>
    </div>
  )
}
