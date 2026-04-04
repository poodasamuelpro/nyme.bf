// src/app/coursier/dashboard-new/page.tsx
'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Utilisateur, Coursier, Livraison, Wallet, Notification, TransactionWallet } from '@/lib/supabase'
import toast from 'react-hot-toast'
import {
  Bell, ChevronRight, MapPin, Navigation, RefreshCw,
  Phone, MessageSquare, ArrowRight, TrendingUp,
  CheckCircle, Clock, Zap, Star, AlertTriangle,
  ArrowDown, Menu, X, ChevronDown, ArrowUpRight,
} from 'lucide-react'

type Tab = 'missions' | 'en_cours' | 'gains' | 'profil'

const STATUT_CONFIG: Record<string, {
  label: string; emoji: string; color: string; bg: string; text: string;
  next?: string; nextLabel?: string; nextColor?: string
}> = {
  acceptee:         { label: 'Acceptée',        emoji: '✅', color: '#3b82f6', bg: 'bg-blue-50',   text: 'text-blue-700',   next: 'en_rout_depart',   nextLabel: '🛵 En route vers le colis', nextColor: '#8b5cf6' },
  en_rout_depart:   { label: 'En route (colis)', emoji: '🛵', color: '#8b5cf6', bg: 'bg-purple-50', text: 'text-purple-700', next: 'colis_recupere',    nextLabel: '📦 Colis récupéré',         nextColor: '#6366f1' },
  colis_recupere:   { label: 'Colis récupéré',  emoji: '📦', color: '#6366f1', bg: 'bg-indigo-50', text: 'text-indigo-700', next: 'en_route_arrivee', nextLabel: '🚀 En route livraison',      nextColor: '#f97316' },
  en_route_arrivee: { label: 'En livraison',    emoji: '🚀', color: '#f97316', bg: 'bg-orange-50', text: 'text-orange-700', next: 'livree',           nextLabel: '✅ Confirmer livraison',      nextColor: '#22c55e' },
  livree:           { label: 'Livrée',          emoji: '🎉', color: '#22c55e', bg: 'bg-green-50',  text: 'text-green-700' },
  annulee:          { label: 'Annulée',         emoji: '❌', color: '#ef4444', bg: 'bg-red-50',    text: 'text-red-700' },
}

const fPrice = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
const fDate  = (d: string) => new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d))

// Carte coursier avec affichage missions disponibles
function CoursierMap({ userLat, userLng, courses }: {
  userLat: number | null; userLng: number | null; courses: Livraison[]
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<unknown>(null)
  const [mapError, setMapError] = useState(false)

  const defaultLat = userLat ?? 12.3714
  const defaultLng = userLng ?? -1.5197

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return
    let mounted = true

    import('leaflet').then(L => {
      if (!mounted || !mapRef.current) return
      if ((mapRef.current as HTMLElement & { _leaflet_id?: number })._leaflet_id) return

      const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([defaultLat, defaultLng], 14)
      mapInstance.current = map

      // Fond de carte sombre pour le mode coursier
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map)
      L.control.zoom({ position: 'bottomright' }).addTo(map)

      // Position coursier
      if (userLat && userLng) {
        const courierIcon = L.divIcon({
          html: `<div style="background:#f97316;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 12px rgba(249,115,22,0.6);display:flex;align-items:center;justify-content:center;font-size:11px">🛵</div>`,
          iconSize: [22, 22], className: '',
        })
        L.marker([userLat, userLng], { icon: courierIcon }).addTo(map).bindPopup('📍 Votre position')
      }

      // Missions disponibles
      courses.slice(0, 8).forEach(c => {
        if (c.depart_lat && c.depart_lng) {
          const missionIcon = L.divIcon({
            html: `<div style="background:#22c55e;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(34,197,94,0.5)"></div>`,
            iconSize: [14, 14], className: '',
          })
          L.marker([c.depart_lat, c.depart_lng], { icon: missionIcon })
            .addTo(map)
            .bindPopup(`📦 ${fPrice(c.prix_calcule)} — ${c.depart_adresse}`)
        }
      })
    }).catch(() => { if (mounted) setMapError(true) })

    return () => {
      mounted = false
      if (mapInstance.current) {
        try { (mapInstance.current as { remove: () => void }).remove() } catch {}
        mapInstance.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultLat, defaultLng])

  if (mapError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-gray-500">
        <MapPin size={32} className="text-gray-600 mb-2" />
        <p className="text-sm font-medium text-gray-400">Carte indisponible</p>
      </div>
    )
  }

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
    </>
  )
}

