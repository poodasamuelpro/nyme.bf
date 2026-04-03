// src/app/partenaires/dashboard/page.tsx — Dashboard partenaire complet v2
// Vérification rôle côté page + toutes fonctionnalités réelles + vraies données Supabase
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
  FileText, Eye, X, Search, Star, CreditCard, Settings,
  Map, Truck, UserPlus, BookOpen, Edit2, Trash2, Check, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const MapAdvanced = dynamic(() => import('@/components/MapAdvanced'), { ssr: false })

// ── Types ──────────────────────────────────────────────────────────

interface Contact {
  id: string
  nom: string
  telephone: string
  whatsapp?: string
  adresse_habituelle?: string
  lat?: number
  lng?: number
}

interface CoursierActif {
  id: string
  nom: string
  note_moyenne: number
  total_courses: number
  statut: string
  lat_actuelle: number | null
  lng_actuelle: number | null
}

// ── Config plans ───────────────────────────────────────────────────

const PLAN_CFG = {
  starter:    { label: 'Starter',    emoji: '🟢', color: 'bg-green-500/15 text-green-600 border-green-200',    max: 30,  prix: 15000 },
  business:   { label: 'Business',   emoji: '🟠', color: 'bg-orange-500/15 text-orange-600 border-orange-200', max: 100, prix: 35000 },
  enterprise: { label: 'Enterprise', emoji: '🏢', color: 'bg-purple-500/15 text-purple-600 border-purple-200', max: 500, prix: 75000 },
}

const STATUT_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  en_attente: { label: 'En attente', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',   dot: 'bg-amber-400' },
  en_cours:   { label: 'En cours',   color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', dot: 'bg-purple-500' },
  livre:      { label: 'Livré ✓',    color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   dot: 'bg-green-500' },
  annule:     { label: 'Annulé',     color: 'text-red-700',    bg: 'bg-red-50 border-red-200',       dot: 'bg-red-500' },
}

const TABS = [
  { id: 'dashboard',  label: 'Dashboard',  icon: BarChart3 },
  { id: 'livraisons', label: 'Livraisons', icon: Package },
  { id: 'planifier',  label: 'Planifier',  icon: Calendar },
  { id: 'contacts',   label: 'Contacts',   icon: BookOpen },
  { id: 'carte',      label: 'Carte Live', icon: Map },
  { id: 'wallet',     label: 'Wallet',     icon: Wallet },
  { id: 'compte',     label: 'Compte',     icon: Settings },
]

// ── Utilitaires ────────────────────────────────────────────────────

const fXOF = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' XOF'
const fDate = (d: string) => new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d))

// ── Badge statut ───────────────────────────────────────────────────

