// src/app/partenaires/dashboard/page.tsx — Dashboard partenaire corrigé
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import type { PartenaireRow, LivraisonPartenaire, Utilisateur, Wallet, TransactionWallet } from '@/lib/supabase'
import {
  Package, TrendingUp, Clock, CheckCircle, Zap, LogOut,
  User, RefreshCw, MapPin, AlertCircle,
  Calendar, Phone, Wallet as WalletIcon, BarChart3, ShieldCheck, Plus,
  FileText, X, Search, Star, CreditCard, Settings,
  Map, UserPlus, BookOpen, Edit2, Trash2,
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const MapAdvanced = dynamic(() => import('@/components/MapAdvanced'), { ssr: false })

// ── Types Locaux ───────────────────────────────────────────────────

interface Contact {
  id: string
  nom: string
  telephone: string
  whatsapp?: string | null
  email?: string | null // Utilisé pour stocker l'adresse habituelle dans la table contacts_favoris
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

// ── Config plans & statuts ─────────────────────────────────────────

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
  { id: 'wallet',     label: 'Wallet',     icon: WalletIcon },
  { id: 'compte',     label: 'Compte',     icon: Settings },
]

const fXOF = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' XOF'
const fDate = (d: string) => new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d))

function Badge({ statut }: { statut: string }) {
  const s = STATUT_CFG[statut] || STATUT_CFG.en_attente
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${s.bg} ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

export default function PartenaireDashboard() {
  const router = useRouter()

  const [userId,      setUserId]      = useState<string | null>(null)
  const [partenaire,  setPartenaire]  = useState<PartenaireRow | null>(null)
  const [livraisons,  setLivraisons]  = useState<LivraisonPartenaire[]>([])
  const [contacts,    setContacts]    = useState<Contact[]>([])
  const [coursiers,   setCoursiers]   = useState<CoursierActif[]>([])
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [tab,         setTab]         = useState('dashboard')
  const [recherche,   setRecherche]   = useState('')
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [detail,      setDetail]      = useState<LivraisonPartenaire | null>(null)
  const [alertes,     setAlertes]     = useState<string[]>([])
  const [soldeWallet, setSoldeWallet] = useState(0)
  const [txWallet,    setTxWallet]    = useState<TransactionWallet[]>([])
  const [coursierFavori, setCoursierFavori] = useState<CoursierActif | null>(null)
  const [editingProfil, setEditingProfil] = useState(false)
  const [profilForm, setProfilForm] = useState({ entreprise: '', nom_contact: '', telephone: '', email_pro: '', adresse: '' })
  const [savingProfil, setSavingProfil] = useState(false)

  const [showForm,    setShowForm]    = useState(false)
  const [formLivr,    setFormLivr]    = useState({
    adresse_depart: '', lat_depart: 0, lng_depart: 0,
    adresse_arrivee: '', lat_arrivee: 0, lng_arrivee: 0,
    destinataire_nom: '', destinataire_tel: '',
    instructions: '',
  })
  const [submittingLivr, setSubmittingLivr] = useState(false)

  const [showContactForm, setShowContactForm] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [contactForm, setContactForm] = useState({ nom: '', telephone: '', whatsapp: '', adresse_habituelle: '' })
  const [savingContact, setSavingContact] = useState(false)

  const loadData = useCallback(async (uid: string) => {
    try {
      const { data: part, error: partErr } = await supabase
        .from('partenaires').select('*').eq('user_id', uid).single()

      if (partErr || !part) {
        toast.error('Profil partenaire introuvable')
        router.replace('/partenaires/login')
        return
      }
      setPartenaire(part as PartenaireRow)
      setProfilForm({
        entreprise: part.entreprise || '',
        nom_contact: part.nom_contact || '',
        telephone: part.telephone || '',
        email_pro: part.email_pro || '',
        adresse: part.adresse || '',
      })

      const { data: livs } = await supabase
        .from('livraisons_partenaire')
        .select(`*`)
        .eq('partenaire_id', part.id)
        .order('created_at', { ascending: false })
      
      const livsData = (livs || []) as LivraisonPartenaire[]
      setLivraisons(livsData)

      const { data: ctData } = await supabase
        .from('contacts_favoris')
        .select('*')
        .eq('user_id', uid)
        .order('nom')
      setContacts((ctData || []) as Contact[])

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
        .select('*').eq('user_id', uid)
        .order('created_at', { ascending: false }).limit(30)
      setTxWallet((txs || []) as TransactionWallet[])

      const a: string[] = []
      if (part.livraisons_mois >= part.livraisons_max) a.push(`Quota atteint : ${part.livraisons_mois}/${part.livraisons_max}`)
      if (part.statut === 'en_attente') a.push('Compte en attente de validation')
      if (part.statut === 'suspendu') a.push('⚠️ Compte suspendu — contactez NYME')
      setAlertes(a)

    } catch (err) {
      console.error('[PartenaireDashboard]', err)
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
        toast.error('Accès réservé aux partenaires')
        await supabase.auth.signOut()
        router.replace('/partenaires/login')
        return
      }

      setUserId(session.user.id)
      await loadData(session.user.id)
    }
    init()
  }, [loadData, router])

  const handleCreateLivraison = async () => {
    if (!partenaire || !userId) return
    if (!formLivr.adresse_depart || !formLivr.adresse_arrivee || !formLivr.destinataire_nom || !formLivr.destinataire_tel) {
      toast.error('Remplissez les champs obligatoires')
      return
    }
    setSubmittingLivr(true)
    try {
      const { error } = await supabase.from('livraisons_partenaire').insert({
        partenaire_id: partenaire.id,
        adresse_depart: formLivr.adresse_depart,
        adresse_arrivee: formLivr.adresse_arrivee,
        destinataire_nom: formLivr.destinataire_nom,
        destinataire_tel: formLivr.destinataire_tel,
        instructions: formLivr.instructions || null,
        statut: 'en_attente',
      })
      if (error) throw error
      toast.success('Livraison créée !')
      setShowForm(false)
      setFormLivr({ adresse_depart: '', lat_depart: 0, lng_depart: 0, adresse_arrivee: '', lat_arrivee: 0, lng_arrivee: 0, destinataire_nom: '', destinataire_tel: '', instructions: '' })
      loadData(userId)
    } catch (err: any) {
      toast.error('Erreur lors de la création')
    } finally { setSubmittingLivr(false) }
  }

  const handleSaveContact = async () => {
    if (!userId) return
    if (!contactForm.nom || !contactForm.telephone) { toast.error('Nom et téléphone requis'); return }
    setSavingContact(true)
    try {
      if (editContact) {
        const { error } = await supabase.from('contacts_favoris').update({
          nom: contactForm.nom,
          telephone: contactForm.telephone,
          whatsapp: contactForm.whatsapp || null,
          email: contactForm.adresse_habituelle || null,
        }).eq('id', editContact.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('contacts_favoris').insert({
          user_id: userId,
          nom: contactForm.nom,
          telephone: contactForm.telephone,
          whatsapp: contactForm.whatsapp || null,
          email: contactForm.adresse_habituelle || null,
        })
        if (error) throw error
      }
      setShowContactForm(false)
      setEditContact(null)
      loadData(userId)
    } catch (err: any) {
      toast.error('Erreur contact')
    } finally { setSavingContact(false) }
  }

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
      setEditingProfil(false)
      toast.success('Profil mis à jour !')
    } catch { toast.error('Erreur profil') }
    finally { setSavingProfil(false) }
  }

  const stats = {
    total:       livraisons.length,
    livrees:     livraisons.filter(l => l.statut === 'livre').length,
    enCours:     livraisons.filter(l => l.statut === 'en_cours').length,
    depenses:    livraisons.filter(l => l.statut === 'livre').reduce((s, l) => s + (l.prix || 0), 0),
  }

  const progression = partenaire ? Math.min(100, Math.round(partenaire.livraisons_mois / partenaire.livraisons_max * 100)) : 0

  const livraisonsFiltrees = livraisons.filter(l => {
    const matchStatut = filtreStatut === 'tous' || l.statut === filtreStatut
    const q = recherche.toLowerCase()
    return matchStatut && (l.adresse_depart.toLowerCase().includes(q) || (l.destinataire_nom || '').toLowerCase().includes(q))
  })

  const inp = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-colors bg-white'

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold">Chargement...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER NAV */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white"><Zap size={16} /></div>
            <span className="font-extrabold text-gray-900 tracking-wider">NYME PARTENAIRES</span>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => { if (userId) { setRefreshing(true); loadData(userId) } }} className="p-2 text-gray-400"><RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /></button>
             <button onClick={async () => { await supabase.auth.signOut(); router.push('/partenaires/login') }} className="p-2 text-red-500"><LogOut size={16} /></button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto border-t">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${tab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
              <t.icon size={13} />{t.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* DASHBOARD TAB */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex justify-between items-end">
               <div>
                  <h1 className="text-2xl font-black">Bonjour, {partenaire?.nom_contact} 👋</h1>
                  <p className="text-gray-500 text-sm">{partenaire?.entreprise}</p>
               </div>
               <button onClick={() => setTab('planifier')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm">+ Nouvelle livraison</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Quota mensuel</p>
                <p className="text-xl font-black">{partenaire?.livraisons_mois} / {partenaire?.livraisons_max}</p>
                <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                   <div className="h-full bg-blue-600" style={{ width: `${progression}%` }} />
                </div>
              </div>
              {[
                { label: 'Livrées', val: stats.livrees, icon: CheckCircle, color: 'text-green-600' },
                { label: 'En cours', val: stats.enCours, icon: Clock, color: 'text-purple-600' },
                { label: 'Dépenses', val: fXOF(stats.depenses), icon: TrendingUp, color: 'text-orange-600' },
              ].map((s, i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                  <div><p className="text-xs text-gray-400 font-bold uppercase">{s.label}</p><p className="text-xl font-black">{s.val}</p></div>
                  <s.icon className={s.color} />
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
               <div className="p-4 border-b font-bold">Dernières livraisons</div>
               <div className="divide-y">
                  {livraisons.slice(0, 5).map(l => (
                    <div key={l.id} className="p-4 flex justify-between items-center hover:bg-gray-50 cursor-pointer" onClick={() => setDetail(l)}>
                       <div>
                          <p className="font-bold text-sm">{l.adresse_depart.slice(0, 40)}...</p>
                          <p className="text-xs text-gray-400">Pour: {l.destinataire_nom}</p>
                       </div>
                       <Badge statut={l.statut} />
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* LIVRAISONS TAB */}
        {tab === 'livraisons' && (
          <div className="space-y-4">
             <div className="flex gap-2">
                <input placeholder="Rechercher..." className={inp} value={recherche} onChange={e => setRecherche(e.target.value)} />
                <select className={inp} value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}>
                   <option value="tous">Tous les statuts</option>
                   <option value="en_attente">En attente</option>
                   <option value="en_cours">En cours</option>
                   <option value="livre">Livré</option>
                </select>
             </div>
             <div className="bg-white rounded-2xl border overflow-hidden">
                <table className="w-full text-left text-sm">
                   <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-4">Date</th>
                        <th className="p-4">Destination</th>
                        <th className="p-4">Client</th>
                        <th className="p-4">Statut</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y">
                      {livraisonsFiltrees.map(l => (
                        <tr key={l.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setDetail(l)}>
                           <td className="p-4 text-xs">{fDate(l.created_at)}</td>
                           <td className="p-4 font-bold">{l.adresse_arrivee}</td>
                           <td className="p-4">{l.destinataire_nom}</td>
                           <td className="p-4"><Badge statut={l.statut} /></td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* PLANIFIER TAB */}
        {tab === 'planifier' && (
           <div className="bg-white p-6 rounded-2xl border max-w-2xl mx-auto space-y-4">
              <h2 className="text-xl font-black text-center">Planifier une nouvelle course</h2>
              <div className="space-y-3">
                 <input placeholder="Adresse de départ" className={inp} value={formLivr.adresse_depart} onChange={e => setFormLivr({...formLivr, adresse_depart: e.target.value})} />
                 <input placeholder="Adresse d'arrivée" className={inp} value={formLivr.adresse_arrivee} onChange={e => setFormLivr({...formLivr, adresse_arrivee: e.target.value})} />
                 <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Nom destinataire" className={inp} value={formLivr.destinataire_nom} onChange={e => setFormLivr({...formLivr, destinataire_nom: e.target.value})} />
                    <input placeholder="Téléphone destinataire" className={inp} value={formLivr.destinataire_tel} onChange={e => setFormLivr({...formLivr, destinataire_tel: e.target.value})} />
                 </div>
                 <textarea placeholder="Instructions (étage, code, fragilité...)" className={inp} value={formLivr.instructions} onChange={e => setFormLivr({...formLivr, instructions: e.target.value})} />
                 <button onClick={handleCreateLivraison} disabled={submittingLivr} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200">
                    {submittingLivr ? 'Envoi...' : 'Confirmer la demande de livraison'}
                 </button>
              </div>
           </div>
        )}

        {/* WALLET TAB */}
        {tab === 'wallet' && (
          <div className="space-y-6">
             <div className="bg-gradient-to-br from-blue-700 to-blue-900 p-8 rounded-3xl text-white">
                <p className="text-blue-200 font-bold uppercase text-xs tracking-widest mb-1">Solde actuel</p>
                <p className="text-4xl font-black">{soldeWallet.toLocaleString()} XOF</p>
             </div>
             <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
                <div className="p-4 border-b font-bold">Historique des transactions</div>
                <div className="divide-y">
                   {txWallet.map((tx, i) => (
                      <div key={i} className="p-4 flex justify-between items-center">
                         <div>
                            <p className="font-bold text-sm">{tx.note || tx.type}</p>
                            <p className="text-xs text-gray-400">{fDate(tx.created_at)}</p>
                         </div>
                         <p className={`font-black ${tx.montant > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {tx.montant > 0 ? '+' : ''}{tx.montant.toLocaleString()}
                         </p>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {/* COMPTE TAB */}
        {tab === 'compte' && (
           <div className="max-w-2xl mx-auto space-y-4">
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                 <h3 className="font-black text-lg">Paramètres du profil</h3>
                 <div className="space-y-3">
                    <div>
                       <label className="text-xs font-bold text-gray-400 ml-1">Entreprise</label>
                       <input className={inp} value={profilForm.entreprise} onChange={e => setProfilForm({...profilForm, entreprise: e.target.value})} />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-gray-400 ml-1">Contact Principal</label>
                       <input className={inp} value={profilForm.nom_contact} onChange={e => setProfilForm({...profilForm, nom_contact: e.target.value})} />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-gray-400 ml-1">Email professionnel</label>
                       <input className={inp} value={profilForm.email_pro} onChange={e => setProfilForm({...profilForm, email_pro: e.target.value})} />
                    </div>
                    <button onClick={handleSaveProfil} disabled={savingProfil} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold">
                       {savingProfil ? 'Enregistrement...' : 'Mettre à jour mon profil'}
                    </button>
                 </div>
              </div>
           </div>
        )}

      </div>

      {/* MODAL DÉTAIL LIVRAISON */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center">
               <h3 className="font-black">Détails de la course</h3>
               <button onClick={() => setDetail(null)} className="p-2 bg-gray-100 rounded-full"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
               <div className="flex justify-between items-center">
                  <Badge statut={detail.statut} />
                  <p className="text-xl font-black text-blue-600">{detail.prix ? fXOF(detail.prix) : 'Calcul en cours'}</p>
               </div>
               <div className="space-y-3 bg-gray-50 p-4 rounded-2xl">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase">Départ</p>
                    <p className="text-sm font-bold">{detail.adresse_depart}</p>
                  </div>
                  <div className="border-l-2 border-dashed border-gray-200 h-4 ml-1" />
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase">Arrivée</p>
                    <p className="text-sm font-bold">{detail.adresse_arrivee}</p>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl text-center">
                     <p className="text-[10px] font-bold text-gray-400 uppercase">Destinataire</p>
                     <p className="font-bold text-sm">{detail.destinataire_nom}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl text-center">
                     <p className="text-[10px] font-bold text-gray-400 uppercase">Téléphone</p>
                     <p className="font-bold text-sm">{detail.destinataire_tel}</p>
                  </div>
               </div>
               {detail.instructions && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl italic text-sm text-amber-800">
                     "{detail.instructions}"
                  </div>
               )}
               <button onClick={() => setDetail(null)} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
