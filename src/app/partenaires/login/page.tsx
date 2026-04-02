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
      if (session) router.replace('/partenaires/dashboard')
    })
  }, [router])

  const reset = () => { setError(''); setSuccess('') }

  // ── Connexion ─────────────────────────────────────────────────
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
            : authErr.message.includes('Email not confirmed')
            ? 'Email non confirmé. Contactez nyme.contact@gmail.com'
            : authErr.message
        )
      }
      if (!data.session) throw new Error('Connexion échouée, réessayez')

      // Vérifier que c'est bien un partenaire (pas un client ou coursier)
      const { data: part, error: partErr } = await supabase
        .from('partenaires')
        .select('id, statut')
        .eq('user_id', data.session.user.id)
        .single()

      if (partErr || !part) {
        await supabase.auth.signOut()
        throw new Error('Aucun compte partenaire trouvé. Contactez nyme.contact@gmail.com')
      }
      if (part.statut === 'suspendu') {
        await supabase.auth.signOut()
        throw new Error('Compte suspendu. Contactez nyme.contact@gmail.com')
      }

      setSuccess('Connexion réussie ! Redirection...')
      setTimeout(() => router.push('/partenaires/dashboard'), 800)

    } catch (err: any) {
      setError(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  // ── Inscription — rôle FORCÉ à "partenaire" ───────────────────
  // Cette page est UNIQUEMENT pour les partenaires.
  // Le rôle 'partenaire' est inséré en dur, jamais modifiable par l'utilisateur.
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); reset()

    if (password.length < 8) {
      setError('Mot de passe : minimum 8 caractères')
      setLoading(false); return
    }
    if (!entreprise.trim()) {
      setError('Nom de l\'entreprise obligatoire')
      setLoading(false); return
    }
    if (!nomContact.trim()) {
      setError('Nom du contact obligatoire')
      setLoading(false); return
    }

    try {
      // 1. Créer le compte Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            role: 'partenaire',   // Metadata auth — informatif
            nom: nomContact.trim(),
          },
        },
      })

      if (authErr) {
        throw new Error(
          authErr.message.includes('already registered')
            ? 'Cet email est déjà utilisé. Connectez-vous.'
            : authErr.message
        )
      }
      if (!authData.user) throw new Error('Erreur lors de la création du compte')

      const userId = authData.user.id

      // 2. Insérer dans la table "utilisateurs" avec rôle = 'partenaire' FORCÉ
      // Le trigger handle_new_user() le fait aussi automatiquement,
      // mais on upsert pour s'assurer du rôle correct
      const { error: userErr } = await supabase
        .from('utilisateurs')
        .upsert({
          id:          userId,
          nom:         nomContact.trim(),
          telephone:   telephone.trim() || null,
          email:       email.trim().toLowerCase(),
          role:        'partenaire',  // ← FORCÉ — jamais 'client', 'coursier' ou 'admin'
          est_verifie: false,
          est_actif:   true,
          created_at:  new Date().toISOString(),
          updated_at:  new Date().toISOString(),
        }, { onConflict: 'id' })

      if (userErr) console.warn('[signup] upsert utilisateur:', userErr.message)

      // 3. Créer le profil partenaire
      const { error: partErr } = await supabase
        .from('partenaires')
        .insert({
          user_id:         userId,
          entreprise:      entreprise.trim(),
          nom_contact:     nomContact.trim(),
          telephone:       telephone.trim() || null,
          email_pro:       email.trim().toLowerCase(),
          plan:            'starter',
          statut:          'en_attente',  // Admin valide manuellement
          livraisons_max:  30,
          livraisons_mois: 0,
          taux_commission: 12.0,
          date_debut:      new Date().toISOString(),
          created_at:      new Date().toISOString(),
          updated_at:      new Date().toISOString(),
        })

      if (partErr) throw new Error('Erreur profil partenaire. Contactez le support.')

      // 4. Connexion auto si session disponible (email confirm désactivé dans Supabase)
      if (authData.session) {
        setSuccess('Compte créé ! En attente de validation (24-48h)...')
        setTimeout(() => router.push('/partenaires/dashboard'), 1500)
      } else {
        setSuccess('Compte créé ! Connectez-vous maintenant.')
        setMode('login'); setPassword('')
      }

    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'inscription')
    } finally {
      setLoading(false)
    }
  }

  // ── Reset mot de passe ────────────────────────────────────────
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
    <div className="min-h-screen section-hero flex items-center justify-center p-4">
      {/* Fond déco */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-nyme-orange/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.04]"
          style={{backgroundImage:'radial-gradient(circle, white 1px, transparent 1px)',backgroundSize:'40px 40px'}} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-nyme-orange to-nyme-orange-light flex items-center justify-center shadow-nyme-orange">
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-heading text-2xl font-extrabold text-white tracking-wider">NYME</span>
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-nyme-orange/20 border border-nyme-orange/30">
            <span className="text-nyme-orange text-sm font-semibold">
              {mode === 'reset' ? '🔐 Réinitialisation' : '⭐ Espace Partenaires'}
            </span>
          </div>
        </div>

        {/* Carte */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/15 shadow-nyme-lg">

          {/* Reset */}
          {mode === 'reset' && (
            <form onSubmit={handleReset} className="space-y-4">
              <h2 className="text-white font-heading font-bold text-lg mb-2">Réinitialiser le mot de passe</h2>
              <Field icon={Mail} type="email" label="Email professionnel" value={email} onChange={setEmail} placeholder="vous@entreprise.com" />
              <Messages error={error} success={success} />
              <SubmitBtn loading={loading} label="Envoyer l'email de réinitialisation" />
              <BackBtn onClick={() => { setMode('login'); reset() }} label="← Retour à la connexion" />
            </form>
          )}

          {/* Login / Signup */}
          {mode !== 'reset' && (
            <>
              {/* Tabs */}
              <div className="flex rounded-xl bg-white/8 p-1 mb-6">
                {(['login','signup'] as Mode[]).map(m => (
                  <button key={m} onClick={() => { setMode(m); reset() }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold font-body transition-all ${mode===m ? 'bg-nyme-orange text-white shadow-nyme-orange' : 'text-white/55 hover:text-white'}`}>
                    {m === 'login' ? 'Se connecter' : 'S\'inscrire'}
                  </button>
                ))}
              </div>

              <form onSubmit={mode==='login' ? handleLogin : handleSignup} className="space-y-4">
                {mode === 'signup' && (
                  <>
                    <Field icon={Building2} type="text" label="Nom de l'entreprise *" value={entreprise} onChange={setEntreprise} placeholder="Ma Boutique SARL" />
                    <Field icon={User} type="text" label="Votre nom complet *" value={nomContact} onChange={setNomContact} placeholder="Jean Dupont" />
                    <Field icon={Phone} type="tel" label="Téléphone (optionnel)" value={telephone} onChange={setTelephone} placeholder="+226 70 00 00 00" />
                  </>
                )}

                <Field icon={Mail} type="email" label="Email professionnel *" value={email} onChange={setEmail} placeholder="vous@entreprise.com" />

                <div>
                  <label className="block text-white/60 text-xs uppercase tracking-wider font-semibold mb-1.5 font-body">
                    Mot de passe *{mode==='signup' && <span className="normal-case text-white/30 ml-1">(min. 8 caractères)</span>}
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
                    <input type={showPw ? 'text' : 'password'} required minLength={mode==='signup'?8:1}
                      value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/8 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-nyme-orange/60 focus:bg-white/12 transition-all font-body text-sm" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white transition-colors">
                      {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/55 text-xs font-body">
                    ℹ️ Votre compte sera validé par notre équipe sous 24-48h. Vous pouvez déjà accéder à votre dashboard en attendant.
                  </div>
                )}

                <Messages error={error} success={success} />
                <SubmitBtn loading={loading} label={mode==='login' ? 'Accéder au dashboard' : 'Créer mon compte'} />
                {mode==='login' && <BackBtn onClick={() => { setMode('reset'); reset() }} label="Mot de passe oublié ?" />}
              </form>
            </>
          )}

          <div className="mt-6 pt-5 border-t border-white/8 text-center space-y-1">
            <p className="text-white/40 text-xs font-body">
              Pas encore partenaire ?{' '}
              <Link href="/partenaires#abonnements" className="text-nyme-orange hover:underline font-semibold">
                Voir les offres →
              </Link>
            </p>
            <p className="text-white/30 text-xs font-body">
              Support : <a href="mailto:nyme.contact@gmail.com" className="text-white/50 hover:text-nyme-orange transition-colors">nyme.contact@gmail.com</a>
            </p>
          </div>
        </div>

        <p className="text-center text-white/20 text-xs font-body mt-6">
          © {new Date().getFullYear()} NYME · Ouagadougou, Burkina Faso
        </p>
      </div>
    </div>
  )
}

// ── Sous-composants ────────────────────────────────────────────────
function Field({ icon: Icon, type, label, value, onChange, placeholder }: {
  icon: React.ElementType; type: string; label: string
  value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div>
      <label className="block text-white/60 text-xs uppercase tracking-wider font-semibold mb-1.5 font-body">{label}</label>
      <div className="relative">
        <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/8 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-nyme-orange/60 focus:bg-white/12 transition-all font-body text-sm" />
      </div>
    </div>
  )
}

function Messages({ error, success }: { error: string; success: string }) {
  return (
    <>
      {error && <div className="p-3 rounded-xl bg-red-500/12 border border-red-500/25 text-red-400 text-sm font-body flex items-start gap-2"><AlertCircle size={14} className="shrink-0 mt-0.5"/>{error}</div>}
      {success && <div className="p-3 rounded-xl bg-green-500/12 border border-green-500/25 text-green-400 text-sm font-body flex items-start gap-2"><CheckCircle2 size={14} className="shrink-0 mt-0.5"/>{success}</div>}
    </>
  )
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-nyme-orange to-nyme-orange-light text-white font-bold text-sm font-body flex items-center justify-center gap-2 shadow-nyme-orange hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed">
      {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Chargement...</> : <>{label}<ArrowRight size={14}/></>}
    </button>
  )
}

function BackBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="w-full text-center text-white/40 text-xs font-body hover:text-white/70 transition-colors pt-1">
      {label}
    </button>
  )
}