function Badge({ statut }: { statut: string }) {
  const s = STATUT_CFG[statut] || STATUT_CFG.en_attente
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${s.bg} ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

// ── Page principale ────────────────────────────────────────────────

export default function PartenaireDashboard() {
  const router = useRouter()

  // State
  const [userId,      setUserId]      = useState<string | null>(null)
  const [partenaire,  setPartenaire]  = useState<PartenaireRow | null>(null)
  const [livraisons,  setLivraisons]  = useState<LivraisonPartenaireRow[]>([])
  const [contacts,    setContacts]    = useState<Contact[]>([])
  const [coursiers,   setCoursiers]   = useState<CoursierActif[]>([])
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [tab,         setTab]         = useState('dashboard')
  const [recherche,   setRecherche]   = useState('')
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [detail,      setDetail]      = useState<LivraisonPartenaireRow | null>(null)
  const [alertes,     setAlertes]     = useState<string[]>([])
  const [soldeWallet, setSoldeWallet] = useState(0)
  const [txWallet,    setTxWallet]    = useState<any[]>([])
  const [coursierFavori, setCoursierFavori] = useState<CoursierActif | null>(null)
  const [editingProfil, setEditingProfil] = useState(false)
  const [profilForm, setProfilForm] = useState({ entreprise: '', nom_contact: '', telephone: '', email_pro: '', adresse: '' })
  const [savingProfil, setSavingProfil] = useState(false)

  // Formulaire nouvelle livraison
  const [showForm,    setShowForm]    = useState(false)
  const [formLivr,    setFormLivr]    = useState({
    adresse_depart: '', lat_depart: 0, lng_depart: 0,
    adresse_arrivee: '', lat_arrivee: 0, lng_arrivee: 0,
    destinataire_nom: '', destinataire_tel: '', destinataire_whatsapp: '',
    instructions: '', date_programmee: '', heure: '09:00',
    contact_id: '', // sélection depuis contacts
  })
  const [submittingLivr, setSubmittingLivr] = useState(false)

  // Formulaire contact
  const [showContactForm, setShowContactForm] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [contactForm, setContactForm] = useState({ nom: '', telephone: '', whatsapp: '', adresse_habituelle: '' })
  const [savingContact, setSavingContact] = useState(false)

  // ── Chargement données ─────────────────────────────────────────

  const loadData = useCallback(async (uid: string) => {
    try {
      // 1. Profil partenaire
      const { data: part, error: partErr } = await supabase
        .from('partenaires').select('*').eq('user_id', uid).single()

      if (partErr || !part) {
        toast.error('Profil partenaire introuvable')
        router.replace('/partenaires/login')
        return
      }
      setPartenaire(part)
      setProfilForm({
        entreprise: part.entreprise || '',
        nom_contact: part.nom_contact || '',
        telephone: part.telephone || '',
        email_pro: part.email_pro || '',
        adresse: (part as any).adresse || '',
      })

      // 2. Livraisons (vraies données)
      const { data: livs } = await supabase
        .from('livraisons_partenaire')
        .select(`*, coursier:coursier_id(id, nom, note_moyenne)`)
        .eq('partenaire_id', part.id)
        .order('created_at', { ascending: false })
        .limit(200)

      const livsData = (livs || []) as LivraisonPartenaireRow[]
      setLivraisons(livsData)

      // 3. Contacts du partenaire (table contacts_favoris liée à l'user)
      const { data: ctData } = await supabase
        .from('contacts_favoris')
        .select('*')
        .eq('user_id', uid)
        .order('nom')
      setContacts((ctData || []) as Contact[])

      // 4. Coursiers actifs
      const { data: cData } = await supabase
        .from('coursiers')
        .select('id, statut, lat_actuelle, lng_actuelle, total_courses, note_moyenne')
        .in('statut', ['disponible', 'occupe'])
      if (cData) {
        const ids = cData.map((c: any) => c.id)
        const { data: uData } = await supabase.from('utilisateurs').select('id, nom').in('id', ids)
        const enriched: CoursierActif[] = cData.map((c: any) => ({
          ...c,
          nom: uData?.find((u: any) => u.id === c.id)?.nom || 'Coursier',
        }))
        setCoursiers(enriched)

        // Coursier favori = plus de courses pour ce partenaire
        const counts: Record<string, number> = {}
        livsData.filter(l => l.statut === 'livre' && l.coursier_id).forEach(l => {
          if (l.coursier_id) counts[l.coursier_id] = (counts[l.coursier_id] || 0) + 1
        })
        const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
        if (topId) setCoursierFavori(enriched.find(c => c.id === topId) || null)
      }

      // 5. Wallet
      const { data: w } = await supabase.from('wallets').select('solde').eq('user_id', uid).single()
      setSoldeWallet(w?.solde || 0)
      const { data: txs } = await supabase.from('transactions_wallet')
        .select('type, montant, note, created_at').eq('user_id', uid)
        .order('created_at', { ascending: false }).limit(30)
      setTxWallet(txs || [])

      // 6. Alertes
      const a: string[] = []
      if (part.livraisons_mois >= part.livraisons_max) a.push(`Quota atteint : ${part.livraisons_mois}/${part.livraisons_max}`)
      else if (part.livraisons_mois / part.livraisons_max >= 0.8) a.push(`${Math.round(part.livraisons_mois / part.livraisons_max * 100)}% du quota utilisé`)
      if (part.statut === 'en_attente') a.push('Compte en attente de validation')
      if (part.statut === 'suspendu') a.push('⚠️ Compte suspendu — contactez NYME')
      setAlertes(a)

    } catch (err) {
      console.error('[PartenaireDashboard]', err)
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/partenaires/login'); return }

      // Vérification rôle côté page
      const { data: user } = await supabase.from('utilisateurs').select('role').eq('id', session.user.id).single()
      if (!user || user.role !== 'partenaire') {
        toast.error('Accès réservé aux partenaires')
        await supabase.auth.signOut()
        router.replace('/partenaires/login')
        return
      }

      setUserId(session.user.id)
      await loadData(session.user.id)

      // Realtime
      const channel = supabase.channel('partenaire-rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'livraisons_partenaire' }, () => {
          if (session.user.id) loadData(session.user.id)
        }).subscribe()

      const { data: auth } = supabase.auth.onAuthStateChange(ev => {
        if (ev === 'SIGNED_OUT') router.replace('/partenaires/login')
      })

      return () => {
        supabase.removeChannel(channel)
        auth.subscription.unsubscribe()
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Créer livraison ────────────────────────────────────────────

  const handleCreateLivraison = async () => {
    if (!partenaire) return
    if (!formLivr.adresse_depart || !formLivr.adresse_arrivee || !formLivr.destinataire_nom || !formLivr.destinataire_tel) {
      toast.error('Remplissez les champs obligatoires')
      return
    }
    if (partenaire.livraisons_mois >= partenaire.livraisons_max) {
      toast.error(`Quota mensuel atteint (${partenaire.livraisons_max}). Upgradez votre plan.`)
      return
    }
    setSubmittingLivr(true)
    try {
      const { error } = await supabase.from('livraisons_partenaire').insert({
        partenaire_id: partenaire.id,
        adresse_depart: formLivr.adresse_depart,
        adresse_arrivee: formLivr.adresse_arrivee,
        lat_depart: formLivr.lat_depart || null,
        lng_depart: formLivr.lng_depart || null,
        lat_arrivee: formLivr.lat_arrivee || null,
        lng_arrivee: formLivr.lng_arrivee || null,
        destinataire_nom: formLivr.destinataire_nom,
        destinataire_tel: formLivr.destinataire_tel,
        instructions: formLivr.instructions || null,
        statut: 'en_attente',
        // Prix calculé par l'équipe NYME selon la distance
      })
      if (error) throw error
      toast.success('Livraison créée avec succès !')
      setShowForm(false)
      setFormLivr({ adresse_depart: '', lat_depart: 0, lng_depart: 0, adresse_arrivee: '', lat_arrivee: 0, lng_arrivee: 0, destinataire_nom: '', destinataire_tel: '', destinataire_whatsapp: '', instructions: '', date_programmee: '', heure: '09:00', contact_id: '' })
      if (userId) loadData(userId)
    } catch (err: any) {
      toast.error(err.message?.includes('Limite') ? err.message : 'Erreur lors de la création')
    } finally { setSubmittingLivr(false) }
  }

  // Sélectionner un contact pour pré-remplir
  const selectContact = (contact: Contact) => {
    setFormLivr(p => ({
      ...p,
      destinataire_nom: contact.nom,
      destinataire_tel: contact.telephone,
      destinataire_whatsapp: contact.whatsapp || '',
      adresse_arrivee: contact.adresse_habituelle || p.adresse_arrivee,
    }))
    toast.success(`Contact ${contact.nom} sélectionné`)
  }

  // ── Gérer contacts ─────────────────────────────────────────────

  const handleSaveContact = async () => {
    if (!userId) return
    if (!contactForm.nom || !contactForm.telephone) { toast.error('Nom et téléphone requis'); return }
    setSavingContact(true)
    try {
      if (editContact) {
        // Mise à jour — contacts_favoris n'a pas d'adresse, on upsert
        const { error } = await supabase.from('contacts_favoris').update({
          nom: contactForm.nom,
          telephone: contactForm.telephone,
          whatsapp: contactForm.whatsapp || null,
          email: contactForm.adresse_habituelle || null, // réutilise email pour l'adresse (table existante)
        }).eq('id', editContact.id)
        if (error) throw error
        toast.success('Contact modifié')
      } else {
        const { error } = await supabase.from('contacts_favoris').insert({
          user_id: userId,
          nom: contactForm.nom,
          telephone: contactForm.telephone,
          whatsapp: contactForm.whatsapp || null,
          email: contactForm.adresse_habituelle || null,
        })
        if (error) throw error
        toast.success('Contact ajouté')
      }
      setShowContactForm(false)
      setEditContact(null)
      setContactForm({ nom: '', telephone: '', whatsapp: '', adresse_habituelle: '' })
      if (userId) loadData(userId)
    } catch (err: any) {
      toast.error(err.message || 'Erreur')
    } finally { setSavingContact(false) }
  }

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Supprimer ce contact ?')) return
    await supabase.from('contacts_favoris').delete().eq('id', id)
    setContacts(p => p.filter(c => c.id !== id))
    toast.success('Contact supprimé')
  }

  // ── Payer abonnement ───────────────────────────────────────────

  const handlePaiement = async () => {
    if (!partenaire || !userId) return
    const prix = PLAN_CFG[partenaire.plan].prix
    if (soldeWallet < prix) { toast.error(`Solde insuffisant — manque ${fXOF(prix - soldeWallet)}`); return }
    try {
      const { error } = await supabase.rpc('process_wallet_transaction', {
        p_user_id: userId,
        p_type: 'commission',
        p_montant: -prix,
        p_reference: `ABO_${partenaire.id}_${Date.now()}`,
        p_note: `Abonnement ${partenaire.plan} — ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
      })
      if (error) throw error
      toast.success('Abonnement renouvelé !')
      if (userId) loadData(userId)
    } catch { toast.error('Erreur paiement') }
  }

  // ── Sauvegarder profil ─────────────────────────────────────────

  const handleSaveProfil = async () => {
    if (!partenaire) return
    setSavingProfil(true)
    try {
      const { error } = await supabase.from('partenaires').update({
        entreprise: profilForm.entreprise,
        nom_contact: profilForm.nom_contact,
        telephone: profilForm.telephone,
        email_pro: profilForm.email_pro,
        adresse: profilForm.adresse,
      }).eq('id', partenaire.id)
      if (error) throw error
      setPartenaire(p => p ? { ...p, ...profilForm } : null)
      setEditingProfil(false)
      toast.success('Profil mis à jour !')
    } catch { toast.error('Erreur mise à jour') }
    finally { setSavingProfil(false) }
  }

  // ── Export CSV ─────────────────────────────────────────────────

  const exportCSV = () => {
    const rows = [
      ['ID', 'Date', 'Départ', 'Arrivée', 'Destinataire', 'Téléphone', 'Statut', 'Prix (XOF)', 'Commission'],
      ...livraisons.map(l => [
        l.id.slice(0, 8), new Date(l.created_at).toLocaleDateString('fr-FR'),
        l.adresse_depart, l.adresse_arrivee,
        l.destinataire_nom || '', l.destinataire_tel || '',
        STATUT_CFG[l.statut]?.label || l.statut,
        l.prix || 0, l.commission || 0,
      ])
    ].map(r => r.join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\ufeff' + rows], { type: 'text/csv;charset=utf-8;' }))
    a.download = `nyme-livraisons-${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.csv`
    a.click()
  }

  // ── Stats calculées ────────────────────────────────────────────

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
    const matchRech = !q || l.adresse_depart.toLowerCase().includes(q) || l.adresse_arrivee.toLowerCase().includes(q) || (l.destinataire_nom || '').toLowerCase().includes(q) || (l.destinataire_tel || '').includes(q)
    return matchStatut && matchRech
  })

  const comptaMois = livraisons.filter(l => l.statut === 'livre' && l.prix).reduce((acc, l) => {
    const mois = new Date(l.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    if (!acc[mois]) acc[mois] = { nb: 0, depenses: 0, commissions: 0 }
    acc[mois].nb++; acc[mois].depenses += l.prix || 0; acc[mois].commissions += l.commission || 0
    return acc
  }, {} as Record<string, { nb: number; depenses: number; commissions: number }>)

  const inp = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-colors bg-white'

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Chargement...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-nyme-orange flex items-center justify-center">
              <Zap size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-heading font-extrabold text-gray-900 tracking-wider">NYME</span>
            <span className="text-gray-300 text-xs ml-1 hidden sm:block">/ Partenaires</span>
          </Link>
          <div className="flex items-center gap-2">
            {alertes.length > 0 && (
              <button className="relative p-2 rounded-lg text-red-500 hover:bg-red-50" title={alertes[0]}>
                <AlertCircle size={18} />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">{alertes.length}</span>
              </button>
            )}
            <button onClick={() => { if (userId) { setRefreshing(true); loadData(userId) } }} disabled={refreshing}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100">
              <User size={13} className="text-blue-600" />
              <span className="text-gray-700 text-xs truncate max-w-[120px]">{partenaire?.nom_contact}</span>
            </div>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/partenaires/login' }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 text-xs font-semibold">
              <LogOut size={14} />
            </button>
          </div>
        </div>
        {/* TABS */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${tab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              <t.icon size={13} />{t.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Alertes */}
        {alertes.map((a, i) => (
          <div key={i} className={`p-4 rounded-2xl border flex items-center gap-3 text-sm ${a.includes('suspendu') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <AlertCircle size={16} className="shrink-0" />{a}
            {a.includes('quota') && <Link href="#" onClick={() => setTab('wallet')} className="ml-auto text-xs font-bold underline">Upgrader →</Link>}
          </div>
        ))}

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-gray-900">Bonjour, {partenaire?.nom_contact?.split(' ')[0]} 👋</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <p className="text-gray-500 text-sm">{partenaire?.entreprise}</p>
                  {partenaire && <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${PLAN_CFG[partenaire.plan].color}`}>{PLAN_CFG[partenaire.plan].emoji} {PLAN_CFG[partenaire.plan].label}</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${partenaire?.statut === 'actif' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                    {partenaire?.statut === 'actif' ? '✅ Actif' : '⏳ En attente'}
                  </span>
                </div>
              </div>
              <button onClick={() => { setTab('planifier'); setShowForm(true) }}
                className="btn-primary inline-flex items-center gap-2 text-sm whitespace-nowrap">
                <Plus size={15} />Nouvelle livraison
              </button>
            </div>

            {/* Quota barre */}
            {partenaire && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900 text-sm">Quota mensuel</p>
                  <span className="text-sm"><span className="text-blue-600 font-black text-lg">{partenaire.livraisons_mois}</span> / {partenaire.livraisons_max}</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${progression >= 100 ? 'bg-red-500' : progression >= 80 ? 'bg-amber-400' : 'bg-gradient-to-r from-blue-500 to-blue-400'}`}
                    style={{ width: `${Math.min(100, progression)}%` }} />
                </div>
                <p className="text-gray-400 text-xs mt-1.5">{partenaire.livraisons_max - partenaire.livraisons_mois} livraisons restantes ce mois</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { icon: Package, label: 'Total', value: stats.total, color: 'bg-blue-500' },
                { icon: CheckCircle, label: 'Livrées', value: stats.livrees, color: 'bg-green-500', sub: `${stats.txSucces}%` },
                { icon: Clock, label: 'En cours', value: stats.enCours, color: 'bg-purple-500' },
                { icon: TrendingUp, label: 'Dépenses', value: stats.depenses > 0 ? fXOF(stats.depenses) : '—', color: 'bg-orange-500' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-3">
                  <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center shrink-0`}><s.icon size={18} className="text-white" /></div>
                  <div><p className="text-gray-400 text-xs">{s.label}</p><p className="font-black text-gray-900">{s.value}</p>{s.sub && <p className="text-gray-400 text-xs">{s.sub} succès</p>}</div>
                </div>
              ))}
            </div>

            {/* Coursier du mois */}
            {coursierFavori && (
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-5 text-white flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl font-black">{coursierFavori.nom.charAt(0)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-black">{coursierFavori.nom}</p>
                    <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"><Star size={10} />Coursier du mois</span>
                  </div>
                  <p className="text-white/80 text-xs">{livraisons.filter(l => l.coursier_id === coursierFavori.id && l.statut === 'livre').length} livraisons • ⭐ {coursierFavori.note_moyenne?.toFixed(1) || '—'}/5</p>
                </div>
                <div className={`text-xs px-3 py-1.5 rounded-full font-semibold ${coursierFavori.statut === 'disponible' ? 'bg-white/20' : 'bg-orange-700/50'}`}>
                  {coursierFavori.statut === 'disponible' ? '● Disponible' : '● En course'}
                </div>
              </div>
            )}

            {/* Livraisons récentes */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Livraisons récentes</h2>
                <button onClick={() => setTab('livraisons')} className="text-blue-600 text-xs hover:underline">Voir tout →</button>
              </div>
              {livraisons.length === 0 ? (
                <div className="p-10 text-center">
                  <Package size={36} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm mb-3">Aucune livraison. Créez votre première !</p>
                  <button onClick={() => { setTab('planifier'); setShowForm(true) }} className="btn-primary text-sm inline-flex items-center gap-2"><Plus size={14} />Créer une livraison</button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {livraisons.slice(0, 5).map(l => (
                    <div key={l.id} onClick={() => setDetail(l)} className="p-4 flex items-start gap-3 hover:bg-gray-50 cursor-pointer">
                      <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0"><MapPin size={14} className="text-blue-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{l.adresse_depart}</p>
                            <p className="text-gray-400 text-xs truncate">→ {l.adresse_arrivee}</p>
                          </div>
                          <Badge statut={l.statut} />
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>{fDate(l.created_at)}</span>
                          {l.prix && <span className="text-orange-600 font-bold">{fXOF(l.prix)}</span>}
                          {l.destinataire_nom && <span>👤 {l.destinataire_nom}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── LIVRAISONS ── */}
        {tab === 'livraisons' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">Livraisons <span className="text-gray-400 font-normal text-sm">({livraisons.length})</span></h2>
              <button onClick={() => { setTab('planifier'); setShowForm(true) }} className="btn-primary text-sm inline-flex items-center gap-1.5"><Plus size={14} />Nouvelle</button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input placeholder="Adresse, destinataire..." value={recherche} onChange={e => setRecherche(e.target.value)} className={`${inp} pl-9`} />
              </div>
              <div className="flex gap-2 flex-wrap">
                {['tous', 'en_attente', 'en_cours', 'livre', 'annule'].map(s => (
                  <button key={s} onClick={() => setFiltreStatut(s)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold ${filtreStatut === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                    {s === 'tous' ? 'Tous' : STATUT_CFG[s]?.label || s}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {livraisonsFiltrees.length === 0 ? (
                <div className="p-10 text-center text-gray-400"><Package size={32} className="mx-auto mb-3 opacity-30" />Aucune livraison</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {livraisonsFiltrees.map(l => (
                    <div key={l.id} onClick={() => setDetail(l)} className="p-4 sm:p-5 flex items-start gap-3 hover:bg-gray-50 cursor-pointer">
                      <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0"><MapPin size={14} className="text-blue-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{l.adresse_depart}</p>
                            <p className="text-gray-400 text-xs truncate">→ {l.adresse_arrivee}</p>
                          </div>
                          <Badge statut={l.statut} />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                          <span>{fDate(l.created_at)}</span>
                          {l.prix && <span className="text-orange-600 font-bold">{fXOF(l.prix)}</span>}
                          {l.destinataire_nom && <span>👤 {l.destinataire_nom}</span>}
                          {l.destinataire_tel && (
                            <a href={`tel:${l.destinataire_tel}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-blue-500 hover:underline">
                              <Phone size={9} />{l.destinataire_tel}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <FileText size={14} />Exporter CSV
            </button>
          </div>
        )}

        {/* ── PLANIFIER ── */}
        {tab === 'planifier' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">Planifier une livraison</h2>
              <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm inline-flex items-center gap-1.5"><Plus size={14} />Créer</button>
            </div>

            {showForm && (
              <div className="bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900">Nouvelle livraison</h3>

                {/* Sélection contact rapide */}
                {contacts.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Sélectionner un contact</p>
                    <div className="flex flex-wrap gap-2">
                      {contacts.slice(0, 8).map(c => (
                        <button key={c.id} onClick={() => selectContact(c)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${formLivr.destinataire_nom === c.nom ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}>
                          👤 {c.nom}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Adresse de départ *</label>
                    <input type="text" placeholder="Ex: Avenue Kwame Nkrumah, Ouagadougou" value={formLivr.adresse_depart}
                      onChange={e => setFormLivr(p => ({ ...p, adresse_depart: e.target.value }))} className={inp} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Adresse de destination *</label>
                    <input type="text" placeholder="Ex: Secteur 15, rue XX" value={formLivr.adresse_arrivee}
                      onChange={e => setFormLivr(p => ({ ...p, adresse_arrivee: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Nom destinataire *</label>
                    <input type="text" placeholder="Prénom Nom" value={formLivr.destinataire_nom}
                      onChange={e => setFormLivr(p => ({ ...p, destinataire_nom: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Téléphone *</label>
                    <input type="tel" placeholder="+226 XX XX XX XX" value={formLivr.destinataire_tel}
                      onChange={e => setFormLivr(p => ({ ...p, destinataire_tel: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">WhatsApp</label>
                    <input type="tel" placeholder="+226 XX XX XX XX" value={formLivr.destinataire_whatsapp}
                      onChange={e => setFormLivr(p => ({ ...p, destinataire_whatsapp: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Date programmée</label>
                    <input type="date" value={formLivr.date_programmee}
                      min={new Date().toISOString().split('T')[0]}
                      max={new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}
                      onChange={e => setFormLivr(p => ({ ...p, date_programmee: e.target.value }))} className={inp} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Instructions</label>
                    <textarea placeholder="Fragile, appeler avant, sonnez..." value={formLivr.instructions}
                      onChange={e => setFormLivr(p => ({ ...p, instructions: e.target.value }))}
                      className={`${inp} resize-none h-20`} />
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-blue-700 text-xs">💡 Le prix sera calculé par l'équipe NYME selon la distance et le type de livraison.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-700 hover:bg-gray-50">Annuler</button>
                  <button onClick={handleCreateLivraison} disabled={submittingLivr}
                    className="flex-1 btn-primary py-3 text-sm disabled:opacity-50">
                    {submittingLivr ? 'Création...' : '🚀 Créer la livraison'}
                  </button>
                </div>
              </div>
            )}

            {/* Planning 30 jours */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Planning — 30 jours</h3></div>
              <div className="p-4 grid grid-cols-7 gap-1">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((j, i) => (
                  <div key={i} className="text-center text-xs font-bold text-gray-400 py-1">{j}</div>
                ))}
                {Array.from({ length: 30 }, (_, i) => {
                  const d = new Date(); d.setDate(d.getDate() + i)
                  const ds = d.toISOString().split('T')[0]
                  const nb = livraisons.filter(l => l.created_at.startsWith(ds)).length
                  return (
                    <div key={i} title={`${d.toLocaleDateString('fr-FR')} — ${nb} livraison(s)`}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold ${nb > 0 ? 'bg-blue-100 border-2 border-blue-300 text-blue-700' : 'bg-gray-50 text-gray-400'}`}>
                      {d.getDate()}
                      {nb > 0 && <span className="text-[8px] font-bold text-blue-600">{nb}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── CONTACTS ── */}
        {tab === 'contacts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">Mes contacts <span className="text-gray-400 font-normal text-sm">({contacts.length})</span></h2>
              <button onClick={() => { setEditContact(null); setContactForm({ nom: '', telephone: '', whatsapp: '', adresse_habituelle: '' }); setShowContactForm(true) }}
                className="btn-primary text-sm inline-flex items-center gap-1.5"><UserPlus size={14} />Ajouter</button>
            </div>
            <p className="text-gray-500 text-sm">Ajoutez vos clients fréquents pour les sélectionner rapidement lors des livraisons.</p>

            {showContactForm && (
              <div className="bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900">{editContact ? 'Modifier le contact' : 'Nouveau contact'}</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Nom *</label>
                    <input type="text" placeholder="Prénom Nom" value={contactForm.nom}
                      onChange={e => setContactForm(p => ({ ...p, nom: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Téléphone *</label>
                    <input type="tel" placeholder="+226 XX XX XX XX" value={contactForm.telephone}
                      onChange={e => setContactForm(p => ({ ...p, telephone: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">WhatsApp</label>
                    <input type="tel" placeholder="+226 XX XX XX XX" value={contactForm.whatsapp}
                      onChange={e => setContactForm(p => ({ ...p, whatsapp: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Adresse habituelle</label>
                    <input type="text" placeholder="Ex: Secteur 15..." value={contactForm.adresse_habituelle}
                      onChange={e => setContactForm(p => ({ ...p, adresse_habituelle: e.target.value }))} className={inp} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setShowContactForm(false); setEditContact(null) }}
                    className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 font-bold text-gray-700">Annuler</button>
                  <button onClick={handleSaveContact} disabled={savingContact}
                    className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50">
                    {savingContact ? '...' : editContact ? '💾 Modifier' : '✅ Ajouter'}
                  </button>
                </div>
              </div>
            )}

            {contacts.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
                <BookOpen size={36} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Aucun contact. Ajoutez vos clients fréquents pour des livraisons rapides.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map(c => (
                  <div key={c.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {c.nom.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm">{c.nom}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <a href={`tel:${c.telephone}`} className="flex items-center gap-1 hover:text-blue-600"><Phone size={9} />{c.telephone}</a>
                        {c.adresse_habituelle && <span className="flex items-center gap-1"><MapPin size={9} />{c.adresse_habituelle}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setTab('planifier'); setShowForm(true); selectContact(c) }}
                        className="p-2 bg-blue-50 rounded-lg text-blue-600 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1">
                        <Package size={12} />Livrer
                      </button>
                      <button onClick={() => { setEditContact(c); setContactForm({ nom: c.nom, telephone: c.telephone, whatsapp: c.whatsapp || '', adresse_habituelle: c.adresse_habituelle || '' }); setShowContactForm(true) }}
                        className="p-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200"><Edit2 size={13} /></button>
                      <button onClick={() => handleDeleteContact(c.id)} className="p-2 bg-red-50 rounded-lg text-red-500 hover:bg-red-100"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CARTE ── */}
        {tab === 'carte' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-gray-900">Carte en temps réel</h2>
            <div className="bg-white rounded-2xl p-3 border border-gray-100 flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />Disponibles ({coursiers.filter(c => c.statut === 'disponible').length})</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-400" />En course ({coursiers.filter(c => c.statut === 'occupe').length})</span>
            </div>
            <div className="h-96 rounded-2xl overflow-hidden border border-gray-200">
              <MapAdvanced
                coursier={coursiers.find(c => c.lat_actuelle && c.lng_actuelle) ? {
                  lat: coursiers.find(c => c.lat_actuelle)!.lat_actuelle!,
                  lng: coursiers.find(c => c.lng_actuelle)!.lng_actuelle!,
                  nom: 'Coursiers actifs',
                } : undefined}
              />
            </div>
            {coursiers.filter(c => c.lat_actuelle).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 font-bold text-gray-900">Coursiers localisés</div>
                {coursiers.filter(c => c.lat_actuelle).map(c => (
                  <div key={c.id} className="p-4 flex items-center gap-3 border-b border-gray-50 last:border-0">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">{c.nom.charAt(0)}</div>
                    <div className="flex-1"><p className="font-semibold text-gray-900 text-sm">{c.nom}</p><p className="text-xs text-gray-400">⭐ {c.note_moyenne?.toFixed(1) || '—'} • {c.total_courses} courses</p></div>
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${c.statut === 'disponible' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {c.statut === 'disponible' ? '● Disponible' : '● En course'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── WALLET ── */}
        {tab === 'wallet' && (
          <div className="space-y-5">
            <h2 className="text-xl font-black text-gray-900">Wallet & Abonnement</h2>
            <div className="bg-gradient-to-br from-blue-700 to-blue-600 rounded-3xl p-8 text-white shadow-xl">
              <p className="text-white/70 text-sm mb-1">Solde disponible</p>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-5xl font-black">{soldeWallet.toLocaleString()}</span>
                <span className="text-xl font-semibold">XOF</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(PLAN_CFG).map(([plan, cfg]) => (
                  <button key={plan} onClick={() => partenaire?.plan !== plan && toast(`Contactez NYME pour changer vers ${cfg.label}`, { icon: '📞' })}
                    className={`rounded-xl p-3 text-left transition-all ${partenaire?.plan === plan ? 'bg-white text-blue-700' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    <p className="font-black text-sm">{cfg.emoji} {cfg.label}</p>
                    <p className="text-xs opacity-70 mt-0.5">{fXOF(cfg.prix)}/mois</p>
                    <p className="text-xs opacity-70">{cfg.max} livraisons</p>
                  </button>
                ))}
              </div>
            </div>

            {partenaire && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><CreditCard size={16} />Payer l'abonnement mensuel</h3>
                <div className="flex items-center justify-between">
                  <div><p className="font-semibold text-gray-900">Plan {PLAN_CFG[partenaire.plan].label}</p><p className="text-gray-400 text-sm">{PLAN_CFG[partenaire.plan].max} livraisons/mois</p></div>
                  <p className="text-2xl font-black text-blue-600">{fXOF(PLAN_CFG[partenaire.plan].prix)}</p>
                </div>
                <button onClick={handlePaiement} disabled={soldeWallet < PLAN_CFG[partenaire.plan].prix}
                  className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50">
                  {soldeWallet >= PLAN_CFG[partenaire.plan].prix
                    ? `💳 Payer ${fXOF(PLAN_CFG[partenaire.plan].prix)}`
                    : `Solde insuffisant (manque ${fXOF(PLAN_CFG[partenaire.plan].prix - soldeWallet)})`}
                </button>
                <p className="text-gray-400 text-xs text-center">Pour recharger votre wallet, contactez nyme.contact@gmail.com</p>
              </div>
            )}

            {/* Récapitulatif mensuel */}
            {Object.keys(comptaMois).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">Récapitulatif mensuel</h3>
                  <button onClick={exportCSV} className="text-xs text-blue-600 font-semibold flex items-center gap-1"><FileText size={11} />CSV</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b">
                      {['Mois', 'Livraisons', 'Montant', 'Commission'].map(h => (
                        <th key={h} className={`px-4 py-3 text-gray-400 text-xs uppercase font-semibold ${h === 'Mois' ? 'text-left' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {Object.entries(comptaMois).map(([mois, d]) => (
                        <tr key={mois} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 font-medium capitalize">{mois}</td>
                          <td className="px-4 py-3 text-right text-gray-900">{d.nb}</td>
                          <td className="px-4 py-3 text-right text-blue-600 font-semibold">{fXOF(d.depenses)}</td>
                          <td className="px-4 py-3 text-right text-orange-600">{fXOF(d.commissions)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Transactions */}
            {txWallet.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 font-bold text-gray-900">Transactions</div>
                {txWallet.map((tx: any, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-50 last:border-0">
                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-base">💳</div>
                    <div className="flex-1"><p className="text-gray-900 text-sm font-semibold">{tx.note || tx.type}</p><p className="text-gray-400 text-xs">{fDate(tx.created_at)}</p></div>
                    <p className={`font-black text-sm ${tx.montant > 0 ? 'text-green-600' : 'text-red-500'}`}>{tx.montant > 0 ? '+' : ''}{tx.montant.toLocaleString()} XOF</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── COMPTE ── */}
        {tab === 'compte' && (
          <div className="space-y-5">
            <h2 className="text-xl font-black text-gray-900">Mon compte</h2>

            {!editingProfil ? (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">Informations entreprise</h3>
                  <button onClick={() => setEditingProfil(true)} className="flex items-center gap-1.5 text-blue-600 text-sm font-semibold hover:underline"><Edit2 size={13} />Modifier</button>
                </div>
                {partenaire && [
                  ['Entreprise', partenaire.entreprise],
                  ['Contact', partenaire.nom_contact],
                  ['Email pro', partenaire.email_pro || '—'],
                  ['Téléphone', partenaire.telephone || '—'],
                  ['Adresse', (partenaire as any).adresse || '—'],
                  ['Plan', `${PLAN_CFG[partenaire.plan].emoji} ${PLAN_CFG[partenaire.plan].label}`],
                  ['Commission', `${partenaire.taux_commission}%`],
                  ['Membre depuis', new Date(partenaire.date_debut).toLocaleDateString('fr-FR')],
                ].map(([l, v], i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-gray-500 text-sm">{l}</span>
                    <span className="font-semibold text-gray-900 text-sm">{v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 border-2 border-blue-200 space-y-4">
                <h3 className="font-bold text-gray-900">Modifier le profil</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { key: 'entreprise', label: 'Nom entreprise *', type: 'text', ph: 'Nom de votre entreprise' },
                    { key: 'nom_contact', label: 'Nom contact *', type: 'text', ph: 'Votre nom' },
                    { key: 'telephone', label: 'Téléphone', type: 'tel', ph: '+226 XX XX XX XX' },
                    { key: 'email_pro', label: 'Email pro', type: 'email', ph: 'contact@entreprise.com' },
                    { key: 'adresse', label: 'Adresse', type: 'text', ph: 'Adresse entreprise' },
                  ].map(f => (
                    <div key={f.key} className={f.key === 'adresse' ? 'sm:col-span-2' : ''}>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
                      <input type={f.type} placeholder={f.ph} value={profilForm[f.key as keyof typeof profilForm]}
                        onChange={e => setProfilForm(p => ({ ...p, [f.key]: e.target.value }))} className={inp} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setEditingProfil(false)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-700">Annuler</button>
                  <button onClick={handleSaveProfil} disabled={savingProfil} className="flex-1 btn-primary py-3 text-sm disabled:opacity-50">
                    {savingProfil ? 'Sauvegarde...' : '💾 Sauvegarder'}
                  </button>
                </div>
              </div>
            )}

            {/* Alertes sécurité */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><ShieldCheck size={15} className="text-blue-600" />Sécurité</h3>
              {alertes.length === 0
                ? <div className="flex items-center gap-2 text-green-600 text-sm"><CheckCircle size={14} />Aucune alerte — compte sécurisé ✓</div>
                : alertes.map((a, i) => <div key={i} className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-2 flex items-start gap-2"><AlertCircle size={12} className="shrink-0 mt-0.5" />{a}</div>)
              }
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <a href="mailto:nyme.contact@gmail.com" className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 hover:border-blue-200 transition-all">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><Phone size={16} className="text-blue-600" /></div>
                <div><p className="font-bold text-gray-900 text-sm">Contacter NYME</p><p className="text-gray-400 text-xs">nyme.contact@gmail.com</p></div>
              </a>
              <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/partenaires/login' }}
                className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-red-100 hover:border-red-200 transition-all text-left">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center"><LogOut size={16} className="text-red-500" /></div>
                <div><p className="font-bold text-red-600 text-sm">Déconnexion</p><p className="text-gray-400 text-xs">Quitter le dashboard</p></div>
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-gray-300 text-xs mt-8 pb-4">© {new Date().getFullYear()} NYME · Dashboard Partenaires · Ouagadougou, Burkina Faso</p>
      </div>

      {/* ── MODAL DÉTAIL ── */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-black text-gray-900">#{detail.id.slice(0, 8).toUpperCase()}</h3>
              <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={15} className="text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between"><span className="text-gray-500 text-sm">Statut</span><Badge statut={detail.statut} /></div>

              {detail.lat_depart && detail.lng_depart && detail.lat_arrivee && detail.lng_arrivee && (
                <div className="h-48 rounded-xl overflow-hidden border border-gray-200">
                  <MapAdvanced
                    depart={{ lat: detail.lat_depart, lng: detail.lng_depart, label: detail.adresse_depart }}
                    arrivee={{ lat: detail.lat_arrivee, lng: detail.lng_arrivee, label: detail.adresse_arrivee }}
                  />
                </div>
              )}

              {[
                ['📍 Départ', detail.adresse_depart],
                ['🏁 Arrivée', detail.adresse_arrivee],
                ['👤 Destinataire', detail.destinataire_nom || '—'],
                ['📅 Créée', fDate(detail.created_at)],
                ['💰 Prix', detail.prix ? fXOF(detail.prix) : 'En attente de calcul'],
                ['📝 Instructions', detail.instructions || '—'],
              ].map(([l, v], i) => (
                <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500 text-sm shrink-0">{l}</span>
                  <span className="text-gray-900 text-sm text-right">{v}</span>
                </div>
              ))}

              {detail.destinataire_tel && (
                <div className="flex gap-2">
                  <a href={`tel:${detail.destinataire_tel}`} className="flex-1 py-2.5 rounded-xl bg-green-500 text-white font-bold text-sm text-center hover:bg-green-600 flex items-center justify-center gap-2">📞 Appeler</a>
                  <a href={`https://wa.me/226${detail.destinataire_tel.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-xl bg-green-600 text-white font-bold text-sm text-center hover:bg-green-700 flex items-center justify-center gap-2">💬 WhatsApp</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
