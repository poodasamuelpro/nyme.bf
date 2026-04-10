// src/app/client/historique/page.tsx — NOUVEAU FICHIER
// Historique complet des livraisons avec filtres avancés
// Route : /client/historique
'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Livraison } from '@/lib/supabase'
import { ArrowLeft, Package, Search, Filter, Calendar, SlidersHorizontal, ChevronDown } from 'lucide-react'

const STATUT: Record<string, { label: string; emoji: string; color: string; bg: string; text: string }> = {
  en_attente:       { label: 'En attente',     emoji: '⏳', color: '#f59e0b', bg: '#fffbeb', text: '#92400e' },
  acceptee:         { label: 'Acceptée',       emoji: '✅', color: '#3b82f6', bg: '#eff6ff', text: '#1e40af' },
  en_rout_depart:   { label: 'En route ↑',     emoji: '🛵', color: '#8b5cf6', bg: '#f5f3ff', text: '#5b21b6' },
  colis_recupere:   { label: 'Colis récupéré', emoji: '📦', color: '#6366f1', bg: '#eef2ff', text: '#3730a3' },
  en_route_arrivee: { label: 'En livraison',   emoji: '🚀', color: '#f97316', bg: '#fff7ed', text: '#9a3412' },
  livree:           { label: 'Livrée',         emoji: '🎉', color: '#22c55e', bg: '#f0fdf4', text: '#166534' },
  annulee:          { label: 'Annulée',        emoji: '❌', color: '#ef4444', bg: '#fef2f2', text: '#991b1b' },
}

const TYPE: Record<string, { label: string; emoji: string }> = {
  immediate:  { label: 'Standard',  emoji: '⚡' },
  urgente:    { label: 'Urgente',   emoji: '🚨' },
  programmee: { label: 'Planifiée', emoji: '📅' },
}

const fXOF  = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' XOF'
const fDate = (d: string) => new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(d))

