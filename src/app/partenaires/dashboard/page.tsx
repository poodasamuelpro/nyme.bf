// src/app/partenaires/dashboard/page.tsx \u2014 Dashboard partenaire NYME v3
// \u2705 Vrais prix (25k/65k/devis) | \u2705 Abonnement mensuel wallet | \u2705 Pas de commission UI
// \u2705 Carte temps r\u00e9el | \u2705 Design app livraison production-grade
'use client'
import { useEffect, useState, useCallback } from 'react'
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
    max: 30,
    prix: 25000,
    delai: '45 min',
    features: ['30 livraisons/mois', 'Livreur d\u00e9di\u00e9', 'Livraison sous 45 min', 'Suivi GPS', 'Dashboard', 'Support email'],
  },
  business: {
    label: 'Business',
    emoji: '\u2b50',
    color: 'from-orange-500 to-amber-500',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    max: 100,
    prix: 65000,
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
  en_attente: { label: 'En attente', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',   dot: 'bg-amber-400',  icon: '\u23f3' },
  en_cours:   { label: 'En livraison', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200',     dot: 'bg-blue-500',   icon: '\ud83d\udeb4' },
  livre:      { label: 'Livr\u00e9',        color: 'text-green-700', bg: 'bg-green-50 border-green-200',  dot: 'bg-green-500',  icon: '\u2705' },
  annule:     { label: 'Annul\u00e9',       color: 'text-red-700',   bg: 'bg-red-50 border-red-200',      dot: 'bg-red-400',    icon: '\u274c' },
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

  // \u2500\u2500 Chargement \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

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

      const channel = supabase.channel('partenaire-rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'livraisons_partenaire' }, () => {
          if (session.user.id) loadData(session.user.id)
        }).subscribe()
      const { data: auth } = supabase.auth.onAuthStateChange(ev => {
        if (ev === 'SIGNED_OUT') router.replace('/partenaires/login')
      })
      return () => { supabase.removeChannel(channel); auth.subscription.unsubscribe() }
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

  // Sparkline : livraisons par jour sur les 7 derniers jours
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

  const plan = partenaire ? PLAN_CFG[partenaire.plan] : null

  return (
    <div className="min-h-screen bg-[#f7f7f5] font-sans">

      {/* \u2500\u2500 HEADER \u2500\u2500 */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-sm shadow-orange-200">
              <Zap size={15} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-black text-gray-900 tracking-tight text-sm">NYME</span>
            <span className="text-gray-300 text-xs hidden sm:block">/ Partenaires</span>
          </Link>

          {/* Actions */}
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

            {/* Profil chip */}
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

            {/* Hero salutation */}
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
                {
                  icon: Package, label: 'Total', value: stats.total, sub: '7 jours',
                  color: 'bg-blue-500', spark: spark7, sparkColor: '#3b82f6',
                },
                {
                  icon: CheckCircle, label: 'Livr\u00e9es', value: stats.livrees, sub: `${stats.txSucces}% succ\u00e8s`,
                  color: 'bg-green-500', spark: null, sparkColor: '#22c55e',
                },
                {
                  icon: Bike, label: 'En livraison', value: stats.enCours, sub: 'maintenant',
                  color: stats.enCours > 0 ? 'bg-orange-500' : 'bg-gray-400', spark: null, sparkColor: '#f97316',
                },
                {
                  icon: Clock, label: 'En attente', value: stats.enAttente, sub: '\u00e0 traiter',
                  color: 'bg-violet-500', spark: null, sparkColor: '#8b5cf6',
                },
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

            {/* Livraisons EN COURS \u2014 prominent si elles existent */}
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
                      <Star size={8} fill="currentColor" />Mon livreur
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {livraisons.filter(l => l.coursier_id === coursierFavori.id && l.statut === 'livre').length} livraisons
                    {coursierFavori.note_moyenne ? ` \u00b7 \u2b50 ${coursierFavori.note_moyenne.toFixed(1)}/5` : ''}
                  </p>
                </div>
                <div className={`text-[11px] px-3 py-1.5 rounded-full font-bold flex items-center gap-1 ${
                  coursierFavori.statut === 'disponible'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-100 text-orange-700'}`}>
                  <Circle size={6} fill="currentColor" />
                  {coursierFavori.statut === 'disponible' ? 'Disponible' : 'En course'}
                </div>
              </div>
            )}

            {/* Livraisons r\u00e9centes */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                <h2 className="font-black text-gray-900 text-sm">Livraisons r\u00e9centes</h2>
                <button onClick={() => setTab('livraisons')}
                  className="text-orange-600 text-xs font-bold hover:underline flex items-center gap-1">
                  Tout voir <ArrowUpRight size={11} />
                </button>
              </div>
              {livraisons.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Package size={24} className="text-gray-200" />
                  </div>
                  <p className="text-gray-500 text-sm mb-4">Aucune livraison pour l'instant.</p>
                  <button onClick={() => { setTab('planifier'); setShowForm(true) }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600">
                    <Plus size={13} />Cr\u00e9er ma premi\u00e8re livraison
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {livraisons.slice(0, 6).map(l => (
                    <div key={l.id} onClick={() => setDetail(l)}
                      className="p-4 flex items-start gap-3 hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm ${
                        l.statut === 'en_cours' ? 'bg-orange-100' : l.statut === 'livre' ? 'bg-green-100' : 'bg-gray-100'}`}>
                        {STATUT_CFG[l.statut]?.icon || '\ud83d\udce6'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-xs truncate">{l.adresse_depart}</p>
                            <p className="text-gray-400 text-xs truncate">\u2192 {l.adresse_arrivee}</p>
                          </div>
                          <Badge statut={l.statut} />
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                          <span>{fDate(l.created_at)}</span>
                          {l.destinataire_nom && <span>\u00b7 {l.destinataire_nom}</span>}
                          {l.prix && <span className="text-orange-600 font-bold">{fXOF(l.prix)}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 LIVRAISONS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}
        {tab === 'livraisons' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">
                Livraisons <span className="text-gray-300 font-normal text-sm">({livraisons.length})</span>
              </h2>
              <button onClick={() => { setTab('planifier'); setShowForm(true) }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600">
                <Plus size={13} />Nouvelle
              </button>
            </div>

            {/* Recherche + filtres */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input placeholder="Adresse, destinataire, t\u00e9l\u00e9phone\u2026" value={recherche}
                  onChange={e => setRecherche(e.target.value)} className={`${inp} pl-10`} />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {['tous', 'en_attente', 'en_cours', 'livre', 'annule'].map(s => (
                  <button key={s} onClick={() => setFiltreStatut(s)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      filtreStatut === s
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {s === 'tous' ? 'Tous' : STATUT_CFG[s]?.label || s}
                  </button>
                ))}
              </div>
            </div>

            {/* Liste */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              {livraisonsFiltrees.length === 0 ? (
                <div className="p-12 text-center">
                  <Package size={28} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Aucune livraison trouv\u00e9e</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {livraisonsFiltrees.map(l => (
                    <div key={l.id} onClick={() => setDetail(l)}
                      className="p-4 sm:p-5 flex items-start gap-3 hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base ${
                        l.statut === 'en_cours' ? 'bg-orange-50' : l.statut === 'livre' ? 'bg-green-50' : 'bg-gray-50'}`}>
                        {STATUT_CFG[l.statut]?.icon || '\ud83d\udce6'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate">{l.adresse_depart}</p>
                            <p className="text-gray-400 text-xs truncate">\u2192 {l.adresse_arrivee}</p>
                          </div>
                          <Badge statut={l.statut} />
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5 mt-2 text-xs text-gray-400">
                          <span>{fDate(l.created_at)}</span>
                          {l.destinataire_nom && <span>\u00b7 \ud83d\udc64 {l.destinataire_nom}</span>}
                          {l.destinataire_tel && (
                            <a href={`tel:${l.destinataire_tel}`} onClick={e => e.stopPropagation()}
                              className="flex items-center gap-1 text-blue-500 hover:underline">
                              <Phone size={9} />{l.destinataire_tel}
                            </a>
                          )}
                          {l.prix && <span className="text-orange-600 font-bold">{fXOF(l.prix)}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              <FileText size={13} />Exporter CSV
            </button>
          </div>
        )}

        {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 PLANIFIER \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}
        {tab === 'planifier' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">Planifier une livraison</h2>
              <button onClick={() => setShowForm(!showForm)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600">
                <Plus size={13} />Cr\u00e9er
              </button>
            </div>

            {showForm && (
              <div className="bg-white rounded-2xl p-6 border-2 border-orange-200 shadow-sm space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Package size={18} className="text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900">Nouvelle livraison</h3>
                    <p className="text-gray-400 text-xs">Votre livreur d\u00e9di\u00e9 sera notifi\u00e9 imm\u00e9diatement</p>
                  </div>
                </div>

                {/* S\u00e9lection contact rapide */}
                {contacts.length > 0 && (
                  <div>
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Contact rapide</p>
                    <div className="flex flex-wrap gap-2">
                      {contacts.slice(0, 8).map(c => (
                        <button key={c.id} onClick={() => selectContact(c)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            formLivr.destinataire_nom === c.nom
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'}`}>
                          {c.nom.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">\ud83d\udccd Adresse de d\u00e9part *</label>
                    <input type="text" placeholder="Ex: Avenue Kwame Nkrumah, Ouagadougou"
                      value={formLivr.adresse_depart}
                      onChange={e => setFormLivr(p => ({ ...p, adresse_depart: e.target.value }))}
                      className={inp} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">\ud83c\udfc1 Adresse de destination *</label>
                    <input type="text" placeholder="Ex: Secteur 15, rue des Fleurs"
                      value={formLivr.adresse_arrivee}
                      onChange={e => setFormLivr(p => ({ ...p, adresse_arrivee: e.target.value }))}
                      className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">\ud83d\udc64 Nom destinataire *</label>
                    <input type="text" placeholder="Pr\u00e9nom Nom" value={formLivr.destinataire_nom}
                      onChange={e => setFormLivr(p => ({ ...p, destinataire_nom: e.target.value }))}
                      className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">\ud83d\udcde T\u00e9l\u00e9phone *</label>
                    <input type="tel" placeholder="+226 XX XX XX XX" value={formLivr.destinataire_tel}
                      onChange={e => setFormLivr(p => ({ ...p, destinataire_tel: e.target.value }))}
                      className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">\ud83d\udcac WhatsApp</label>
                    <input type="tel" placeholder="+226 XX XX XX XX" value={formLivr.destinataire_whatsapp}
                      onChange={e => setFormLivr(p => ({ ...p, destinataire_whatsapp: e.target.value }))}
                      className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">\ud83d\udcc5 Date programm\u00e9e</label>
                    <input type="date" value={formLivr.date_programmee}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setFormLivr(p => ({ ...p, date_programmee: e.target.value }))}
                      className={inp} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">\ud83d\udcdd Instructions sp\u00e9ciales</label>
                    <textarea placeholder="Fragile, appeler avant livraison, code portail\u2026"
                      value={formLivr.instructions}
                      onChange={e => setFormLivr(p => ({ ...p, instructions: e.target.value }))}
                      className={`${inp} resize-none h-20`} />
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-start gap-2">
                  <span className="text-base shrink-0">\ud83d\udca1</span>
                  <p className="text-orange-700 text-xs leading-relaxed">
                    Inclus dans votre abonnement <strong>{plan?.label}</strong>. Votre livreur d\u00e9di\u00e9 sera notifi\u00e9 et prendra en charge cette livraison sous <strong>{plan?.delai}</strong>.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowForm(false)}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition-colors text-sm">
                    Annuler
                  </button>
                  <button onClick={handleCreateLivraison} disabled={submittingLivr}
                    className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm disabled:opacity-50 transition-all shadow-sm">
                    {submittingLivr ? '\u23f3 Cr\u00e9ation\u2026' : '\ud83d\ude80 Cr\u00e9er la livraison'}
                  </button>
                </div>
              </div>
            )}

            {/* Planning calendrier */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-50">
                <h3 className="font-black text-gray-900 text-sm">Planning \u2014 30 prochains jours</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((j, i) => (
                    <div key={i} className="text-center text-[10px] font-black text-gray-300 py-1">{j}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 30 }, (_, i) => {
                    const d = new Date(); d.setDate(d.getDate() + i)
                    const ds = d.toISOString().split('T')[0]
                    const nb = livraisons.filter(l => l.created_at.startsWith(ds)).length
                    const isToday = i === 0
                    return (
                      <div key={i} title={`${d.toLocaleDateString('fr-FR')} \u2014 ${nb} livraison(s)`}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold relative ${
                          isToday ? 'ring-2 ring-orange-400 ring-offset-1' : ''} ${
                          nb > 0 ? 'bg-orange-500 text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                        {d.getDate()}
                        {nb > 0 && <span className="text-[8px] font-black opacity-80">{nb}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 CONTACTS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}
        {tab === 'contacts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">
                Contacts <span className="text-gray-300 font-normal text-sm">({contacts.length})</span>
              </h2>
              <button onClick={() => { setEditContact(null); setContactForm({ nom: '', telephone: '', whatsapp: '', adresse_habituelle: '' }); setShowContactForm(true) }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600">
                <UserPlus size={13} />Ajouter
              </button>
            </div>
            <p className="text-gray-400 text-sm">Vos clients fr\u00e9quents pour des livraisons en 2 clics.</p>

            {showContactForm && (
              <div className="bg-white rounded-2xl p-6 border-2 border-orange-200 shadow-sm space-y-4">
                <h3 className="font-black text-gray-900">{editContact ? 'Modifier le contact' : 'Nouveau contact'}</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">Nom *</label>
                    <input type="text" placeholder="Pr\u00e9nom Nom" value={contactForm.nom}
                      onChange={e => setContactForm(p => ({ ...p, nom: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">T\u00e9l\u00e9phone *</label>
                    <input type="tel" placeholder="+226 XX XX XX XX" value={contactForm.telephone}
                      onChange={e => setContactForm(p => ({ ...p, telephone: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">WhatsApp</label>
                    <input type="tel" placeholder="+226 XX XX XX XX" value={contactForm.whatsapp}
                      onChange={e => setContactForm(p => ({ ...p, whatsapp: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">Adresse habituelle</label>
                    <input type="text" placeholder="Ex: Secteur 15\u2026" value={contactForm.adresse_habituelle}
                      onChange={e => setContactForm(p => ({ ...p, adresse_habituelle: e.target.value }))} className={inp} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setShowContactForm(false); setEditContact(null) }}
                    className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 font-bold text-gray-700 text-sm">Annuler</button>
                  <button onClick={handleSaveContact} disabled={savingContact}
                    className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm disabled:opacity-50">
                    {savingContact ? '\u2026' : editContact ? '\ud83d\udcbe Modifier' : '\u2705 Ajouter'}
                  </button>
                </div>
              </div>
            )}

            {contacts.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                <BookOpen size={32} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Ajoutez vos clients fr\u00e9quents pour des livraisons rapides.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {contacts.map(c => (
                  <div key={c.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-white font-black">
                      {c.nom.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 text-sm">{c.nom}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        <a href={`tel:${c.telephone}`} className="hover:text-blue-600 flex items-center gap-1">
                          <Phone size={9} />{c.telephone}
                        </a>
                        {c.adresse_habituelle && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin size={9} />{c.adresse_habituelle}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => { setTab('planifier'); setShowForm(true); selectContact(c) }}
                        className="p-2 bg-orange-50 rounded-lg text-orange-600 hover:bg-orange-100 transition-colors" title="Cr\u00e9er livraison">
                        <Package size={12} />
                      </button>
                      <button onClick={() => { setEditContact(c); setContactForm({ nom: c.nom, telephone: c.telephone, whatsapp: c.whatsapp || '', adresse_habituelle: c.adresse_habituelle || '' }); setShowContactForm(true) }}
                        className="p-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors">
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => handleDeleteContact(c.id)}
                        className="p-2 bg-red-50 rounded-lg text-red-500 hover:bg-red-100 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 CARTE \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}
        {tab === 'carte' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">Carte en temps r\u00e9el</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-gray-500 font-medium">Live</span>
              </div>
            </div>

            {/* L\u00e9gende */}
            <div className="bg-white rounded-2xl p-3 border border-gray-100 flex flex-wrap gap-4 text-xs">
              <span className="flex items-center gap-2 font-semibold text-gray-600">
                <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                Disponibles ({coursiers.filter(c => c.statut === 'disponible').length})
              </span>
              <span className="flex items-center gap-2 font-semibold text-gray-600">
                <span className="w-3 h-3 rounded-full bg-orange-400" />
                En livraison ({coursiers.filter(c => c.statut === 'occupe').length})
              </span>
              <span className="flex items-center gap-2 font-semibold text-gray-600">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                Vos livraisons en