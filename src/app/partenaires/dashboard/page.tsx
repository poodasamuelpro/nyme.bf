// src/app/partenaires/dashboard/page.tsx \u2014 Dashboard partenaire NYME v3
// \u2705 Vrais prix (25k/65k/devis) | \u2705 Abonnement mensuel wallet | \u2705 Pas de commission UI
// \u2705 Carte temps r\u00e9el | \u2705 Design app livraison production-grade
// MODIFICATION AUDIT : Suivi temps r\u00e9el positions coursiers via localisation_coursier
//   + subscription postgres_changes sur livraisons_partenaire et localisation_coursier
//   + rafra\u00eechissement positions toutes les 5s (polling l\u00e9ger) + subscription Supabase Realtime
'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import type { PartenaireRow, LivraisonPartenaire as LivraisonPartenaireRow } from '@/lib/supabase'
import {
  Package, TrendingUp, Clock, CheckCircle, Zap, LogOut,
  User, Bell, RefreshCw, MapPin, AlertCircle,
  Calendar, Phone, Wallet, BarChart3, ShieldCheck, Plus,
  FileText, X, Search, Star, CreditCard, Settings,
  Map, UserPlus, BookOpen, Edit2, Trash2, ArrowUpRight,
  Navigation, Bike, Circle, ChevronDown,
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const MapAdvanced = dynamic(() => import('@/components/MapAdvanced'), { ssr: false })

// \u2500\u2500 Types \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

interface Contact {
  id: string
  nom: string
  telephone: string
  whatsapp?: string
  adresse_habituelle?: string
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

// \u2500\u2500 Config plans \u2014 VRAIS PRIX du site nyme-bf.vercel.app/partenaires \u2500\u2500

const PLAN_CFG = {
  starter: {
    label: 'Starter',
    emoji: '\ud83d\udfe2',
    color: 'from-emerald-500 to-green-600',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    max: 40,
    prix: 45000,
    delai: '45 min',
    features: ['40 livraisons/mois', 'Livreur d\u00e9di\u00e9', 'Livraison sous 45 min', 'Suivi GPS', 'Dashboard', 'Support email'],
  },
  business: {
    label: 'Business',
    emoji: '\u2b50',
    color: 'from-orange-500 to-amber-500',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    max: 100,
    prix: 90000,
    delai: '30 min',
    features: ['100 livraisons/mois', 'Livreur d\u00e9di\u00e9 quotidien', 'Express sous 30 min', 'Tra\u00e7abilit\u00e9 photos', 'WhatsApp Business', 'Support 7j/7'],
  },
  enterprise: {
    label: 'Enterprise',
    emoji: '\ud83c\udfe2',
    color: 'from-violet-600 to-purple-700',
    badge: 'bg-violet-100 text-violet-700 border-violet-200',
    max: 9999,
    prix: 0, // sur devis
    delai: 'Express',
    features: ['Livraisons illimit\u00e9es', '\u00c9quipe de livreurs', 'API sur mesure', 'Multi-utilisateurs', 'SLA garanti', 'Support 24h/24'],
  },
}

const STATUT_CFG: Record<string, { label: string; color: string; bg: string; dot: string; icon: string }> = {
  en_attente: { label: 'En attente',   color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',  dot: 'bg-amber-400',  icon: '\u23f3' },
  en_cours:   { label: 'En livraison', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',    dot: 'bg-blue-500',   icon: '\ud83d\udeb4' },
  livre:      { label: 'Livr\u00e9',        color: 'text-green-700',  bg: 'bg-green-50 border-green-200',  dot: 'bg-green-500',  icon: '\u2705' },
  annule:     { label: 'Annul\u00e9',       color: 'text-red-700',    bg: 'bg-red-50 border-red-200',      dot: 'bg-red-400',    icon: '\u274c' },
}

const TABS = [
  { id: 'dashboard',  label: 'Accueil',    icon: BarChart3 },
  { id: 'livraisons', label: 'Livraisons', icon: Package },
  { id: 'planifier',  label: 'Planifier',  icon: Calendar },
  { id: 'contacts',   label: 'Contacts',   icon: BookOpen },
  { id: 'carte',      label: 'Carte',      icon: Map },
  { id: 'wallet',     label: 'Wallet',     icon: Wallet },
  { id: 'compte',     label: 'Compte',     icon: Settings },
]

// \u2500\u2500 Utilitaires \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const fXOF = (n: number) =>
  n === 0 ? 'Sur devis' : new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'

const fDate = (d: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d))

// \u2500\u2500 Badge statut \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function Badge({ statut }: { statut: string }) {
  const s = STATUT_CFG[statut] || STATUT_CFG.en_attente
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${s.bg} ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${statut === 'en_cours' ? 'animate-pulse' : ''}`} />
      {s.label}
    </span>
  )
}

// \u2500\u2500 Mini sparkline \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function MiniSparkline({ data, color = '#3b82f6' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data) || 1
  const w = 80, h = 32
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ')
  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  )
}

// \u2500\u2500 Page principale \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export default function PartenaireDashboard() {
  const router = useRouter()

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
  // \u2705 CORRECTION : g\u00e9n\u00e9rique d\u00e9plac\u00e9 sur new Map() pour r\u00e9soudre l'erreur TS "Expected 1 arguments, but got 0"
  const coursierPositionsRef = useRef(new Map<string, { lat: number; lng: number }>())
  const [editingProfil, setEditingProfil] = useState(false)
  const [profilForm, setProfilForm] = useState({ entreprise: '', nom_contact: '', telephone: '', email_pro: '', adresse: '' })
  const [savingProfil, setSavingProfil] = useState(false)
  const [showNotifPanel, setShowNotifPanel] = useState(false)

  // Formulaire nouvelle livraison
  const [showForm,    setShowForm]    = useState(false)
  const [formLivr,    setFormLivr]    = useState({
    adresse_depart: '', lat_depart: 0, lng_depart: 0,
    adresse_arrivee: '', lat_arrivee: 0, lng_arrivee: 0,
    destinataire_nom: '', destinataire_tel: '', destinataire_whatsapp: '',
    instructions: '', date_programmee: '', heure: '09:00', contact_id: '',
  })
  const [submittingLivr, setSubmittingLivr] = useState(false)

  // Formulaire contact
  const [showContactForm, setShowContactForm] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [contactForm, setContactForm] = useState({ nom: '', telephone: '', whatsapp: '', adresse_habituelle: '' })
  const [savingContact, setSavingContact] = useState(false)

  // \u2500\u2500 Rafra\u00eechissement positions coursiers uniquement (l\u00e9ger) \u2500\u2500\u2500\u2500\u2500\u2500
  const refreshCoursierPositions = useCallback(async () => {
    try {
      const { data: posData } = await supabase
        .from('localisation_coursier')
        .select('coursier_id, lat, lng, statut, vitesse, direction, updated_at')
        .in('statut', ['disponible', 'occupe'])

      if (posData && posData.length > 0) {
        posData.forEach((p: { coursier_id: string; lat: number; lng: number }) => {
          coursierPositionsRef.current.set(p.coursier_id, { lat: p.lat, lng: p.lng })
        })
        setCoursiers(prev => prev.map(c => {
          const pos = coursierPositionsRef.current.get(c.id)
          if (pos) return { ...c, lat_actuelle: pos.lat, lng_actuelle: pos.lng }
          return c
        }))
      }
    } catch (posErr) {
      console.debug('[dashboard partenaire] Positions refresh (fallback):', posErr)
    }
  }, [])

  const loadData = useCallback(async (uid: string) => {
    try {
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

      const { data: livs } = await supabase
        .from('livraisons_partenaire')
        .select(`*, coursier:coursier_id(id, nom, note_moyenne)`)
        .eq('partenaire_id', part.id)
        .order('created_at', { ascending: false })
        .limit(200)
      const livsData = (livs || []) as LivraisonPartenaireRow[]
      setLivraisons(livsData)

      const { data: ctData } = await supabase
        .from('contacts_favoris').select('*').eq('user_id', uid).order('nom')
      setContacts((ctData || []) as Contact[])

      const { data: cData } = await supabase
        .from('coursiers')
        .select('id, statut, lat_actuelle, lng_actuelle, total_courses, note_moyenne')
        .in('statut', ['disponible', 'occupe'])
      if (cData) {
        const ids = cData.map((c: any) => c.id)
        const { data: uData } = await supabase.from('utilisateurs').select('id, nom').in('id', ids)
        const enriched: CoursierActif[] = cData.map((c: any) => ({
          ...c, nom: uData?.find((u: any) => u.id === c.id)?.nom || 'Coursier',
        }))
        setCoursiers(enriched)
        const counts: Record<string, number> = {}
        livsData.filter(l => l.statut === 'livre' && l.coursier_id).forEach(l => {
          if (l.coursier_id) counts[l.coursier_id] = (counts[l.coursier_id] || 0) + 1
        })
        const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
        if (topId) setCoursierFavori(enriched.find(c => c.id === topId) || null)
      }

      const { data: w } = await supabase.from('wallets').select('solde').eq('user_id', uid).single()
      setSoldeWallet(w?.solde || 0)
      const { data: txs } = await supabase.from('transactions_wallet')
        .select('type, montant, note, created_at').eq('user_id', uid)
        .order('created_at', { ascending: false }).limit(30)
      setTxWallet(txs || [])

      const a: string[] = []
      if (part.livraisons_mois >= part.livraisons_max) a.push(`Quota atteint : ${part.livraisons_mois}/${part.livraisons_max}`)
      else if (part.livraisons_mois / part.livraisons_max >= 0.8)
        a.push(`${Math.round(part.livraisons_mois / part.livraisons_max * 100)}% du quota utilis\u00e9 ce mois`)
      if (part.statut === 'en_attente') a.push('Compte en cours de validation \u2014 r\u00e9ponse sous 4h')
      if (part.statut === 'suspendu') a.push('\u26a0\ufe0f Compte suspendu \u2014 contactez NYME imm\u00e9diatement')
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
      const { data: user } = await supabase.from('utilisateurs').select('role').eq('id', session.user.id).single()
      if (!user || user.role !== 'partenaire') {
        toast.error('Acc\u00e8s r\u00e9serv\u00e9 aux partenaires')
        await supabase.auth.signOut()
        router.replace('/partenaires/login')
        return
      }
      setUserId(session.user.id)
      await loadData(session.user.id)

      const channelLivraisons = supabase.channel('partenaire-rt-livraisons')
        .on('postgres_changes', {
          event:  '*',
          schema: 'public',
          table:  'livraisons_partenaire',
        }, () => {
          if (session.user.id) loadData(session.user.id)
        }).subscribe()

      const channelPositions = supabase.channel('partenaire-rt-positions')
        .on('postgres_changes', {
          event:  '*',
          schema: 'public',
          table:  'localisation_coursier',
        }, (payload) => {
          const record = payload.new as { coursier_id?: string; lat?: number; lng?: number; statut?: string }
          if (record?.coursier_id && record?.lat && record?.lng) {
            coursierPositionsRef.current.set(record.coursier_id, {
              lat: record.lat,
              lng: record.lng,
            })
            setCoursiers(prev => prev.map(c =>
              c.id === record.coursier_id
                ? { ...c, lat_actuelle: record.lat!, lng_actuelle: record.lng!, statut: record.statut || c.statut }
                : c
            ))
          }
        }).subscribe()

      const pollingInterval = setInterval(() => {
        refreshCoursierPositions()
      }, 5000)

      const { data: auth } = supabase.auth.onAuthStateChange(ev => {
        if (ev === 'SIGNED_OUT') router.replace('/partenaires/login')
      })
      return () => {
        supabase.removeChannel(channelLivraisons)
        supabase.removeChannel(channelPositions)
        clearInterval(pollingInterval)
        auth.subscription.unsubscribe()
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // \u2500\u2500 Cr\u00e9er livraison \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  const handleCreateLivraison = async () => {
    if (!partenaire) return
    if (!formLivr.adresse_depart || !formLivr.adresse_arrivee || !formLivr.destinataire_nom || !formLivr.destinataire_tel) {
      toast.error('Remplissez les champs obligatoires')
      return
    }
    if (partenaire.livraisons_mois >= partenaire.livraisons_max) {
      toast.error(`Quota mensuel atteint (${partenaire.livraisons_max}). Contactez NYME pour upgrader.`)
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
      })
      if (error) throw error
      toast.success('\u2705 Livraison cr\u00e9\u00e9e ! Votre livreur d\u00e9di\u00e9 est en route.')
      setShowForm(false)
      setFormLivr({ adresse_depart: '', lat_depart: 0, lng_depart: 0, adresse_arrivee: '', lat_arrivee: 0, lng_arrivee: 0, destinataire_nom: '', destinataire_tel: '', destinataire_whatsapp: '', instructions: '', date_programmee: '', heure: '09:00', contact_id: '' })
      if (userId) loadData(userId)
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la cr\u00e9ation')
    } finally { setSubmittingLivr(false) }
  }

  const selectContact = (contact: Contact) => {
    setFormLivr(p => ({
      ...p,
      destinataire_nom: contact.nom,
      destinataire_tel: contact.telephone,
      destinataire_whatsapp: contact.whatsapp || '',
      adresse_arrivee: contact.adresse_habituelle || p.adresse_arrivee,
    }))
    toast.success(`\ud83d\udc64 ${contact.nom} s\u00e9lectionn\u00e9`)
  }

  // \u2500\u2500 Contacts \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  const handleSaveContact = async () => {
    if (!userId) return
    if (!contactForm.nom || !contactForm.telephone) { toast.error('Nom et t\u00e9l\u00e9phone requis'); return }
    setSavingContact(true)
    try {
      if (editContact) {
        const { error } = await supabase.from('contacts_favoris').update({
          nom: contactForm.nom, telephone: contactForm.telephone,
          whatsapp: contactForm.whatsapp || null,
          email: contactForm.adresse_habituelle || null,
        }).eq('id', editContact.id)
        if (error) throw error
        toast.success('Contact modifi\u00e9')
      } else {
        const { error } = await supabase.from('contacts_favoris').insert({
          user_id: userId, nom: contactForm.nom, telephone: contactForm.telephone,
          whatsapp: contactForm.whatsapp || null, email: contactForm.adresse_habituelle || null,
        })
        if (error) throw error
        toast.success('Contact ajout\u00e9')
      }
      setShowContactForm(false); setEditContact(null)
      setContactForm({ nom: '', telephone: '', whatsapp: '', adresse_habituelle: '' })
      if (userId) loadData(userId)
    } catch (err: any) { toast.error(err.message || 'Erreur') }
    finally { setSavingContact(false) }
  }

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Supprimer ce contact ?')) return
    await supabase.from('contacts_favoris').delete().eq('id', id)
    setContacts(p => p.filter(c => c.id !== id))
    toast.success('Contact supprim\u00e9')
  }

  // \u2500\u2500 Payer abonnement mensuel (wallet) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  const handlePaiementAbonnement = async () => {
    if (!partenaire || !userId) return
    const plan = PLAN_CFG[partenaire.plan]
    if (plan.prix === 0) {
      toast('Contactez NYME pour renouveler votre plan Enterprise', { icon: '\ud83d\udcde' })
      return
    }
    if (soldeWallet < plan.prix) {
      toast.error(`Solde insuffisant \u2014 rechargez votre wallet (manque ${fXOF(plan.prix - soldeWallet)})`)
      return
    }
    try {
      const { error } = await supabase.rpc('process_wallet_transaction', {
        p_user_id: userId,
        p_type: 'paiement_course',
        p_montant: -plan.prix,
        p_reference: `ABO_${partenaire.id}_${Date.now()}`,
        p_note: `Abonnement ${plan.label} \u2014 ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
      })
      if (error) throw error
      toast.success(`\u2705 Abonnement ${plan.label} renouvel\u00e9 pour ce mois !`)
      if (userId) loadData(userId)
    } catch { toast.error('Erreur paiement \u2014 r\u00e9essayez ou contactez NYME') }
  }

  // \u2500\u2500 Profil \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  const handleSaveProfil = async () => {
    if (!partenaire) return
    setSavingProfil(true)
    try {
      const { error } = await supabase.from('partenaires').update({
        entreprise: profilForm.entreprise, nom_contact: profilForm.nom_contact,
        telephone: profilForm.telephone, email_pro: profilForm.email_pro, adresse: profilForm.adresse,
      }).eq('id', partenaire.id)
      if (error) throw error
      setPartenaire(p => p ? { ...p, ...profilForm } : null)
      setEditingProfil(false)
      toast.success('Profil mis \u00e0 jour !')
    } catch { toast.error('Erreur mise \u00e0 jour') }
    finally { setSavingProfil(false) }
  }

  // \u2500\u2500 Export CSV \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  const exportCSV = () => {
    const rows = [
      ['ID', 'Date', 'D\u00e9part', 'Arriv\u00e9e', 'Destinataire', 'T\u00e9l\u00e9phone', 'Statut', 'Prix (FCFA)'],
      ...livraisons.map(l => [
        l.id.slice(0, 8), new Date(l.created_at).toLocaleDateString('fr-FR'),
        l.adresse_depart, l.adresse_arrivee,
        l.destinataire_nom || '', l.destinataire_tel || '',
        STATUT_CFG[l.statut]?.label || l.statut,
        l.prix || 0,
      ])
    ].map(r => r.join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\ufeff' + rows], { type: 'text/csv;charset=utf-8;' }))
    a.download = `nyme-livraisons-${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.csv`
    a.click()
  }

  // \u2500\u2500 Stats \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  const stats = {
    total:     livraisons.length,
    livrees:   livraisons.filter(l => l.statut === 'livre').length,
    enCours:   livraisons.filter(l => l.statut === 'en_cours').length,
    enAttente: livraisons.filter(l => l.statut === 'en_attente').length,
    depenses:  livraisons.filter(l => l.statut === 'livre').reduce((s, l) => s + (l.prix || 0), 0),
    txSucces:  livraisons.length > 0 ? Math.round(livraisons.filter(l => l.statut === 'livre').length / livraisons.length * 100) : 0,
  }

  const spark7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const ds = d.toISOString().split('T')[0]
    return livraisons.filter(l => l.created_at.startsWith(ds)).length
  })

  const progression = partenaire
    ? Math.min(100, Math.round(partenaire.livraisons_mois / partenaire.livraisons_max * 100))
    : 0

  const livraisonsFiltrees = livraisons.filter(l => {
    const matchStatut = filtreStatut === 'tous' || l.statut === filtreStatut
    const q = recherche.toLowerCase()
    const matchRech = !q
      || l.adresse_depart.toLowerCase().includes(q)
      || l.adresse_arrivee.toLowerCase().includes(q)
      || (l.destinataire_nom || '').toLowerCase().includes(q)
      || (l.destinataire_tel || '').includes(q)
    return matchStatut && matchRech
  })

  const inp = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all bg-white placeholder-gray-400'

  const plan = partenaire ? PLAN_CFG[partenaire.plan] : null

  // \u2500\u2500 Loading \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  if (loading) return (
    <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative w-16 h-16 mx-auto">
          <div className="w-16 h-16 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Bike size={20} className="text-orange-500" />
          </div>
        </div>
        <p className="text-gray-500 text-sm font-medium">Chargement de votre espace\u2026</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f7f7f5] font-sans">

      {/* \u2500\u2500 HEADER \u2500\u2500 */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">

          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-sm shadow-orange-200">
              <Zap size={15} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-black text-gray-900 tracking-tight text-sm">NYME</span>
            <span className="text-gray-300 text-xs hidden sm:block">/ Partenaires</span>
          </Link>

          <div className="flex items-center gap-1.5">
            {alertes.length > 0 && (
              <button onClick={() => setShowNotifPanel(!showNotifPanel)}
                className="relative p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                <Bell size={16} />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-black">
                  {alertes.length}
                </span>
              </button>
            )}
            <button onClick={() => { if (userId) { setRefreshing(true); loadData(userId) } }} disabled={refreshing}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-[10px] font-black">
                {partenaire?.nom_contact?.charAt(0) || '?'}
              </div>
              <span className="text-gray-700 text-xs font-semibold truncate max-w-[100px]">
                {partenaire?.nom_contact?.split(' ')[0]}
              </span>
              {plan && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${plan.badge}`}>
                  {plan.emoji}
                </span>
              )}
            </div>

            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/partenaires/login' }}
              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* Panel alertes */}
        {showNotifPanel && alertes.length > 0 && (
          <div className="absolute top-14 right-4 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
            {alertes.map((a, i) => (
              <div key={i} className="p-4 flex items-start gap-3 border-b border-gray-50 last:border-0">
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-gray-700 text-xs leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        )}

        {/* TABS */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto gap-0 border-t border-gray-50 scrollbar-hide">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${tab === t.id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200'}`}>
              <t.icon size={12} />{t.label}
              {t.id === 'livraisons' && stats.enCours > 0 && (
                <span className="w-4 h-4 bg-orange-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {stats.enCours}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">

        {/* Alertes inline */}
        {alertes.map((a, i) => (
          <div key={i} className={`p-3.5 rounded-2xl border flex items-center gap-3 text-sm ${
            a.includes('suspendu') ? 'bg-red-50 border-red-200 text-red-700'
            : a.includes('validation') ? 'bg-blue-50 border-blue-200 text-blue-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <AlertCircle size={15} className="shrink-0" />
            <span className="flex-1 font-medium text-xs">{a}</span>
            {a.includes('Quota') && (
              <a href="mailto:nyme.contact@gmail.com" className="text-xs font-black underline">Upgrader \u2192</a>
            )}
          </div>
        ))}

        {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 DASHBOARD \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}
        {tab === 'dashboard' && (
          <div className="space-y-4">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-black text-gray-900">
                  Bonjour, {partenaire?.nom_contact?.split(' ')[0]} \ud83d\udc4b
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <p className="text-gray-500 text-sm font-medium">{partenaire?.entreprise}</p>
                  {plan && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-black border ${plan.badge}`}>
                      {plan.emoji} {plan.label}
                    </span>
                  )}
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${
                    partenaire?.statut === 'actif'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                    {partenaire?.statut === 'actif' ? '\u25cf Actif' : '\u23f3 En attente'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => { setTab('planifier'); setShowForm(true) }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl shadow-sm shadow-orange-200 transition-all whitespace-nowrap">
                <Plus size={14} />Nouvelle livraison
              </button>
            </div>

            {/* Quota barre */}
            {partenaire && plan && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Quota mensuel</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {partenaire.livraisons_max - partenaire.livraisons_mois} livraisons restantes
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-gray-900">{partenaire.livraisons_mois}</span>
                    <span className="text-gray-400 text-sm"> / {partenaire.livraisons_max}</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      progression >= 100 ? 'bg-red-500' : progression >= 80 ? 'bg-amber-400' : 'bg-gradient-to-r from-orange-400 to-orange-500'
                    }`}
                    style={{ width: `${progression}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-300 text-xs">0</span>
                  <span className={`text-xs font-bold ${progression >= 80 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {progression}%
                  </span>
                  <span className="text-gray-300 text-xs">{partenaire.livraisons_max}</span>
                </div>
              </div>
            )}

            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { icon: Package,     label: 'Total',        value: stats.total,     sub: '7 jours',        color: 'bg-blue-500',   spark: spark7,       sparkColor: '#3b82f6' },
                { icon: CheckCircle, label: 'Livr\u00e9es',      value: stats.livrees,   sub: `${stats.txSucces}% succ\u00e8s`, color: 'bg-green-500',  spark: null,         sparkColor: '#22c55e' },
                { icon: Bike,        label: 'En livraison', value: stats.enCours,   sub: 'maintenant',     color: stats.enCours > 0 ? 'bg-orange-500' : 'bg-gray-400', spark: null, sparkColor: '#f97316' },
                { icon: Clock,       label: 'En attente',   value: stats.enAttente, sub: '\u00e0 traiter',      color: 'bg-violet-500', spark: null,         sparkColor: '#8b5cf6' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className={`w-9 h-9 ${s.color} rounded-xl flex items-center justify-center shrink-0`}>
                      <s.icon size={16} className="text-white" />
                    </div>
                    {s.spark && <MiniSparkline data={s.spark} color={s.sparkColor} />}
                  </div>
                  <div>
                    <p className="text-2xl font-black text-gray-900">{s.value}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{s.label}</p>
                    <p className="text-gray-300 text-[10px]">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Livraisons EN COURS */}
            {stats.enCours > 0 && (
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-4 text-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <p className="font-black text-sm">{stats.enCours} livraison{stats.enCours > 1 ? 's' : ''} en cours</p>
                  </div>
                  <button onClick={() => setTab('carte')}
                    className="text-xs text-white/80 font-semibold flex items-center gap-1 hover:text-white">
                    <Navigation size={11} />Voir carte
                  </button>
                </div>
                <div className="space-y-2">
                  {livraisons.filter(l => l.statut === 'en_cours').slice(0, 2).map(l => (
                    <div key={l.id} onClick={() => setDetail(l)}
                      className="bg-white/15 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-white/25 transition-colors">
                      <Bike size={14} className="text-white/80 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-semibold truncate">{l.adresse_arrivee}</p>
                        <p className="text-white/60 text-[10px]">Pour {l.destinataire_nom || '\u2014'}</p>
                      </div>
                      <ArrowUpRight size={12} className="text-white/60 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coursier du mois */}
            {coursierFavori && (
              <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-sm">
                  {coursierFavori.nom.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-gray-900 text-sm">{coursierFavori.nom}</p>
                    <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-200 flex items-center gap-1">