export default function HistoriquePage() {
  const router = useRouter()

  const [userId,     setUserId]     = useState<string | null>(null)
  const [livraisons, setLivraisons] = useState<Livraison[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [filterType,   setFilterType]   = useState('tous')
  const [filterPeriode, setFilterPeriode] = useState('tout')
  const [showFilters,  setShowFilters]   = useState(false)
  const [sortBy,       setSortBy]        = useState<'date_desc' | 'date_asc' | 'prix_desc' | 'prix_asc'>('date_desc')

  const loadLivraisons = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('livraisons')
      .select('*, coursier:coursier_id(id, nom, telephone, avatar_url, note_moyenne)')
      .eq('client_id', uid)
      .order('created_at', { ascending: false })
    setLivraisons((data || []) as unknown as Livraison[])
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const { data: u } = await supabase.from('utilisateurs').select('role').eq('id', session.user.id).single()
      if (!u || u.role !== 'client') { router.replace('/login'); return }
      setUserId(session.user.id)
      await loadLivraisons(session.user.id)
      setLoading(false)
    }
    init()
  }, [router, loadLivraisons])

  const filteredAndSorted = useMemo(() => {
    let list = [...livraisons]

    // Recherche texte
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(l =>
        l.depart_adresse.toLowerCase().includes(q) ||
        l.arrivee_adresse.toLowerCase().includes(q) ||
        l.destinataire_nom?.toLowerCase().includes(q)
      )
    }

    // Filtre statut
    if (filterStatut !== 'tous') list = list.filter(l => l.statut === filterStatut)

    // Filtre type
    if (filterType !== 'tous') list = list.filter(l => l.type === filterType)

    // Filtre période
    if (filterPeriode !== 'tout') {
      const now = new Date()
      const days = filterPeriode === '7j' ? 7 : filterPeriode === '30j' ? 30 : 90
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      list = list.filter(l => new Date(l.created_at) >= cutoff)
    }

    // Tri
    list.sort((a, b) => {
      if (sortBy === 'date_asc')  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortBy === 'date_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === 'prix_asc')  return (a.prix_final || a.prix_calcule) - (b.prix_final || b.prix_calcule)
      if (sortBy === 'prix_desc') return (b.prix_final || b.prix_calcule) - (a.prix_final || a.prix_calcule)
      return 0
    })

    return list
  }, [livraisons, search, filterStatut, filterType, filterPeriode, sortBy])

  // Stats rapides
  const stats = useMemo(() => {
    const livrees  = livraisons.filter(l => l.statut === 'livree')
    const annulees = livraisons.filter(l => l.statut === 'annulee')
    const total_depense = livrees.reduce((s, l) => s + (l.prix_final || l.prix_calcule), 0)
    return { total: livraisons.length, livrees: livrees.length, annulees: annulees.length, total_depense }
  }, [livraisons])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 flex items-center gap-3 h-14">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
            <ArrowLeft size={16} className="text-gray-700" />
          </button>
          <h1 className="font-black text-gray-900 text-lg flex-1">Historique livraisons</h1>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all ${showFilters ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
            <SlidersHorizontal size={14} /><span className="hidden sm:inline">Filtres</span>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-8 space-y-4">

        {/* Stats rapides */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total',    val: stats.total,           color: '#1a56db', bg: '#eff6ff' },
            { label: 'Livrées', val: stats.livrees,          color: '#22c55e', bg: '#f0fdf4' },
            { label: 'Annulées', val: stats.annulees,        color: '#ef4444', bg: '#fef2f2' },
            { label: 'Dépensé', val: fXOF(stats.total_depense), color: '#f97316', bg: '#fff7ed', small: true },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: s.bg }}>
              <p className="font-black text-sm" style={{ color: s.color, fontSize: s.small ? '10px' : undefined }}>
                {typeof s.val === 'number' ? s.val : s.val}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher adresse, destinataire..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl text-sm outline-none focus:border-blue-500 bg-white"
          />
        </div>

        {/* Filtres avancés */}
        {showFilters && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
            <p className="font-bold text-gray-900 text-sm">Filtres</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Statut</label>
                <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white text-gray-700">
                  <option value="tous">Tous</option>
                  {Object.entries(STATUT).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Type</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white text-gray-700">
                  <option value="tous">Tous</option>
                  {Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Période</label>
                <select value={filterPeriode} onChange={e => setFilterPeriode(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white text-gray-700">
                  <option value="tout">Tout</option>
                  <option value="7j">7 derniers jours</option>
                  <option value="30j">30 derniers jours</option>
                  <option value="90j">3 derniers mois</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Trier par</label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white text-gray-700">
                  <option value="date_desc">Date ↓ (récent)</option>
                  <option value="date_asc">Date ↑ (ancien)</option>
                  <option value="prix_desc">Prix ↓</option>
                  <option value="prix_asc">Prix ↑</option>
                </select>
              </div>
            </div>
            <button onClick={() => { setFilterStatut('tous'); setFilterType('tous'); setFilterPeriode('tout'); setSortBy('date_desc'); setSearch('') }}
              className="text-xs text-blue-600 font-semibold">
              Réinitialiser les filtres
            </button>
          </div>
        )}

        {/* Résultats */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-sm font-bold text-gray-700">{filteredAndSorted.length} livraison(s)</p>
          </div>

          {filteredAndSorted.length === 0 ? (
            <div className="p-12 text-center">
              <Package size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-medium">Aucune livraison trouvée</p>
              {search || filterStatut !== 'tous' || filterType !== 'tous' ? (
                <button onClick={() => { setSearch(''); setFilterStatut('tous'); setFilterType('tous'); }}
                  className="mt-3 text-blue-600 text-xs font-semibold">
                  Effacer les filtres
                </button>
              ) : (
                <Link href="/client/nouvelle-livraison"
                  className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm">
                  Créer une livraison
                </Link>
              )}
            </div>
          ) : filteredAndSorted.map(l => {
            const cfg  = STATUT[l.statut] || STATUT.en_attente
            const tcfg = TYPE[l.type]
            return (
              <div key={l.id} className="px-4 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: cfg.bg }}>
                    {cfg.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* En-tête */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{l.depart_adresse}</p>
                        <p className="text-xs text-gray-400 truncate">→ {l.arrivee_adresse}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
                    </div>
                    {/* Détails */}
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
                      <span>{tcfg?.emoji} {tcfg?.label}</span>
                      <span>·</span>
                      <span>{fDate(l.created_at)}</span>
                      <span>·</span>
                      <span className="font-bold text-gray-800">{fXOF(l.prix_final || l.prix_calcule)}</span>
                      {l.distance_km && <><span>·</span><span>{l.distance_km} km</span></>}
                    </div>
                    {/* Actions */}
                    <div className="flex gap-2 mt-2">
                      {!['livree', 'annulee'].includes(l.statut) && (
                        <Link href={`/client/suivi/${l.id}`}
                          className="text-xs px-3 py-1 rounded-lg font-semibold text-white bg-blue-600">
                          🗺️ Suivre
                        </Link>
                      )}
                      {l.statut === 'livree' && (
                        <Link href={`/client/evaluation/${l.id}`}
                          className="text-xs px-3 py-1 rounded-lg font-semibold text-yellow-700 bg-yellow-50">
                          ⭐ Évaluer
                        </Link>
                      )}
                      {l.statut === 'en_attente' && (
                        <Link href={`/client/propositions/${l.id}`}
                          className="text-xs px-3 py-1 rounded-lg font-semibold text-orange-700 bg-orange-50">
                          💬 Propositions
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}