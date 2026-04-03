// src/app/partenaires/dashboard/page.tsx
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import type { PartenaireRow, LivraisonPartenaireRow } from '@/lib/supabase'
import {
  Package, TrendingUp, Clock, CheckCircle, Zap, LogOut,
  User, Bell, RefreshCw, MapPin, ChevronRight, AlertCircle,
  Calendar, Phone, Wallet, BarChart3, ShieldCheck, Plus,
  FileText, ArrowUpRight, ArrowDownRight, Eye, X, Search,
  Star, CreditCard, Settings, Map, Truck, ChevronDown,
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const MapAdvanced = dynamic(() => import('@/components/MapAdvanced'), { ssr: false })

// ── Types étendus ──────────────────────────────────────────────────

interface CoursierActif {
  id: string
  nom: string
  note_moyenne: number
  total_courses: number
  statut: string
  lat_actuelle: number | null
  lng_actuelle: number | null
}

interface LivraisonProgrammee {
  id?: string
  partenaire_id?: string
  adresse_depart: string
  adresse_arrivee: string
  destinataire_nom: string
  destinataire_tel: string
  destinataire_whatsapp?: string
  instructions?: string
  date_programmee: string // ISO
  heure: string
  recurrence?: 'unique' | 'quotidien' | 'hebdo'
  statut?: string
}

// ── Configs ────────────────────────────────────────────────────────

const PLAN_CFG = {
  starter:    { label: 'Starter',    emoji: '🟢', color: 'bg-green-500/15 text-green-400 border-green-500/25',    max: 30,  prix: 15000 },
  business:   { label: 'Business',   emoji: '🟠', color: 'bg-orange-500/15 text-orange-400 border-orange-500/25', max: 100, prix: 35000 },
  enterprise: { label: 'Enterprise', emoji: '🏢', color: 'bg-purple-500/15 text-purple-400 border-purple-500/25', max: 500, prix: 75000 },
}

const STATUT_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  en_attente: { label: 'En attente', color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200',   dot: 'bg-amber-400' },
  en_cours:   { label: 'En cours',   color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', dot: 'bg-purple-500' },
  livre:      { label: 'Livré ✓',    color: 'text-green-600',  bg: 'bg-green-50 border-green-200',   dot: 'bg-green-500' },
  annule:     { label: 'Annulé',     color: 'text-red-600',    bg: 'bg-red-50 border-red-200',       dot: 'bg-red-500' },
}

const TABS = [
  { id: 'dashboard',   label: 'Dashboard',   icon: BarChart3 },
  { id: 'livraisons',  label: 'Livraisons',  icon: Package },
  { id: 'planifier',   label: 'Planifier',   icon: Calendar },
  { id: 'carte',       label: 'Carte Live',  icon: Map },
  { id: 'coursiers',   label: 'Coursiers',   icon: Truck },
  { id: 'wallet',      label: 'Wallet',      icon: Wallet },
  { id: 'compte',      label: 'Compte',      icon: Settings },
]

// ── Utilitaires ────────────────────────────────────────────────────

function formatXOF(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' XOF'
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

// ── Sous-composants ────────────────────────────────────────────────

function Badge({ statut }: { statut: string }) {
  const s = STATUT_CFG[statut] || STATUT_CFG.en_attente
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${s.bg} ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, sub, color, trend }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string; trend?: 'up' | 'down'
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm flex items-start gap-4 border border-gray-100">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-black text-gray-900">{value}</p>
          {trend === 'up'   && <ArrowUpRight   size={14} className="text-green-500" />}
          {trend === 'down' && <ArrowDownRight size={14} className="text-red-500" />}
        </div>
        {sub && <p className="text-gray-400 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────

export default function PartenaireDashboard() {
  const router = useRouter()

  const [userId,      setUserId]      = useState<string | null>(null)
  const [partenaire,  setPartenaire]  = useState<PartenaireRow | null>(null)
  const [livraisons,  setLivraisons]  = useState<LivraisonPartenaireRow[]>([])
  const [coursiers,   setCoursiers]   = useState<CoursierActif[]>([])
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [tab,         setTab]         = useState('dashboard')
  const [recherche,   setRecherche]   = useState('')
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [detail,      setDetail]      = useState<LivraisonPartenaireRow | null>(null)
  const [alertes,     setAlertes]     = useState<string[]>([])

  // Formulaire nouvelle livraison
  const [showForm,    setShowForm]    = useState(false)
  const [formData,    setFormData]    = useState<LivraisonProgrammee>({
    adresse_depart: '', adresse_arrivee: '',
    destinataire_nom: '', destinataire_tel: '', destinataire_whatsapp: '',
    instructions: '', date_programmee: '', heure: '09:00',
    recurrence: 'unique',
  })
  const [submitting,  setSubmitting]  = useState(false)

  // Adresses favorites
  const [adressesFavorites, setAdressesFavorites] = useState<{ id: string; label: string; adresse: string }[]>([])

  // Coursier favori du mois
  const [coursierFavori, setCoursierFavori] = useState<CoursierActif | null>(null)

  // Wallet abonnement
  const [soldeWallet, setSoldeWallet] = useState(0)
  const [txWallet,    setTxWallet]    = useState<Array<{ type: string; montant: number; note: string; created_at: string }>>([])

  // ── Chargement données ─────────────────────────────────────────

  const loadData = useCallback(async (uid: string) => {
    try {
      // Profil partenaire
      const { data: part, error: partErr } = await supabase
        .from('partenaires').select('*').eq('user_id', uid).single()
      if (partErr || !part) {
        toast.error('Profil partenaire introuvable')
        router.push('/partenaires/login')
        return
      }
      setPartenaire(part)

      // Livraisons
      const { data: livs } = await supabase
        .from('livraisons_partenaire').select('*')
        .eq('partenaire_id', part.id)
        .order('created_at', { ascending: false }).limit(200)
      const livsData = (livs || []) as LivraisonPartenaireRow[]
      setLivraisons(livsData)
      detecterAlertes(livsData, part)

      // Coursiers disponibles
      const { data: cData } = await supabase
        .from('coursiers')
        .select('id, statut, lat_actuelle, lng_actuelle, total_courses, note_moyenne')
        .in('statut', ['disponible', 'occupé'])
      if (cData) {
        const ids = cData.map(c => c.id)
        const { data: uData } = await supabase.from('utilisateurs').select('id, nom').in('id', ids)
        const enriched: CoursierActif[] = cData.map(c => ({
          ...c,
          nom: uData?.find(u => u.id === c.id)?.nom || 'Coursier',
        }))
        setCoursiers(enriched)

        // Coursier favori du mois = le plus de courses livrées pour ce partenaire
        const coursierCounts: Record<string, number> = {}
        livsData.filter(l => l.statut === 'livre' && l.coursier_id).forEach(l => {
          if (l.coursier_id) coursierCounts[l.coursier_id] = (coursierCounts[l.coursier_id] || 0) + 1
        })
        const topId = Object.entries(coursierCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
        if (topId) setCoursierFavori(enriched.find(c => c.id === topId) || null)
      }

      // Adresses favorites
      const { data: aData } = await supabase
        .from('adresses_favorites').select('id, label, adresse')
        .eq('user_id', uid).order('est_defaut', { ascending: false })
      setAdressesFavorites(aData || [])

      // Wallet partenaire (via wallets table)
      const { data: walletData } = await supabase.from('wallets').select('solde').eq('user_id', uid).single()
      setSoldeWallet(walletData?.solde || 0)

      const { data: txData } = await supabase.from('transactions_wallet').select('type, montant, note, created_at')
        .eq('user_id', uid).order('created_at', { ascending: false }).limit(30)
      setTxWallet(txData || [])

    } catch (err) {
      console.error('[PartenaireDashboard]', err)
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/partenaires/login'); return }
      setUserId(session.user.id)
      loadData(session.user.id)
    })

    // Realtime livraisons
    const channel = supabase.channel('partenaire-livraisons')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'livraisons_partenaire' }, () => {
        if (userId) loadData(userId)
      })
      .subscribe()

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/partenaires/login')
    })

    return () => {
      supabase.removeChannel(channel)
      authListener.subscription.unsubscribe()
    }
  }, [router, loadData, userId])

  // ── Alertes sécurité ───────────────────────────────────────────

  const detecterAlertes = (livs: LivraisonPartenaireRow[], part: PartenaireRow) => {
    const a: string[] = []
    const total = livs.length
    const annulees = livs.filter(l => l.statut === 'annule').length
    if (total > 5 && annulees / total > 0.4)
      a.push(`Taux d'annulation élevé : ${Math.round(annulees / total * 100)}%`)
    if (part.livraisons_mois >= part.livraisons_max)
      a.push(`Quota mensuel atteint : ${part.livraisons_mois}/${part.livraisons_max}`)
    if (part.statut === 'en_attente')
      a.push('Compte en attente de validation NYME')
    setAlertes(a)
  }

  // ── Nouvelle livraison programmée ──────────────────────────────

  const handleSubmitLivraison = async () => {
    if (!partenaire) return
    if (!formData.adresse_depart || !formData.adresse_arrivee || !formData.destinataire_nom || !formData.destinataire_tel) {
      toast.error('Remplissez tous les champs obligatoires')
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('livraisons_partenaire').insert({
        partenaire_id: partenaire.id,
        adresse_depart: formData.adresse_depart,
        adresse_arrivee: formData.adresse_arrivee,
        destinataire_nom: formData.destinataire_nom,
        destinataire_tel: formData.destinataire_tel,
        instructions: formData.instructions || null,
        statut: 'en_attente',
      })
      if (error) throw error
      toast.success('Livraison programmée !')
      setShowForm(false)
      setFormData({ adresse_depart: '', adresse_arrivee: '', destinataire_nom: '', destinataire_tel: '', destinataire_whatsapp: '', instructions: '', date_programmee: '', heure: '09:00', recurrence: 'unique' })
      if (userId) loadData(userId)
    } catch (err) {
      toast.error('Erreur lors de la création')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Paiement abonnement ────────────────────────────────────────

  const handlePaiementAbonnement = async () => {
    if (!partenaire || !userId) return
    const planPrix = PLAN_CFG[partenaire.plan].prix
    if (soldeWallet < planPrix) {
      toast.error(`Solde insuffisant. Vous avez ${formatXOF(soldeWallet)}, abonnement ${formatXOF(planPrix)}`)
      return
    }
    try {
      const { error } = await supabase.rpc('debit_wallet', {
        p_user_id: userId,
        p_montant: planPrix,
        p_type: 'abonnement',
        p_description: `Abonnement ${partenaire.plan} — ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
        p_reference: `ABO_${partenaire.id}_${Date.now()}`,
      })
      if (error) throw error
      toast.success(`Abonnement ${PLAN_CFG[partenaire.plan].label} renouvelé !`)
      if (userId) loadData(userId)
    } catch {
      toast.error('Erreur paiement abonnement')
    }
  }

  // ── Changer de plan ────────────────────────────────────────────

  const handleChangerPlan = async (newPlan: 'starter' | 'business' | 'enterprise') => {
    if (!partenaire) return
    const { error } = await supabase.from('partenaires').update({ plan: newPlan }).eq('id', partenaire.id)
    if (error) { toast.error('Erreur'); return }
    toast.success(`Plan changé vers ${PLAN_CFG[newPlan].label}`)
    if (userId) loadData(userId)
  }

  // ── Export CSV ─────────────────────────────────────────────────

  const exportCSV = () => {
    const rows = [
      ['ID', 'Date', 'Départ', 'Arrivée', 'Destinataire', 'Téléphone', 'Statut', 'Prix (XOF)', 'Commission'],
      ...livraisons.map(l => [
        l.id.slice(0, 8),
        new Date(l.created_at).toLocaleDateString('fr-FR'),
        l.adresse_depart,
        l.adresse_arrivee,
        l.destinataire_nom || '',
        l.destinataire_tel || '',
        STATUT_CFG[l.statut]?.label || l.statut,
        l.prix || 0,
        l.commission || 0,
      ])
    ].map(r => r.join(';')).join('\n')

    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\ufeff' + rows], { type: 'text/csv;charset=utf-8;' }))
    a.download = `nyme-livraisons-${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.csv`
    a.click()
  }

  // ── Stats ──────────────────────────────────────────────────────

  const stats = {
    total:       livraisons.length,
    livrees:     livraisons.filter(l => l.statut === 'livre').length,
    enCours:     livraisons.filter(l => l.statut === 'en_cours').length,
    enAttente:   livraisons.filter(l => l.statut === 'en_attente').length,
    annulees:    livraisons.filter(l => l.statut === 'annule').length,
    depenses:    livraisons.filter(l => l.statut === 'livre').reduce((s, l) => s + (l.prix || 0), 0),
    commissions: livraisons.filter(l => l.statut === 'livre').reduce((s, l) => s + (l.commission || 0), 0),
    txSucces:    livraisons.length > 0 ? Math.round(livraisons.filter(l => l.statut === 'livre').length / livraisons.length * 100) : 0,
  }

  const progression = partenaire ? Math.min(100, Math.round(partenaire.livraisons_mois / partenaire.livraisons_max * 100)) : 0

  const livraisonsFiltrees = livraisons.filter(l => {
    const matchStatut = filtreStatut === 'tous' || l.statut === filtreStatut
    const q = recherche.toLowerCase()
    const matchRech = !q ||
      l.adresse_depart.toLowerCase().includes(q) ||
      l.adresse_arrivee.toLowerCase().includes(q) ||
      (l.destinataire_nom || '').toLowerCase().includes(q) ||
      (l.destinataire_tel || '').includes(q)
    return matchStatut && matchRech
  })

  const comptaParMois = livraisons.filter(l => l.statut === 'livre' && l.prix).reduce((acc, l) => {
    const mois = new Date(l.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    if (!acc[mois]) acc[mois] = { nb: 0, depenses: 0, commissions: 0 }
    acc[mois].nb++
    acc[mois].depenses += l.prix || 0
    acc[mois].commissions += l.commission || 0
    return acc
  }, {} as Record<string, { nb: number; depenses: number; commissions: number }>)

  // Prochaines 30 jours — planning simple
  const planning30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const livsJour = livraisons.filter(l => l.created_at.startsWith(dateStr))
    return { date: d, livraisons: livsJour }
  })

  const inputClass = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-colors bg-white'

  // ── Logout ─────────────────────────────────────────────────────

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/partenaires/login'
  }

  // ── Loading ────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Chargement du dashboard...</p>
      </div>
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-orange-500 flex items-center justify-center">
              <Zap size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-black text-gray-900 tracking-wider">NYME</span>
            <span className="text-gray-400 text-xs ml-1 hidden sm:block">/ Partenaires</span>
          </Link>

          <div className="flex items-center gap-2">
            {alertes.length > 0 && (
              <button className="relative p-2 rounded-lg text-red-500 hover:bg-red-50" title="Alertes">
                <AlertCircle size={18} />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">{alertes.length}</span>
              </button>
            )}
            <button onClick={() => { if (userId) { setRefreshing(true); loadData(userId) } }} disabled={refreshing}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100">
              <User size={13} className="text-blue-600" />
              <span className="text-gray-700 text-xs truncate max-w-[120px]">{partenaire?.nom_contact}</span>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all text-xs font-semibold">
              <LogOut size={14} /><span className="hidden sm:block">Déco</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto scrollbar-hide">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${tab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              <t.icon size={13} />{t.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Alertes globales */}
        {alertes.length > 0 && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-1">
            <p className="text-red-600 font-bold text-sm flex items-center gap-2"><AlertCircle size={14} />Alertes ({alertes.length})</p>
            {alertes.map((a, i) => <p key={i} className="text-red-500 text-xs ml-5">• {a}</p>)}
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                  Bonjour, {partenaire?.nom_contact?.split(' ')[0]} 👋
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <p className="text-gray-500 text-sm">{partenaire?.entreprise}</p>
                  {partenaire && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${PLAN_CFG[partenaire.plan].color}`}>
                      {PLAN_CFG[partenaire.plan].emoji} {PLAN_CFG[partenaire.plan].label}
                    </span>
                  )}
                  {partenaire?.statut === 'en_attente' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">⏳ Validation en attente</span>
                  )}
                  {partenaire?.statut === 'actif' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-600 border border-green-200">✅ Actif</span>
                  )}
                </div>
              </div>
              <button onClick={() => { setTab('planifier'); setShowForm(true) }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap">
                <Plus size={16} /> Nouvelle livraison
              </button>
            </div>

            {/* Quota */}
            {partenaire && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-gray-900 text-sm">Quota mensuel</p>
                  <p className="text-gray-500 text-sm">
                    <span className="text-blue-600 font-black text-lg">{partenaire.livraisons_mois}</span> / {partenaire.livraisons_max}
                  </p>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${progression >= 100 ? 'bg-red-500' : progression >= 80 ? 'bg-amber-400' : 'bg-gradient-to-r from-blue-500 to-blue-400'}`}
                    style={{ width: `${Math.min(100, progression)}%` }} />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-gray-400 text-xs">
                    {partenaire.livraisons_max - partenaire.livraisons_mois > 0
                      ? `${partenaire.livraisons_max - partenaire.livraisons_mois} restantes`
                      : '🚨 Quota atteint — contactez NYME'}
                  </p>
                  {progression >= 80 && (
                    <button onClick={() => setTab('wallet')} className="text-xs text-blue-600 font-semibold hover:underline">Upgrader →</button>
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard icon={Package}     label="Total"       value={stats.total}    color="bg-blue-500" />
              <StatCard icon={CheckCircle} label="Livrées"     value={stats.livrees}  color="bg-green-500" sub={`${stats.txSucces}% succès`} trend={stats.txSucces >= 80 ? 'up' : 'down'} />
              <StatCard icon={Clock}       label="En cours"    value={stats.enCours}  color="bg-purple-500" />
              <StatCard icon={TrendingUp}  label="Dépenses"    value={stats.depenses > 0 ? formatXOF(stats.depenses) : '—'} color="bg-orange-500" />
            </div>

            {/* Coursier du mois */}
            {coursierFavori && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-black text-xl">
                  {coursierFavori.nom.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900">{coursierFavori.nom}</p>
                    <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Star size={10} />Coursier du mois</span>
                  </div>
                  <p className="text-gray-500 text-xs">⭐ {coursierFavori.note_moyenne?.toFixed(1) || '—'}/5 • {livraisons.filter(l => l.coursier_id === coursierFavori.id && l.statut === 'livre').length} courses pour vous</p>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${coursierFavori.statut === 'disponible' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${coursierFavori.statut === 'disponible' ? 'bg-green-500 animate-pulse' : 'bg-orange-400'}`} />
                  {coursierFavori.statut === 'disponible' ? 'Disponible' : 'En course'}
                </div>
              </div>
            )}

            {/* Livraisons récentes */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-lg">Livraisons récentes</h2>
                <button onClick={() => setTab('livraisons')} className="text-blue-600 text-xs hover:underline">Voir tout →</button>
              </div>
              {livraisons.length === 0 ? (
                <div className="p-12 text-center">
                  <Package size={40} className="text-gray-300 mx-auto mb-3" />
                  <p className="font-semibold text-gray-900 mb-1">Aucune livraison</p>
                  <p className="text-gray-400 text-sm mb-4">Créez votre première livraison</p>
                  <button onClick={() => { setTab('planifier'); setShowForm(true) }}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700">
                    + Nouvelle livraison
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {livraisons.slice(0, 6).map(l => (
                    <div key={l.id} onClick={() => setDetail(l)}
                      className="p-4 flex items-start gap-3 hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <MapPin size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{l.adresse_depart}</p>
                            <p className="text-gray-400 text-xs truncate">→ {l.adresse_arrivee}</p>
                          </div>
                          <Badge statut={l.statut} />
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-gray-400 text-xs flex items-center gap-1"><Calendar size={9} />{formatDate(l.created_at)}</span>
                          {l.prix && <span className="text-orange-600 font-bold text-xs">{formatXOF(l.prix)}</span>}
                          {l.destinataire_nom && <span className="text-gray-400 text-xs">👤 {l.destinataire_nom}</span>}
                        </div>
                      </div>
                      <Eye size={13} className="text-gray-300 mt-1 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contacts rapides */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">💬</div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">WhatsApp NYME</p>
                  <p className="text-gray-400 text-xs">Commande express</p>
                </div>
                <a href="https://wa.me/22600000000" target="_blank" rel="noopener noreferrer"
                  className="px-3 py-2 bg-green-500 text-white rounded-xl font-bold text-xs hover:bg-green-600">Ouvrir</a>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><Phone size={18} className="text-blue-600" /></div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">Support NYME</p>
                  <p className="text-gray-400 text-xs">nyme.contact@gmail.com</p>
                </div>
                <a href="mailto:nyme.contact@gmail.com"
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-200">Email</a>
              </div>
            </div>
          </div>
        )}

        {/* ── LIVRAISONS ── */}
        {tab === 'livraisons' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="text-xl font-black text-gray-900">Livraisons <span className="text-gray-400 text-sm font-normal">({livraisons.length})</span></h2>
              <button onClick={() => { setTab('planifier'); setShowForm(true) }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700">
                <Plus size={14} /> Nouvelle
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Adresse, destinataire..." value={recherche}
                  onChange={e => setRecherche(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400" />
              </div>
              <div className="flex gap-2 flex-wrap">
                {['tous', 'en_attente', 'en_cours', 'livre', 'annule'].map(s => (
                  <button key={s} onClick={() => setFiltreStatut(s)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${filtreStatut === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                    {s === 'tous' ? 'Tous' : STATUT_CFG[s]?.label || s}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {livraisonsFiltrees.length === 0 ? (
                <div className="p-10 text-center text-gray-400"><Package size={32} className="mx-auto mb-3 opacity-30" />Aucune livraison</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {livraisonsFiltrees.map(l => (
                    <div key={l.id} onClick={() => setDetail(l)}
                      className="p-4 sm:p-5 flex items-start gap-3 hover:bg-gray-50 cursor-pointer">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <MapPin size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{l.adresse_depart}</p>
                            <p className="text-gray-400 text-xs truncate">→ {l.adresse_arrivee}</p>
                          </div>
                          <Badge statut={l.statut} />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Calendar size={9} />{formatDate(l.created_at)}</span>
                          {l.prix && <span className="text-orange-600 font-bold">{formatXOF(l.prix)}</span>}
                          {l.destinataire_nom && <span>👤 {l.destinataire_nom}</span>}
                          {l.destinataire_tel && <a href={`tel:${l.destinataire_tel}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-blue-500 hover:underline"><Phone size={9} />{l.destinataire_tel}</a>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Export */}
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <FileText size={14} /> Exporter CSV
            </button>
          </div>
        )}

        {/* ── PLANIFIER ── */}
        {tab === 'planifier' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">Planifier des livraisons</h2>
              <button onClick={() => setShowForm(!showForm)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700">
                <Plus size={14} /> Nouvelle livraison
              </button>
            </div>

            {/* Formulaire */}
            {showForm && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-200 space-y-4">
                <h3 className="font-bold text-gray-900">Créer une livraison</h3>

                {/* Adresses favorites */}
                {adressesFavorites.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Adresses favorites</label>
                    <div className="flex flex-wrap gap-2">
                      {adressesFavorites.map(a => (
                        <button key={a.id} onClick={() => setFormData(p => ({ ...p, adresse_depart: a.adresse }))}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 border border-blue-200">
                          📍 {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Adresse départ *</label>
                    <input type="text" placeholder="Ex: Avenue Kwame Nkrumah..." value={formData.adresse_depart}
                      onChange={e => setFormData(p => ({ ...p, adresse_depart: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Adresse destination *</label>
                    <input type="text" placeholder="Ex: Secteur 15, Ouagadougou..." value={formData.adresse_arrivee}
                      onChange={e => setFormData(p => ({ ...p, adresse_arrivee: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nom destinataire *</label>
                    <input type="text" placeholder="Jean Dupont" value={formData.destinataire_nom}
                      onChange={e => setFormData(p => ({ ...p, destinataire_nom: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Téléphone destinataire *</label>
                    <input type="tel" placeholder="+226 XX XX XX XX" value={formData.destinataire_tel}
                      onChange={e => setFormData(p => ({ ...p, destinataire_tel: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">WhatsApp destinataire</label>
                    <input type="tel" placeholder="+226 XX XX XX XX" value={formData.destinataire_whatsapp}
                      onChange={e => setFormData(p => ({ ...p, destinataire_whatsapp: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Date programmée</label>
                    <input type="date" value={formData.date_programmee} min={new Date().toISOString().split('T')[0]}
                      max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      onChange={e => setFormData(p => ({ ...p, date_programmee: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Heure</label>
                    <input type="time" value={formData.heure}
                      onChange={e => setFormData(p => ({ ...p, heure: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Récurrence</label>
                    <select value={formData.recurrence} onChange={e => setFormData(p => ({ ...p, recurrence: e.target.value as 'unique' | 'quotidien' | 'hebdo' }))} className={inputClass}>
                      <option value="unique">Livraison unique</option>
                      <option value="quotidien">Quotidien (30 jours)</option>
                      <option value="hebdo">Hebdomadaire (4 semaines)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Instructions (optionnel)</label>
                  <textarea placeholder="Ex: Sonner à l'interphone, fragile..." value={formData.instructions}
                    onChange={e => setFormData(p => ({ ...p, instructions: e.target.value }))}
                    className={`${inputClass} resize-none h-20`} />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-700 hover:bg-gray-50">Annuler</button>
                  <button onClick={handleSubmitLivraison} disabled={submitting}
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50">
                    {submitting ? 'Création...' : '🚀 Créer la livraison'}
                  </button>
                </div>
              </div>
            )}

            {/* Planning 30 jours */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Planning — 30 prochains jours</h3>
              </div>
              <div className="p-4 grid grid-cols-7 gap-1">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(j => (
                  <div key={j} className="text-center text-xs font-semibold text-gray-400 py-2">{j}</div>
                ))}
                {planning30.map(({ date, livraisons: livsJour }, i) => (
                  <div key={i}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${livsJour.length > 0 ? 'bg-blue-100 border-2 border-blue-300' : 'bg-gray-50 hover:bg-gray-100 border border-gray-100'}`}
                    title={`${date.toLocaleDateString('fr-FR')} — ${livsJour.length} livraison(s)`}>
                    <span className="text-xs font-bold text-gray-700">{date.getDate()}</span>
                    {livsJour.length > 0 && <span className="w-4 h-4 bg-blue-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold mt-0.5">{livsJour.length}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CARTE LIVE ── */}
        {tab === 'carte' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-gray-900">Carte en temps réel</h2>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />Coursiers disponibles ({coursiers.filter(c => c.statut === 'disponible').length})</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-400" />En course ({coursiers.filter(c => c.statut === 'occupé').length})</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500" />Livraisons en cours ({stats.enCours})</div>
            </div>

            <div className="h-96 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
              <MapAdvanced
                coursier={coursiers.find(c => c.lat_actuelle && c.lng_actuelle) ? {
                  lat: coursiers.find(c => c.lat_actuelle)?.lat_actuelle!,
                  lng: coursiers.find(c => c.lng_actuelle)?.lng_actuelle!,
                  nom: 'Coursiers actifs',
                } : undefined}
              />
            </div>

            {/* Liste coursiers sur la carte */}
            {coursiers.filter(c => c.lat_actuelle && c.lng_actuelle).length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Coursiers localisés</h3></div>
                <div className="divide-y divide-gray-50">
                  {coursiers.filter(c => c.lat_actuelle).map(c => (
                    <div key={c.id} className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">{c.nom.charAt(0)}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{c.nom}</p>
                        <p className="text-xs text-gray-400">⭐ {c.note_moyenne?.toFixed(1) || '—'} • {c.total_courses} courses totales</p>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${c.statut === 'disponible' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.statut === 'disponible' ? 'bg-green-500 animate-pulse' : 'bg-orange-400'}`} />
                        {c.statut === 'disponible' ? 'Disponible' : 'En course'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── COURSIERS ── */}
        {tab === 'coursiers' && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-gray-900">Gestion des coursiers</h2>

            {/* Coursier favori du mois */}
            {coursierFavori && (
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-white shadow-md">
                <p className="text-white/70 text-sm mb-3 flex items-center gap-2"><Star size={14} />Coursier du mois</p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-3xl font-black">{coursierFavori.nom.charAt(0)}</div>
                  <div>
                    <h3 className="text-xl font-black">{coursierFavori.nom}</h3>
                    <p className="text-white/80 text-sm">
                      {livraisons.filter(l => l.coursier_id === coursierFavori.id && l.statut === 'livre').length} livraisons pour vous •
                      ⭐ {coursierFavori.note_moyenne?.toFixed(1) || '—'}/5
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tous les coursiers */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Coursiers disponibles ({coursiers.length})</h3>
              </div>
              {coursiers.length === 0 ? (
                <div className="p-10 text-center text-gray-400">
                  <Truck size={32} className="mx-auto mb-3 opacity-30" />
                  <p>Aucun coursier disponible pour le moment</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {coursiers.map(c => {
                    const nbCoursesPour = livraisons.filter(l => l.coursier_id === c.id && l.statut === 'livre').length
                    return (
                      <div key={c.id} className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">{c.nom.charAt(0)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900">{c.nom}</p>
                            {nbCoursesPour > 0 && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{nbCoursesPour} pour vous</span>}
                          </div>
                          <p className="text-xs text-gray-400">⭐ {c.note_moyenne?.toFixed(1) || 'Nouveau'}/5 • {c.total_courses} courses totales</p>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${c.statut === 'disponible' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.statut === 'disponible' ? 'bg-green-500 animate-pulse' : 'bg-orange-400'}`} />
                          {c.statut === 'disponible' ? 'Disponible' : 'En course'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── WALLET ── */}
        {tab === 'wallet' && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-gray-900">Wallet & Abonnement</h2>

            {/* Solde */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl">
              <p className="text-white/70 text-sm mb-1">Solde disponible</p>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-5xl font-black">{soldeWallet.toLocaleString()}</span>
                <span className="text-xl font-semibold">XOF</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                {Object.entries(PLAN_CFG).map(([plan, cfg]) => (
                  <button key={plan} onClick={() => handleChangerPlan(plan as keyof typeof PLAN_CFG)}
                    className={`rounded-xl p-3 transition-all ${partenaire?.plan === plan ? 'bg-white text-blue-700' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    <p className="font-black">{cfg.emoji} {cfg.label}</p>
                    <p className="text-xs mt-0.5 opacity-70">{formatXOF(cfg.prix)}/mois</p>
                    <p className="text-xs opacity-70">{cfg.max} livraisons</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Payer abonnement */}
            {partenaire && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><CreditCard size={16} />Abonnement mensuel</h3>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-gray-900">Plan {PLAN_CFG[partenaire.plan].label}</p>
                    <p className="text-gray-400 text-sm">{PLAN_CFG[partenaire.plan].max} livraisons/mois</p>
                  </div>
                  <p className="text-2xl font-black text-blue-600">{formatXOF(PLAN_CFG[partenaire.plan].prix)}</p>
                </div>
                <button onClick={handlePaiementAbonnement}
                  disabled={soldeWallet < PLAN_CFG[partenaire.plan].prix}
                  className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {soldeWallet >= PLAN_CFG[partenaire.plan].prix
                    ? `💳 Payer ${formatXOF(PLAN_CFG[partenaire.plan].prix)}`
                    : `Solde insuffisant (manque ${formatXOF(PLAN_CFG[partenaire.plan].prix - soldeWallet)})`}
                </button>
                {partenaire.date_fin && (
                  <p className="text-center text-gray-400 text-xs mt-2">Expire le {new Date(partenaire.date_fin).toLocaleDateString('fr-FR')}</p>
                )}
              </div>
            )}

            {/* Finances */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Dépenses', value: stats.depenses, color: 'text-blue-600' },
                { label: 'Commissions', value: stats.commissions, color: 'text-orange-600' },
                { label: 'Net', value: stats.depenses - stats.commissions, color: 'text-green-600' },
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                  <p className="text-gray-400 text-xs mb-1">{c.label}</p>
                  <p className={`font-black text-lg ${c.color}`}>{c.value > 0 ? c.value.toLocaleString() : '—'}</p>
                  <p className="text-gray-400 text-xs">XOF</p>
                </div>
              ))}
            </div>

            {/* Historique transactions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100"><h3 className="font-bold text-gray-900">Historique transactions</h3></div>
              {txWallet.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">Aucune transaction</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {txWallet.map((tx, i) => (
                    <div key={i} className="flex items-center gap-4 p-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg">
                        {['recharge', 'gain', 'gain_course'].includes(tx.type) ? '💳' : '📦'}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{tx.note || tx.type}</p>
                        <p className="text-gray-400 text-xs">{formatDate(tx.created_at)}</p>
                      </div>
                      <p className={`font-black text-sm ${['recharge', 'gain', 'gain_course'].includes(tx.type) ? 'text-green-600' : 'text-red-500'}`}>
                        {['recharge', 'gain', 'gain_course'].includes(tx.type) ? '+' : '-'}{tx.montant.toLocaleString()} XOF
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Récap mensuel */}
            {Object.keys(comptaParMois).length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">Récapitulatif mensuel</h3>
                  <button onClick={exportCSV} className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline"><FileText size={11} />Export CSV</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b border-gray-100">
                      {['Mois', 'Livraisons', 'Montant', 'Commission'].map(h => (
                        <th key={h} className={`px-4 py-3 text-gray-400 text-xs uppercase ${h === 'Mois' ? 'text-left' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {Object.entries(comptaParMois).map(([mois, data]) => (
                        <tr key={mois} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 font-medium capitalize">{mois}</td>
                          <td className="px-4 py-3 text-right text-gray-900">{data.nb}</td>
                          <td className="px-4 py-3 text-right text-blue-600 font-semibold">{formatXOF(data.depenses)}</td>
                          <td className="px-4 py-3 text-right text-orange-600">{formatXOF(data.commissions)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── COMPTE ── */}
        {tab === 'compte' && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-gray-900">Mon compte</h2>

            {partenaire && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900">Informations</h3>
                {[
                  ['Entreprise', partenaire.entreprise],
                  ['Contact', partenaire.nom_contact],
                  ['Email', partenaire.email_pro || '—'],
                  ['Téléphone', partenaire.telephone || '—'],
                  ['Plan', `${PLAN_CFG[partenaire.plan].emoji} ${PLAN_CFG[partenaire.plan].label}`],
                  ['Statut', partenaire.statut === 'actif' ? '✅ Actif' : partenaire.statut === 'en_attente' ? '⏳ En attente' : '❌ Suspendu'],
                  ['Commission NYME', `${partenaire.taux_commission}%`],
                  ['Membre depuis', new Date(partenaire.date_debut).toLocaleDateString('fr-FR')],
                ].map(([label, value], i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-gray-500 text-sm">{label}</span>
                    <span className="font-semibold text-gray-900 text-sm text-right">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Sécurité */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><ShieldCheck size={15} className="text-blue-600" />Sécurité & Anti-fraude</h3>
              {alertes.length === 0 ? (
                <div className="flex items-center gap-3 text-green-600 text-sm"><CheckCircle size={15} />Aucune alerte — compte sécurisé ✓</div>
              ) : (
                alertes.map((a, i) => (
                  <div key={i} className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-2">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />{a}
                  </div>
                ))
              )}
              {partenaire && (
                <div className="space-y-2 mt-2">
                  {[
                    { label: 'Taux de succès', val: stats.txSucces, color: stats.txSucces >= 80 ? 'bg-green-500' : 'bg-red-500' },
                    { label: "Taux d'annulation", val: stats.total > 0 ? Math.round(stats.annulees / stats.total * 100) : 0, color: 'bg-red-500' },
                    { label: 'Utilisation quota', val: progression, color: progression >= 90 ? 'bg-red-500' : progression >= 70 ? 'bg-amber-400' : 'bg-blue-500' },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between mb-1"><span className="text-gray-500 text-xs">{item.label}</span><span className="text-gray-900 text-xs font-bold">{item.val}%</span></div>
                      <div className="h-1.5 bg-gray-100 rounded-full"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.min(100, item.val)}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <a href="mailto:nyme.contact@gmail.com"
                className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 transition-all">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><Phone size={16} className="text-blue-600" /></div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Contacter NYME</p>
                  <p className="text-gray-400 text-xs">nyme.contact@gmail.com</p>
                </div>
              </a>
              <button onClick={handleLogout}
                className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-red-100 hover:border-red-200 transition-all text-left">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center"><LogOut size={16} className="text-red-500" /></div>
                <div>
                  <p className="font-bold text-red-600 text-sm">Déconnexion</p>
                  <p className="text-gray-400 text-xs">Quitter le dashboard</p>
                </div>
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-gray-400 text-xs mt-8 pb-4">
          © {new Date().getFullYear()} NYME · Dashboard Partenaires · Ouagadougou, Burkina Faso
        </p>
      </div>

      {/* ── MODAL DÉTAIL LIVRAISON ── */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-black text-gray-900">Livraison #{detail.id.slice(0, 8).toUpperCase()}</h3>
              <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={15} className="text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-sm">Statut</span>
                <Badge statut={detail.statut} />
              </div>

              {detail.lat_depart && detail.lng_depart && (
                <div className="h-48 rounded-xl overflow-hidden border border-gray-200">
                  <MapAdvanced
                    depart={{ lat: detail.lat_depart, lng: detail.lng_depart, label: detail.adresse_depart }}
                    arrivee={detail.lat_arrivee && detail.lng_arrivee ? { lat: detail.lat_arrivee, lng: detail.lng_arrivee, label: detail.adresse_arrivee } : undefined}
                  />
                </div>
              )}

              {[
                ['📍 Départ', detail.adresse_depart],
                ['🏁 Arrivée', detail.adresse_arrivee],
                ['👤 Destinataire', detail.destinataire_nom || '—'],
                ['📞 Téléphone', detail.destinataire_tel ? (
                  <a href={`tel:${detail.destinataire_tel}`} className="text-blue-600 hover:underline">{detail.destinataire_tel}</a>
                ) : '—'],
                ['📝 Instructions', detail.instructions || '—'],
                ['💰 Prix', detail.prix ? formatXOF(detail.prix) : '—'],
                ['📅 Date', formatDate(detail.created_at)],
              ].map(([label, value], i) => (
                <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500 text-sm shrink-0">{label as string}</span>
                  <span className="text-gray-900 text-sm text-right">{value as React.ReactNode}</span>
                </div>
              ))}

              {detail.destinataire_tel && (
                <div className="flex gap-2 mt-2">
                  <a href={`tel:${detail.destinataire_tel}`}
                    className="flex-1 py-2.5 rounded-xl bg-green-500 text-white font-bold text-sm text-center hover:bg-green-600 flex items-center justify-center gap-2">
                    📞 Appeler
                  </a>
                  <a href={`https://wa.me/226${detail.destinataire_tel.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-xl bg-green-600 text-white font-bold text-sm text-center hover:bg-green-700 flex items-center justify-center gap-2">
                    💬 WhatsApp
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
