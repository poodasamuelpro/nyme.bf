'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Zap, LogOut, Users, Package, TrendingUp, ShieldCheck,
  Plus, X, AlertCircle, CheckCircle, RefreshCw, Eye,
  Building2, User, Phone, Mail, ChevronRight, Loader2,
  BarChart3, Bell, Settings, Search, Filter, Star, Wallet, FileCheck
} from 'lucide-react'
import Link from 'next/link'

// Types
interface PartenaireAdmin {
  id: string; user_id: string; entreprise: string; nom_contact: string
  telephone: string | null; email_pro: string | null
  plan: 'starter' | 'business' | 'enterprise'
  statut: 'actif' | 'suspendu' | 'en_attente' | 'rejete'
  livraisons_max: number; livraisons_mois: number
  taux_commission: number; date_debut: string; created_at: string
}

interface CoursierAdmin {
  id: string; nom: string; email: string; telephone: string;
  statut_verification: 'en_attente' | 'verifie' | 'rejete';
  statut: 'hors_ligne' | 'disponible' | 'occupe';
  cni_recto_url: string; cni_verso_url: string; permis_url: string;
  total_gains: number; created_at: string;
}

interface LivraisonAdmin {
  id: string; client_nom: string; coursier_nom: string;
  statut: string; type: string; depart_adresse: string;
  arrivee_adresse: string; prix_final: number; created_at: string;
}

const PLAN_CFG = {
  starter:    { label:'Starter',    color:'text-green-600 bg-green-50 border-green-200' },
  business:   { label:'Business',   color:'text-orange-600 bg-orange-50 border-orange-200' },
  enterprise: { label:'Enterprise', color:'text-purple-600 bg-purple-50 border-purple-200' },
}

const STATUT_CFG = {
  actif:       { label:'Actif',       color:'text-green-600 bg-green-50 border-green-200',   dot:'bg-green-500' },
  en_attente:  { label:'En attente',  color:'text-amber-600 bg-amber-50 border-amber-200',   dot:'bg-amber-400' },
  suspendu:    { label:'Suspendu',    color:'text-red-600 bg-red-50 border-red-200',         dot:'bg-red-500' },
  rejete:      { label:'Rejeté',      color:'text-gray-600 bg-gray-50 border-gray-200',      dot:'bg-gray-400' },
  verifie:     { label:'Vérifié',     color:'text-green-600 bg-green-50 border-green-200',   dot:'bg-green-500' },
}

const ONGLETS = [
  { id:'overview',    label:'Vue générale',  icon:BarChart3 },
  { id:'partenaires', label:'Partenaires',   icon:Building2 },
  { id:'coursiers',   label:'Coursiers',     icon:Users },
  { id:'livraisons',  label:'Courses',       icon:Package },
  { id:'wallet',      label:'Wallet/Finances',icon:Wallet },
  { id:'creation',    label:'Actions Admin', icon:Plus },
]