export default function CoursierDashboard() {
  const router = useRouter()
  const [user,                setUser]                = useState<Utilisateur | null>(null)
  const [coursier,            setCoursier]            = useState<Coursier | null>(null)
  const [tab,                 setTab]                 = useState<Tab>('missions')
  const [disponible,          setDisponible]          = useState(false)
  const [coursesDisponibles,  setCoursesDisponibles]  = useState<Livraison[]>([])
  const [coursesEnCours,      setCoursesEnCours]      = useState<Livraison[]>([])
  const [wallet,              setWallet]              = useState<Wallet | null>(null)
  const [transactions,        setTransactions]        = useState<TransactionWallet[]>([])
  const [notifications,       setNotifications]       = useState<Notification[]>([])
  const [loading,             setLoading]             = useState(true)
  const [togglingDisponible,  setTogglingDisponible]  = useState(false)
  const [userLat,             setUserLat]             = useState<number | null>(null)
  const [userLng,             setUserLng]             = useState<number | null>(null)
  const [mapExpanded,         setMapExpanded]         = useState(false)
  const [menuOpen,            setMenuOpen]            = useState(false)
  const [showAllMissions,     setShowAllMissions]     = useState(false)

  const loadCoursesDisponibles = useCallback(async () => {
    const { data } = await supabase.from('livraisons')
      .select('*, client:client_id(id, nom, telephone, avatar_url)')
      .eq('statut', 'en_attente').is('coursier_id', null)
      .order('created_at', { ascending: false }).limit(20)
    setCoursesDisponibles((data || []) as unknown as Livraison[])
  }, [])

  const loadCoursesEnCours = useCallback(async (userId: string) => {
    const { data } = await supabase.from('livraisons')
      .select('*, client:client_id(id, nom, telephone, avatar_url)')
      .eq('coursier_id', userId)
      .not('statut', 'in', '("livree","annulee")')
      .order('created_at', { ascending: false })
    setCoursesEnCours((data || []) as unknown as Livraison[])
  }, [])

  const loadWallet = useCallback(async (userId: string) => {
    const { data } = await supabase.from('wallets').select('*').eq('user_id', userId).single()
    setWallet(data as Wallet | null)
    const { data: txs } = await supabase.from('transactions_wallet').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
    setTransactions((txs || []) as TransactionWallet[])
  }, [])

  const loadNotifications = useCallback(async (userId: string) => {
    const { data } = await supabase.from('notifications').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(30)
    setNotifications((data || []) as Notification[])
  }, [])

  const initDashboard = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/coursier/login'); return }

      const { data: userData } = await supabase.from('utilisateurs').select('*').eq('id', session.user.id).single()
      if (!userData || userData.role !== 'coursier') { router.push('/coursier/login'); return }
      setUser(userData as Utilisateur)

      const { data: coursierData } = await supabase.from('coursiers').select('*').eq('id', session.user.id).single()
      if (coursierData) {
        setCoursier(coursierData as Coursier)
        setDisponible(coursierData.statut === 'disponible')
      }

      await Promise.all([
        loadCoursesDisponibles(),
        loadCoursesEnCours(session.user.id),
        loadWallet(session.user.id),
        loadNotifications(session.user.id),
      ])

      // Géolocalisation
      navigator.geolocation?.getCurrentPosition(
        pos => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude) },
        () => {}
      )

      const channel = supabase.channel('coursier-dash')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'livraisons' }, () => {
          loadCoursesDisponibles()
          loadCoursesEnCours(session.user.id)
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev])
          toast((payload.new as Notification).titre || 'Nouvelle notification', { icon: '🔔' })
        })
        .subscribe()

      setLoading(false)
      return () => supabase.removeChannel(channel)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }, [router, loadCoursesDisponibles, loadCoursesEnCours, loadWallet, loadNotifications])

  useEffect(() => { initDashboard() }, [initDashboard])

  const toggleDisponible = async () => {
    if (!user) return
    setTogglingDisponible(true)
    const newStatut = disponible ? 'hors_ligne' : 'disponible'
    try {
      if (!disponible) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            await supabase.from('coursiers').update({
              statut: newStatut,
              lat_actuelle: pos.coords.latitude,
              lng_actuelle: pos.coords.longitude,
              derniere_activite: new Date().toISOString(),
            }).eq('id', user.id)
            await supabase.from('localisation_coursier').upsert(
              { coursier_id: user.id, latitude: pos.coords.latitude, longitude: pos.coords.longitude },
              { onConflict: 'coursier_id' }
            )
            setUserLat(pos.coords.latitude)
            setUserLng(pos.coords.longitude)
            setDisponible(true)
            toast.success('✅ Vous êtes disponible — missions visibles')
            setTogglingDisponible(false)
          },
          async () => {
            await supabase.from('coursiers').update({ statut: newStatut }).eq('id', user.id)
            setDisponible(true)
            toast('Disponible sans GPS', { icon: '⚠️' })
            setTogglingDisponible(false)
          }
        )
      } else {
        await supabase.from('coursiers').update({ statut: newStatut }).eq('id', user.id)
        setDisponible(false)
        toast('Vous êtes hors ligne', { icon: '🔴' })
        setTogglingDisponible(false)
      }
    } catch {
      toast.error('Erreur lors du changement de statut')
      setTogglingDisponible(false)
    }
  }

  const accepterCourse = async (livraison: Livraison) => {
    if (!user) return
    try {
      const res = await fetch('/api/coursier/livraisons/accepter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ livraison_id: livraison.id, coursier_id: user.id }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Erreur serveur')
      }
      toast.success('🎉 Course acceptée !')
      await Promise.all([loadCoursesDisponibles(), loadCoursesEnCours(user.id)])
      setTab('en_cours')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Impossible d'accepter cette course"
      toast.error(msg)
    }
  }

  const updateStatut = async (livraisonId: string, newStatut: string) => {
    if (!user) return
    try {
      const res = await fetch('/api/coursier/livraisons/statut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ livraison_id: livraisonId, statut: newStatut, coursier_id: user.id }),
      })
      if (!res.ok) throw new Error('Erreur mise à jour')
      if (newStatut === 'livree') {
        toast.success('🎉 Livraison confirmée ! Gains crédités')
        await loadWallet(user.id)
      } else {
        toast.success('✅ Statut mis à jour')
      }
      await loadCoursesEnCours(user.id)
    } catch {
      toast.error('Erreur lors de la mise à jour du statut')
    }
  }

  const unreadCount = notifications.filter(n => !n.lu).length
  const isVerifie   = coursier?.statut_verification === 'verifie'

  // Gains du jour
  const gainsDuJour = transactions
    .filter(tx => {
      const d = new Date(tx.created_at)
      return d.toDateString() === new Date().toDateString() && tx.type === 'gain' && tx.status === 'completed'
    })
    .reduce((sum, tx) => sum + tx.montant, 0)

  const mapHeight = mapExpanded ? 'h-[55vh]' : 'h-48 sm:h-60'
  const missionsVisible = showAllMissions ? coursesDisponibles : coursesDisponibles.slice(0, 4)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="text-5xl">🛵</div>
        <div className="w-8 h-8 border-3 border-white/20 border-t-orange-400 rounded-full animate-spin" style={{ borderWidth: 3 }} />
        <p className="text-white/60 text-sm font-medium">Chargement du tableau de bord...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8fafc' }}>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 text-white" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', boxShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(255,255,255,0.1)' }}>🛵</div>
            <div>
              <p className="font-bold text-sm leading-none text-white">{user?.nom?.split(' ')[0]} 👋</p>
              <p className="text-white/50 text-[10px]">Dashboard Coursier</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle disponibilité */}
            <button
              onClick={toggleDisponible}
              disabled={togglingDisponible || !isVerifie}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold text-xs transition-all ${
                disponible
                  ? 'bg-green-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              } ${!isVerifie ? 'opacity-40 cursor-not-allowed' : ''}`}>
              {togglingDisponible
                ? <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                : <span className={`w-2 h-2 rounded-full ${disponible ? 'bg-white animate-pulse' : 'bg-white/40'}`} />
              }
              <span className="hidden sm:inline">{disponible ? 'En ligne' : 'Hors ligne'}</span>
            </button>

            {/* Notifs */}
            <button onClick={() => setTab('profil')}
              className="relative w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors">
              <Bell size={18} className="text-white/80" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center bg-red-500">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Menu mobile */}
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="sm:hidden w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center">
              {menuOpen ? <X size={18} className="text-white/80" /> : <Menu size={18} className="text-white/80" />}
            </button>
          </div>
        </div>

        {/* Menu mobile */}
        {menuOpen && (
          <div className="sm:hidden border-t border-white/10 px-4 py-3 flex flex-col gap-1">
            {([
              ['missions', '🔍', 'Missions'],
              ['en_cours', '🚀', `En cours${coursesEnCours.length ? ` (${coursesEnCours.length})` : ''}`],
              ['gains', '💰', 'Gains'],
              ['profil', '👤', 'Profil'],
            ] as const).map(([t, icon, label]) => (
              <button key={t} onClick={() => { setTab(t); setMenuOpen(false) }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === t ? 'bg-orange-500/20 text-orange-400' : 'text-white/60 hover:bg-white/10'}`}>
                <span>{icon}</span>{label}
              </button>
            ))}
          </div>
        )}

        {/* Tabs desktop */}
        <div className="hidden sm:flex max-w-5xl mx-auto px-4 border-t border-white/10">
          {([
            ['missions', '🔍 Missions'],
            ['en_cours', `🚀 En cours${coursesEnCours.length > 0 ? ` (${coursesEnCours.length})` : ''}`],
            ['gains', '💰 Gains'],
            ['profil', '👤 Profil'],
          ] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t as Tab)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                tab === t ? 'border-orange-400 text-orange-400' : 'border-transparent text-white/50 hover:text-white/80'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Bannière vérification */}
      {!isVerifie && (
        <div className="bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} />
            <span className="text-sm font-medium">Dossier en cours de vérification — missions bloquées</span>
          </div>
          <Link href="/coursier/verification" className="text-xs underline font-bold shrink-0">Compléter →</Link>
        </div>
      )}

      <main className="flex-1 max-w-5xl mx-auto w-full px-0 sm:px-4 pb-20">

        {/* ══════════════════ MISSIONS DISPONIBLES ══════════════════ */}
        {tab === 'missions' && (
          <div>
            {/* Carte principale */}
            <div className={`relative ${mapHeight} transition-all duration-300 overflow-hidden`} style={{ background: '#1e293b' }}>
              <CoursierMap userLat={userLat} userLng={userLng} courses={coursesDisponibles} />

              {/* Top overlay */}
              <div className="absolute top-0 left-0 right-0 z-10 p-3 flex items-center justify-between">
                <div className="rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)' }}>
                  <div className={`w-2 h-2 rounded-full ${disponible ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                  <span className="text-xs font-semibold text-white">
                    {disponible ? 'Disponible' : 'Hors ligne'}
                  </span>
                  {coursier && (
                    <div className="flex items-center gap-1 ml-1">
                      <Star size={11} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-xs text-white/80 font-medium">{(coursier as Coursier & { note_moyenne?: number }).note_moyenne || '4.9'}</span>
                    </div>
                  )}
                </div>
                <button onClick={() => setMapExpanded(!mapExpanded)}
                  className="rounded-xl px-3 py-2 flex items-center gap-1.5 text-xs font-semibold text-white"
                  style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)' }}>
                  {mapExpanded ? <><ChevronDown size={14} />Réduire</> : <><ArrowUpRight size={14} />Agrandir</>}
                </button>
              </div>

              {/* Stats bottom overlay */}
              <div className="absolute bottom-0 left-0 right-0 z-10 p-3">
                <div className="rounded-2xl px-4 py-3 flex items-center justify-around"
                  style={{ background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(8px)' }}>
                  {[
                    { label: 'Disponibles', val: coursesDisponibles.length, color: '#22c55e' },
                    { label: 'En cours',    val: coursesEnCours.length,     color: '#f97316' },
                    { label: 'Total',       val: coursier?.total_courses || 0, color: '#8b5cf6' },
                    { label: "Aujourd'hui", val: fPrice(gainsDuJour),        color: '#eab308' },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <p className="text-sm font-black" style={{ color: s.color }}>{s.val}</p>
                      <p className="text-[10px] text-white/50">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-0 pt-4 space-y-3">
              {/* Header missions */}
              <div className="flex items-center justify-between">
                <h2 className="font-black text-gray-900 text-lg">Courses disponibles</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-medium">{coursesDisponibles.length} mission(s)</span>
                  <button onClick={loadCoursesDisponibles}
                    className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                    <RefreshCw size={14} className="text-gray-600" />
                  </button>
                </div>
              </div>

              {!disponible && isVerifie && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                  <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-800">Vous êtes hors ligne</p>
                    <p className="text-xs text-amber-600">Activez votre statut pour voir et accepter les missions</p>
                  </div>
                  <button onClick={toggleDisponible} disabled={togglingDisponible}
                    className="px-3 py-1.5 rounded-xl text-white text-xs font-bold shrink-0"
                    style={{ background: '#22c55e' }}>
                    {togglingDisponible ? '...' : 'Activer'}
                  </button>
                </div>
              )}

              {coursesDisponibles.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                  <div className="text-5xl mb-3">🔍</div>
                  <h3 className="font-bold text-gray-700 text-lg">Aucune course disponible</h3>
                  <p className="text-gray-400 text-sm mt-1">Les nouvelles missions apparaissent en temps réel</p>
                </div>
              ) : (
                <>
                  {missionsVisible.map(l => (
                    <div key={l.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all hover:border-gray-200"
                      style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                      {/* Header mission */}
                      <div className="px-4 pt-4 pb-2 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                              l.type === 'urgente'
                                ? 'bg-red-100 text-red-700'
                                : l.type === 'programmee'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-green-100 text-green-700'
                            }`}>
                              {l.type === 'urgente' ? '🚨 Urgente +30%' : l.type === 'programmee' ? '📅 Programmée' : '⚡ Immédiate'}
                            </span>
                          </div>
                          <p className="text-2xl font-black text-gray-900">{fPrice(l.prix_calcule)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {l.distance_km ? `${l.distance_km} km` : ''}
                            {l.duree_estimee ? ` • ~${l.duree_estimee} min` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">{fDate(l.created_at)}</p>
                          <p className="text-xs text-gray-500 font-medium mt-1">Pour: {l.destinataire_nom}</p>
                        </div>
                      </div>

                      {/* Itinéraire */}
                      <div className="px-4 py-2 space-y-1.5">
                        <div className="flex items-start gap-2.5">
                          <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-700 leading-snug">{l.depart_adresse}</p>
                        </div>
                        <div className="ml-1.5 w-0.5 h-3 bg-gray-200 rounded" />
                        <div className="flex items-start gap-2.5">
                          <div className="w-3 h-3 rounded-full bg-red-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-700 leading-snug">{l.arrivee_adresse}</p>
                        </div>
                      </div>

                      {/* Instructions */}
                      {l.instructions && (
                        <div className="mx-4 mb-2 rounded-xl p-2.5 bg-yellow-50 border border-yellow-100">
                          <p className="text-xs text-yellow-700">💬 {l.instructions}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="px-4 pb-4 pt-1 flex gap-2">
                        <button
                          onClick={() => accepterCourse(l)}
                          disabled={!disponible || !isVerifie}
                          className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: disponible && isVerifie ? '#22c55e' : '#9ca3af' }}>
                          ✅ Accepter la course
                        </button>
                        <Link href={`/client/suivi/${l.id}`}
                          className="w-12 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-sm">
                          🗺️
                        </Link>
                      </div>
                    </div>
                  ))}

                  {coursesDisponibles.length > 4 && (
                    <button onClick={() => setShowAllMissions(!showAllMissions)}
                      className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-300 text-gray-500 font-semibold text-sm hover:border-gray-400 transition-colors">
                      {showAllMissions ? 'Voir moins' : `Voir les ${coursesDisponibles.length - 4} autres missions`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════ EN COURS ══════════════════ */}
        {tab === 'en_cours' && (
          <div className="px-4 sm:px-0 pt-4 space-y-4">
            <h2 className="text-xl font-black text-gray-900">Missions en cours</h2>

            {coursesEnCours.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                <div className="text-5xl mb-3">🛵</div>
                <h3 className="font-bold text-gray-700 text-lg">Aucune mission en cours</h3>
                <p className="text-gray-400 text-sm mt-1">Acceptez une mission pour la voir ici</p>
                <button onClick={() => setTab('missions')}
                  className="mt-4 px-6 py-3 rounded-xl font-bold text-sm text-white"
                  style={{ background: '#f97316' }}>
                  Voir les missions →
                </button>
              </div>
            ) : (
              coursesEnCours.map(l => {
                const cfg = STATUT_CONFIG[l.statut]
                return (
                  <div key={l.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                    style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.06)' }}>
                    {/* Barre de progression */}
                    <div className="h-1.5 w-full bg-gray-100">
                      <div className="h-full rounded-full transition-all duration-500" style={{
                        background: cfg?.color || '#f97316',
                        width: l.statut === 'acceptee' ? '20%'
                          : l.statut === 'en_rout_depart' ? '40%'
                          : l.statut === 'colis_recupere' ? '60%'
                          : l.statut === 'en_route_arrivee' ? '80%'
                          : '100%',
                      }} />
                    </div>

                    <div className="p-4">
                      {/* Status + prix */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{cfg?.emoji || '📦'}</span>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{cfg?.label || l.statut}</p>
                            <p className="text-xs text-gray-400">{fDate(l.created_at)}</p>
                          </div>
                        </div>
                        <p className="font-black text-xl text-orange-500">{fPrice(l.prix_final || l.prix_calcule)}</p>
                      </div>

                      {/* Itinéraire */}
                      <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-1.5">
                        <div className="flex items-start gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-700 leading-snug">{l.depart_adresse}</p>
                        </div>
                        <div className="ml-1 w-0.5 h-2 bg-gray-300 rounded" />
                        <div className="flex items-start gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-700 leading-snug">{l.arrivee_adresse}</p>
                        </div>
                      </div>

                      {/* Infos destinataire */}
                      <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
                        <span>Destinataire: <strong className="text-gray-800">{l.destinataire_nom}</strong></span>
                        <a href={`tel:${l.destinataire_tel}`}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 font-semibold">
                          <Phone size={12} />Appeler
                        </a>
                      </div>

                      {/* Boutons action */}
                      <div className="flex gap-2">
                        <Link href={`/coursier/mission/${l.id}`}
                          className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm text-center hover:bg-gray-200 transition-colors">
                          🗺️ Voir sur la carte
                        </Link>
                        {cfg?.next && (
                          <button
                            onClick={() => updateStatut(l.id, cfg.next!)}
                            className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-all active:scale-95"
                            style={{ background: cfg.nextColor || '#f97316' }}>
                            {cfg.nextLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ══════════════════ GAINS ══════════════════ */}
        {tab === 'gains' && (
          <div className="px-4 sm:px-0 pt-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setTab('missions')}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <ArrowDown size={14} className="text-gray-600 rotate-90" />
              </button>
              <h2 className="text-xl font-black text-gray-900">Mes gains</h2>
            </div>

            {/* Carte wallet */}
            <div className="rounded-3xl p-6 text-white relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10"
                style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
              <p className="text-white/60 text-sm mb-1">Solde disponible</p>
              <div className="flex items-baseline gap-2 mb-5">
                <span className="text-4xl font-black">{(wallet?.solde || 0).toLocaleString('fr-FR')}</span>
                <span className="text-lg opacity-70">FCFA</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: "Aujourd'hui",   val: fPrice(gainsDuJour),            color: '#eab308' },
                  { label: 'Total courses', val: String(coursier?.total_courses || 0), color: '#22c55e' },
                  { label: 'Note moy.',     val: `⭐ ${(coursier as Coursier & { note_moyenne?: number })?.note_moyenne || '4.9'}`, color: '#f97316' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <p className="text-sm font-black" style={{ color: s.color }}>{s.val}</p>
                    <p className="text-[10px] text-white/50 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <Link href="/coursier/wallet"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm text-gray-900 transition-all active:scale-95"
                style={{ background: '#f97316' }}>
                <ArrowDown size={16} />Retirer mes gains
              </Link>
            </div>

            {/* Historique transactions */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
              <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">Historique des gains</h3>
                <Link href="/coursier/wallet" className="text-orange-500 text-xs font-semibold hover:underline">Voir tout</Link>
              </div>
              {transactions.length === 0 ? (
                <div className="p-10 text-center">
                  <TrendingUp size={28} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Aucune transaction</p>
                </div>
              ) : (
                transactions.slice(0, 20).map(tx => {
                  const isGain = tx.type === 'gain' || tx.type === 'bonus'
                  return (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                        style={{ background: isGain ? '#f0fdf4' : '#fef2f2' }}>
                        {isGain ? '💰' : '📊'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{tx.note || tx.type}</p>
                        <p className="text-xs text-gray-400">{fDate(tx.created_at)}</p>
                      </div>
                      <p className={`font-black text-sm shrink-0 ${isGain ? 'text-green-600' : 'text-red-500'}`}>
                        {isGain ? '+' : '-'}{Math.abs(tx.montant).toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ══════════════════ PROFIL ══════════════════ */}
        {tab === 'profil' && (
          <div className="px-4 sm:px-0 pt-4 space-y-4">
            {/* Carte profil */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center"
              style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.06)' }}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.nom}
                  className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-4 border-orange-100" />
              ) : (
                <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-black text-3xl"
                  style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                  {user?.nom?.charAt(0) || '🛵'}
                </div>
              )}
              <h2 className="text-xl font-black text-gray-900">{user?.nom}</h2>
              <p className="text-gray-500 text-sm">{user?.telephone}</p>
              <div className="flex items-center justify-center gap-3 mt-3">
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-400 fill-yellow-400" />
                  <span className="font-bold text-gray-800 text-sm">{(coursier as Coursier & { note_moyenne?: number })?.note_moyenne || '4.9'}</span>
                </div>
                <span className="text-gray-300">•</span>
                <span className="text-sm font-semibold text-gray-600">{coursier?.total_courses || 0} courses</span>
                <span className="text-gray-300">•</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  isVerifie ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {isVerifie ? '✅ Vérifié' : '⏳ En attente'}
                </span>
              </div>
            </div>

            {/* Menu */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
              {[
                { href: '/coursier/verification', emoji: '📋', label: 'Mon dossier & documents',    sub: isVerifie ? 'Vérifié ✅' : 'En cours de vérification' },
                { href: '/coursier/wallet',        emoji: '💰', label: 'Mon Wallet',                 sub: fPrice(wallet?.solde || 0) },
                { href: '/coursier/mission',       emoji: '🗺️',  label: 'Historique des missions',   sub: `${coursier?.total_courses || 0} courses complétées` },
                { href: '/client/messages',        emoji: '💬', label: 'Messagerie',                 sub: 'Clients & support' },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                  <span className="text-xl w-8 text-center">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                    {item.sub && <p className="text-gray-400 text-xs truncate">{item.sub}</p>}
                  </div>
                  <ChevronRight size={15} className="text-gray-300 shrink-0" />
                </Link>
              ))}
            </div>

            {/* Notifications */}
            {notifications.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
                <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={async () => {
                      if (!user) return
                      await supabase.from('notifications').update({ lu: true }).eq('user_id', user.id)
                      setNotifications(prev => prev.map(n => ({ ...n, lu: true })))
                    }} className="text-orange-500 text-xs font-semibold">Tout lire</button>
                  )}
                </div>
                {notifications.slice(0, 5).map(n => (
                  <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${!n.lu ? 'bg-orange-50/50' : ''}`}
                    onClick={async () => {
                      if (!n.lu) {
                        await supabase.from('notifications').update({ lu: true }).eq('id', n.id)
                        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, lu: true } : x))
                      }
                    }}>
                    <span className="text-lg">🔔</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm">{n.titre}</p>
                      <p className="text-xs text-gray-500 truncate">{n.message}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{fDate(n.created_at)}</p>
                    </div>
                    {!n.lu && <div className="w-2 h-2 rounded-full shrink-0 mt-1 bg-orange-500" />}
                  </div>
                ))}
              </div>
            )}

            <button onClick={async () => { await supabase.auth.signOut(); router.push('/coursier/login') }}
              className="w-full py-3.5 rounded-2xl font-bold text-red-600 border-2 border-red-200 hover:bg-red-50 active:scale-98 transition-all text-sm">
              🚪 Déconnexion
            </button>
          </div>
        )}
      </main>

      {/* ── BOTTOM NAV MOBILE ── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 text-white"
        style={{ background: '#1e293b', boxShadow: '0 -4px 20px rgba(0,0,0,0.2)' }}>
        <div className="flex">
          {([
            ['missions', '🔍', 'Missions'],
            ['en_cours', '🚀', `En cours${coursesEnCours.length > 0 ? `(${coursesEnCours.length})` : ''}`],
            ['gains', '💰', 'Gains'],
            ['profil', '👤', 'Profil'],
          ] as const).map(([t, icon, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all relative ${
                tab === t ? 'text-orange-400' : 'text-white/40'
              }`}>
              <span className="text-lg leading-none">{icon}</span>
              <span className="text-[9px] font-semibold">{label}</span>
              {tab === t && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-orange-400" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
