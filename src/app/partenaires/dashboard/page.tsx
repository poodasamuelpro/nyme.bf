'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type PartenaireRow, type LivraisonPartenaire } from '@/lib/supabase'
import {
  Package, TrendingUp, Clock, CheckCircle, XCircle,
  Zap, LogOut, User, Bell, RefreshCw, MapPin, ChevronRight,
  AlertCircle, Calendar, Phone
} from 'lucide-react'
import Link from 'next/link'

// ── Helpers ──────────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = {
  starter:    '🟢 Starter',
  business:   '🟠 Business',
  enterprise: '🏢 Enterprise',
}
const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  en_attente: { label: 'En attente', color: 'text-nyme-amber',  bg: 'bg-nyme-amber/15 border-nyme-amber/30' },
  en_cours:   { label: 'En cours',   color: 'text-nyme-violet', bg: 'bg-nyme-violet/15 border-nyme-violet/30' },
  livre:      { label: 'Livré ✓',    color: 'text-nyme-green',  bg: 'bg-nyme-green/15 border-nyme-green/30' },
  annule:     { label: 'Annulé',     color: 'text-nyme-red',    bg: 'bg-nyme-red/15 border-nyme-red/30' },
}

function StatCard({
  icon: Icon, label, value, sub, color
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-nyme-text-muted text-xs font-body font-semibold uppercase tracking-wider mb-1">{label}</p>
        <p className="font-heading text-2xl font-black text-nyme-text">{value}</p>
        {sub && <p className="text-nyme-text-muted text-xs font-body mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function PartenaireDashboard() {
  const router = useRouter()

  const [user,        setUser]        = useState<any>(null)
  const [partenaire,  setPartenaire]  = useState<PartenaireRow | null>(null)
  const [livraisons,  setLivraisons]  = useState<LivraisonPartenaire[]>([])
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [error,       setError]       = useState('')

  // ── Auth guard ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/partenaires/login')
      } else {
        setUser(data.session.user)
        loadData(data.session.user.id)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') router.replace('/partenaires/login')
    })
    return () => listener.subscription.unsubscribe()
  }, [router])

  // ── Charger données ──
  const loadData = useCallback(async (userId: string) => {
    try {
      // Profil partenaire
      const { data: part, error: partErr } = await supabase
        .from('partenaires')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (partErr && partErr.code !== 'PGRST116') throw partErr

      setPartenaire(part)

      // Livraisons (30 dernières)
      if (part?.id) {
        const { data: livs } = await supabase
          .from('livraisons_partenaire')
          .select('*')
          .eq('partenaire_id', part.id)
          .order('created_at', { ascending: false })
          .limit(30)

        setLivraisons(livs || [])
      }
    } catch (err: any) {
      setError('Erreur de chargement. Vérifiez votre connexion.')
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const handleRefresh = () => {
    if (!user) return
    setRefreshing(true)
    loadData(user.id)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/partenaires/login')
  }

  // ── Stats calculées ──
  const stats = {
    total:      livraisons.length,
    livrees:    livraisons.filter(l => l.statut === 'livre').length,
    en_cours:   livraisons.filter(l => l.statut === 'en_cours').length,
    annulees:   livraisons.filter(l => l.statut === 'annule').length,
    depenses:   livraisons.filter(l => l.statut === 'livre').reduce((s, l) => s + (l.prix || 0), 0),
  }

  const progression = partenaire
    ? Math.min(100, Math.round((partenaire.livraisons_mois / partenaire.livraisons_max) * 100))
    : 0

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-nyme-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-nyme-primary/25 border-t-nyme-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-nyme-text-muted font-body text-sm">Chargement du dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-nyme-bg">

      {/* ── NAVBAR ── */}
      <nav className="bg-nyme-primary-dark border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nyme-orange to-[#d4691a] flex items-center justify-center">
              <Zap size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-heading text-white font-extrabold tracking-wider">NYME</span>
            <span className="hidden sm:block text-white/40 text-xs font-body ml-1">/ Partenaires</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-all"
              title="Actualiser"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/8 border border-white/12">
              <User size={14} className="text-nyme-orange" />
              <span className="text-white/70 text-xs font-body truncate max-w-[120px]">
                {partenaire?.nom_contact || user?.email}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/60 hover:text-nyme-red hover:bg-nyme-red/10 transition-all text-xs font-body font-semibold"
            >
              <LogOut size={14} /> <span className="hidden sm:block">Déconnexion</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* ── Erreur ── */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-nyme-red/10 border border-nyme-red/25 flex items-center gap-3 text-nyme-red text-sm font-body">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-black text-nyme-text">
              Bonjour, {partenaire?.nom_contact?.split(' ')[0] || 'Partenaire'} 👋
            </h1>
            <p className="text-nyme-text-muted text-sm font-body mt-1">
              {partenaire?.entreprise || 'Votre espace partenaire NYME'}
              {partenaire && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-nyme-primary/10 border border-nyme-primary/20 text-nyme-primary">
                  {PLAN_LABELS[partenaire.plan] || partenaire.plan}
                </span>
              )}
            </p>
          </div>
          <a
            href="https://wa.me/22600000000?text=Bonjour+NYME,+je+souhaite+commander+une+livraison"
            target="_blank" rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <Package size={15} /> Commander une livraison
          </a>
        </div>

        {/* ── Alerte quota ── */}
        {partenaire && progression >= 80 && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 text-sm font-body ${
            progression >= 100
              ? 'bg-nyme-red/10 border-nyme-red/25 text-nyme-red'
              : 'bg-nyme-amber/10 border-nyme-amber/25 text-nyme-amber'
          }`}>
            <Bell size={16} className="shrink-0" />
            {progression >= 100
              ? `⚠️ Quota atteint (${partenaire.livraisons_mois}/${partenaire.livraisons_max}). Contactez-nous pour augmenter votre limite.`
              : `🔔 Vous avez utilisé ${progression}% de vos livraisons ce mois.`}
            <a href="mailto:nyme.contact@gmail.com" className="ml-auto underline font-semibold whitespace-nowrap">
              Nous contacter
            </a>
          </div>
        )}

        {/* ── Progression quota ── */}
        {partenaire && (
          <div className="card p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-nyme-text font-semibold text-sm font-body">
                Livraisons ce mois
              </p>
              <p className="text-nyme-text-muted text-sm font-body">
                <span className="text-nyme-primary font-bold">{partenaire.livraisons_mois}</span>
                {' / '}
                <span>{partenaire.livraisons_max}</span>
              </p>
            </div>
            <div className="w-full h-2.5 bg-nyme-bg-input rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  progression >= 100 ? 'bg-nyme-red' :
                  progression >= 80  ? 'bg-nyme-amber' :
                  'bg-gradient-to-r from-nyme-primary to-nyme-orange'
                }`}
                style={{ width: `${progression}%` }}
              />
            </div>
            <p className="text-nyme-text-muted text-xs font-body mt-2">
              {partenaire.livraisons_max - partenaire.livraisons_mois} livraisons restantes
            </p>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatCard icon={Package}     label="Total livraisons" value={stats.total}      color="bg-nyme-primary" />
          <StatCard icon={CheckCircle} label="Livrées"          value={stats.livrees}    color="bg-nyme-green"   sub={`${stats.total > 0 ? Math.round(stats.livrees/stats.total*100) : 0}% succès`} />
          <StatCard icon={Clock}       label="En cours"         value={stats.en_cours}   color="bg-nyme-violet"  />
          <StatCard icon={TrendingUp}  label="Dépenses (FCFA)"  value={stats.depenses > 0 ? `${stats.depenses.toLocaleString()}` : '—'} color="bg-nyme-orange" />
        </div>

        {/* ── Livraisons récentes ── */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-nyme-border flex items-center justify-between">
            <h2 className="font-heading text-nyme-text font-bold text-lg">Livraisons récentes</h2>
            <span className="text-nyme-text-muted text-xs font-body">{livraisons.length} livraison(s)</span>
          </div>

          {livraisons.length === 0 ? (
            <div className="p-12 text-center">
              <Package size={40} className="text-nyme-border mx-auto mb-3" />
              <p className="text-nyme-text font-semibold font-body mb-1">Aucune livraison pour le moment</p>
              <p className="text-nyme-text-muted text-sm font-body mb-4">
                Commandez votre première livraison via WhatsApp ou l'application.
              </p>
              <a
                href="https://wa.me/22600000000"
                target="_blank" rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-2 text-sm"
              >
                💬 Commander sur WhatsApp
              </a>
            </div>
          ) : (
            <div className="divide-y divide-nyme-border">
              {livraisons.map((liv) => {
                const s = STATUT_CONFIG[liv.statut] || STATUT_CONFIG.en_attente
                return (
                  <div key={liv.id} className="p-4 sm:p-5 flex items-start gap-3 sm:gap-4 hover:bg-nyme-bg transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-nyme-bg-input flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin size={16} className="text-nyme-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-nyme-text font-semibold text-sm font-body truncate">
                            {liv.adresse_depart}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <ChevronRight size={12} className="text-nyme-text-muted shrink-0" />
                            <p className="text-nyme-text-muted text-xs font-body truncate">
                              {liv.adresse_arrivee}
                            </p>
                          </div>
                        </div>
                        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold border font-body ${s.bg} ${s.color}`}>
                          {s.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1 text-nyme-text-muted text-xs font-body">
                          <Calendar size={11} />
                          {new Date(liv.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })}
                        </div>
                        {liv.prix && (
                          <span className="text-nyme-orange font-bold text-xs font-body">
                            {liv.prix.toLocaleString()} FCFA
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Contact rapide ── */}
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <div className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-nyme-green/15 flex items-center justify-center shrink-0">
              <span className="text-xl">💬</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-nyme-text font-bold text-sm font-body">WhatsApp direct</p>
              <p className="text-nyme-text-muted text-xs font-body">Commande rapide, question urgente</p>
            </div>
            <a href="https://wa.me/22600000000" target="_blank" rel="noopener noreferrer"
              className="btn-primary text-xs py-2 px-3 whitespace-nowrap">
              Ouvrir
            </a>
          </div>
          <div className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-nyme-primary/10 flex items-center justify-center shrink-0">
              <Phone size={18} className="text-nyme-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-nyme-text font-bold text-sm font-body">Support NYME</p>
              <p className="text-nyme-text-muted text-xs font-body">nyme.contact@gmail.com</p>
            </div>
            <a href="mailto:nyme.contact@gmail.com"
              className="btn-secondary text-xs py-2 px-3 whitespace-nowrap">
              Email
            </a>
          </div>
        </div>

        <p className="text-center text-nyme-text-muted text-xs font-body mt-8">
          © {new Date().getFullYear()} NYME · Dashboard Partenaires · Ouagadougou, Burkina Faso
        </p>
      </div>
    </div>
  )
}