export default function AdminDashboard() {
  const router = useRouter()
  const [adminUser,    setAdminUser]    = useState<any>(null)
  const [partenaires,  setPartenaires]  = useState<PartenaireAdmin[]>([])
  const [coursiers,    setCoursiers]    = useState<CoursierAdmin[]>([])
  const [livraisons,   setLivraisons]   = useState<LivraisonAdmin[]>([])
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [onglet,       setOnglet]       = useState('overview')
  const [recherche,    setRecherche]    = useState('')
  const [error,        setError]        = useState('')
  const [success,      setSuccess]      = useState('')
  
  // Forms
  const [formPartenaire, setFormPartenaire] = useState({ entreprise:'', nom_contact:'', email:'', telephone:'', plan:'starter', adresse:'' })
  const [formAdmin, setFormAdmin] = useState({ email:'', nom:'' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/admin-x9k2m/login'); return }
      const { data: u } = await supabase.from('utilisateurs').select('role,nom').eq('id', session.user.id).single()
      if (!u || u.role !== 'admin') { await supabase.auth.signOut(); router.replace('/admin-x9k2m/login'); return }
      setAdminUser({ ...session.user, nom: u.nom })
      loadData()
    })
  }, [router])

  const loadData = useCallback(async () => {
    setRefreshing(true)
    try {
      const [parts, cours, livs] = await Promise.all([
        supabase.from('partenaires').select('*').order('created_at', { ascending: false }),
        supabase.from('coursiers').select('*, utilisateurs(nom, email, telephone)').order('created_at', { ascending: false }),
        supabase.from('livraisons').select('*, client:utilisateurs!livraisons_client_id_fkey(nom), coursier:utilisateurs!livraisons_coursier_id_fkey(nom)').order('created_at', { ascending: false }).limit(50)
      ])
      
      setPartenaires(parts.data || [])
      setCoursiers((cours.data || []).map(c => ({
        ...c,
        nom: c.utilisateurs?.nom,
        email: c.utilisateurs?.email,
        telephone: c.utilisateurs?.telephone
      })))
      setLivraisons((livs.data || []).map(l => ({
        ...l,
        client_nom: l.client?.nom,
        coursier_nom: l.coursier?.nom
      })))
    } catch (err: any) {
      setError('Erreur de chargement: ' + err.message)
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [])

  const handleCreatePartenaire = async (e: React.FormEvent) => {
    e.preventDefault(); setCreating(true); setError(''); setSuccess('')
    try {
      const res = await fetch('/api/admin/create-partenaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
        body: JSON.stringify(formPartenaire),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur création')
      setSuccess(`✅ Partenaire créé et email envoyé !`); loadData()
    } catch (err: any) { setError(err.message) } finally { setCreating(false) }
  }

  const handlePromoteAdmin = async (e: React.FormEvent) => {
    e.preventDefault(); setCreating(true); setError(''); setSuccess('')
    try {
      const { data, error: err } = await supabase.rpc('promote_to_admin', { p_email: formAdmin.email, p_nom: formAdmin.nom })
      if (err) throw err
      setSuccess(data); setFormAdmin({ email: '', nom: '' })
    } catch (err: any) { setError(err.message) } finally { setCreating(false) }
  }

  const validerCoursier = async (id: string, statut: string) => {
    const { error: err } = await supabase.from('coursiers').update({ statut_verification: statut }).eq('id', id)
    if (err) setError(err.message); else { setSuccess('Statut coursier mis à jour'); loadData() }
  }

  if (loading) return <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center"><Loader2 className="animate-spin text-[#0A2E8A]" /></div>

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      {/* Navbar */}
      <nav className="bg-[#0A2E8A] text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="text-[#E87722]" />
            <span className="font-bold text-xl tracking-tight">NYME ADMIN</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={loadData} className="p-2 hover:bg-white/10 rounded-full transition-colors"><RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} /></button>
            <div className="h-8 w-px bg-white/20 mx-2" />
            <span className="text-sm font-medium">{adminUser?.nom}</span>
            <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 text-sm text-red-300 hover:text-red-100"><LogOut size={16} /> Quitter</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-6 overflow-x-auto no-scrollbar">
          {ONGLETS.map(o => (
            <button key={o.id} onClick={() => setOnglet(o.id)} className={`py-3 px-1 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${onglet === o.id ? 'border-[#E87722] text-[#E87722]' : 'border-transparent text-white/60 hover:text-white'}`}>
              <span className="flex items-center gap-2"><o.icon size={16} /> {o.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex justify-between items-center">{error} <X className="cursor-pointer" onClick={() => setError('')} /></div>}
        {success && <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-600 rounded-xl flex justify-between items-center">{success} <X className="cursor-pointer" onClick={() => setSuccess('')} /></div>}

        {onglet === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Building2 /></div>
                <div><p className="text-slate-500 text-xs font-bold uppercase">Partenaires</p><p className="text-2xl font-black">{partenaires.length}</p></div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><Users /></div>
                <div><p className="text-slate-500 text-xs font-bold uppercase">Coursiers</p><p className="text-2xl font-black">{coursiers.length}</p></div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 text-green-600 rounded-xl"><Package /></div>
                <div><p className="text-slate-500 text-xs font-bold uppercase">Courses</p><p className="text-2xl font-black">{livraisons.length}</p></div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><TrendingUp /></div>
                <div><p className="text-slate-500 text-xs font-bold uppercase">CA Estimé</p><p className="text-2xl font-black">{livraisons.reduce((acc, l) => acc + (l.prix_final || 0), 0).toLocaleString()} F</p></div>
              </div>
            </div>
          </div>
        )}

        {onglet === 'coursiers' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Coursier</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Documents</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Vérification</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coursiers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{c.nom}</p>
                      <p className="text-xs text-slate-500">{c.email} | {c.telephone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {c.cni_recto_url && <a href={c.cni_recto_url} target="_blank" className="p-1.5 bg-slate-100 rounded-lg text-slate-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"><Eye size={14} /></a>}
                        {c.permis_url && <a href={c.permis_url} target="_blank" className="p-1.5 bg-slate-100 rounded-lg text-slate-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"><FileCheck size={14} /></a>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${c.statut_verification === 'verifie' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{c.statut_verification}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => validerCoursier(c.id, 'verifie')} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all"><CheckCircle size={16} /></button>
                        <button onClick={() => validerCoursier(c.id, 'rejete')} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"><X size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {onglet === 'creation' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2 text-[#0A2E8A]"><Building2 size={20} /> Nouveau Partenaire</h2>
              <form onSubmit={handleCreatePartenaire} className="space-y-4">
                <input type="text" placeholder="Entreprise" required className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#E87722]" value={formPartenaire.entreprise} onChange={e => setFormPartenaire({...formPartenaire, entreprise: e.target.value})} />
                <input type="text" placeholder="Nom contact" required className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#E87722]" value={formPartenaire.nom_contact} onChange={e => setFormPartenaire({...formPartenaire, nom_contact: e.target.value})} />
                <input type="email" placeholder="Email" required className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#E87722]" value={formPartenaire.email} onChange={e => setFormPartenaire({...formPartenaire, email: e.target.value})} />
                <select className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200" value={formPartenaire.plan} onChange={e => setFormPartenaire({...formPartenaire, plan: e.target.value})}>
                  <option value="starter">Starter</option>
                  <option value="business">Business</option>
                  <option value="enterprise">Enterprise</option>
                </select>
                <button type="submit" disabled={creating} className="w-full py-4 bg-[#0A2E8A] text-white font-bold rounded-xl shadow-lg hover:bg-[#0d38a5] transition-all disabled:opacity-50">{creating ? 'Création...' : 'Créer et envoyer email'}</button>
              </form>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2 text-[#0A2E8A]"><ShieldCheck size={20} /> Nouvel Administrateur</h2>
              <form onSubmit={handlePromoteAdmin} className="space-y-4">
                <p className="text-xs text-slate-500 mb-4">L'utilisateur doit déjà avoir un compte Supabase Auth.</p>
                <input type="email" placeholder="Email de l'admin" required className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#E87722]" value={formAdmin.email} onChange={e => setFormAdmin({...formAdmin, email: e.target.value})} />
                <input type="text" placeholder="Nom complet" required className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#E87722]" value={formAdmin.nom} onChange={e => setFormAdmin({...formAdmin, nom: e.target.value})} />
                <button type="submit" disabled={creating} className="w-full py-4 bg-[#E87722] text-white font-bold rounded-xl shadow-lg hover:bg-[#f59343] transition-all disabled:opacity-50">{creating ? 'Promotion...' : 'Promouvoir Admin'}</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
