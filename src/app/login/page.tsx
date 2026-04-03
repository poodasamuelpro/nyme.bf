'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

type AuthMode = 'login' | 'register'
type Role = 'client' | 'coursier'

function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<AuthMode>('login')
  const [role, setRole] = useState<Role>('client')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nom: '', email: '', telephone: '',
    password: '', confirmPassword: '', whatsapp: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const roleParam = searchParams.get('role') as Role
    if (roleParam === 'coursier') setRole('coursier')
    if (searchParams.get('mode') === 'register') setMode('register')

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) redirectAfterLogin(session.user.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const redirectAfterLogin = async (userId: string) => {
    const { data } = await supabase.from('utilisateurs').select('role').eq('id', userId).single()
    const userRole = data?.role || 'client'
    const redirect = searchParams.get('redirect')
    if (redirect) { router.push(redirect); return }
    const routes: Record<string, string> = {
      client:    '/client/dashboard',
      coursier:  '/coursier/dashboard',
      partenaire:'/partenaires/dashboard',
      admin:     '/admin-x9k2m/dashboard',
    }
    router.push(routes[userRole] || '/client/dashboard')
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.email.trim()) errs.email = 'Email requis'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Email invalide'
    if (!form.password) errs.password = 'Mot de passe requis'
    else if (form.password.length < 6) errs.password = 'Minimum 6 caractères'
    if (mode === 'register') {
      if (!form.nom.trim()) errs.nom = 'Nom requis'
      if (!form.telephone.trim()) errs.telephone = 'Téléphone requis'
      if (form.password !== form.confirmPassword) errs.confirmPassword = 'Mots de passe différents'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleLogin = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect' : error.message)
      if (data.user) {
        toast.success('Connexion réussie !')
        await redirectAfterLogin(data.user.id)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { nom: form.nom, telephone: form.telephone, role, whatsapp: form.whatsapp || form.telephone } },
      })
      if (error) throw new Error(error.message)

      if (data.user) {
        await supabase.from('utilisateurs').upsert({
          id: data.user.id, nom: form.nom, telephone: form.telephone,
          email: form.email, role, whatsapp: form.whatsapp || form.telephone,
          est_verifie: false, est_actif: true,
        })

        if (role === 'coursier') {
          await supabase.from('coursiers').upsert({
            id: data.user.id, statut: 'hors_ligne',
            statut_verification: 'en_attente', total_courses: 0, total_gains: 0,
          })
        }

        await supabase.from('wallets').upsert({ user_id: data.user.id, solde: 0 })

        if (data.session) {
          toast.success('Compte créé !')
          await redirectAfterLogin(data.user.id)
        } else {
          toast('Vérifiez votre email pour confirmer votre compte', { icon: '📧' })
          setMode('login')
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inscription'
      toast.error(msg.includes('already registered') ? 'Cet email est déjà utilisé' : msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'login') handleLogin()
    else handleRegister()
  }

  const inputClass = (field: string) =>
    `w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-colors ${errors[field] ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-primary-400'}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-primary-400 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-primary-600 font-black text-2xl">N</span>
            </div>
            <span className="text-white font-black text-3xl">NYME</span>
          </Link>
          <p className="text-white/70 mt-2">Livraison Rapide &amp; Intelligente</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex">
            {(['login', 'register'] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-4 font-semibold text-sm transition-all ${mode === m ? 'bg-primary-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {m === 'login' ? 'Se connecter' : 'Créer un compte'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Role selector */}
            {mode === 'register' && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Je suis</label>
                <div className="grid grid-cols-2 gap-3">
                  {([['client', '👤 Client', 'primary'], ['coursier', '🛵 Coursier', 'accent']] as const).map(([r, label, color]) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-3 rounded-xl font-semibold text-sm border-2 transition-all ${role === r ? `border-${color}-500 bg-${color}-50 text-${color}-600` : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nom complet *</label>
                    <input type="text" placeholder="Jean Dupont" value={form.nom}
                      onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                      className={inputClass('nom')} />
                    {errors.nom && <p className="text-red-500 text-xs mt-1">{errors.nom}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Téléphone *</label>
                    <input type="tel" placeholder="+226 XX XX XX XX" value={form.telephone}
                      onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))}
                      className={inputClass('telephone')} />
                    {errors.telephone && <p className="text-red-500 text-xs mt-1">{errors.telephone}</p>}
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Adresse email *</label>
                <input type="email" placeholder="vous@example.com" value={form.email} autoComplete="email"
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className={inputClass('email')} />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Mot de passe *</label>
                <input type="password" value={form.password}
                  placeholder={mode === 'login' ? '••••••••' : 'Minimum 6 caractères'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className={inputClass('password')} />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Confirmer le mot de passe *</label>
                  <input type="password" placeholder="••••••••" value={form.confirmPassword}
                    autoComplete="new-password"
                    onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    className={inputClass('confirmPassword')} />
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 mt-2"
              >
                {loading
                  ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Chargement...</>
                  : mode === 'login' ? '🔑 Se connecter' : '🚀 Créer mon compte'
                }
              </button>
            </form>

            <div className="mt-4 text-center text-sm text-gray-500">
              {mode === 'login'
                ? <>Pas encore membre ?{' '}<button onClick={() => setMode('register')} className="text-primary-500 font-semibold hover:underline">Créer un compte</button></>
                : <>Déjà membre ?{' '}<button onClick={() => setMode('login')} className="text-primary-500 font-semibold hover:underline">Se connecter</button></>
              }
            </div>

            <div className="mt-6 pt-5 border-t border-gray-100 flex justify-center gap-6 text-xs text-gray-400">
              <Link href="/partenaires/login" className="hover:text-primary-500 transition-colors">🏢 Espace Partenaire</Link>
              <Link href="/admin-x9k2m/login" className="hover:text-gray-600 transition-colors">🔒 Admin</Link>
            </div>
          </div>
        </div>

        <p className="text-center text-white/50 text-xs mt-6">© 2024 NYME • Livraison sécurisée</p>
      </div>
    </div>
  )
}

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-primary-400 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <LoginPage />
    </Suspense>
  )
}
