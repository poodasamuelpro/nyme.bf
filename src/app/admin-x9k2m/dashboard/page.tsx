'use client' 

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Zap, LogOut, Users, Package, TrendingUp, ShieldCheck,
  Plus, X, AlertCircle, CheckCircle, RefreshCw, Eye,
  Building2, User, Phone, Mail, ChevronRight, Loader2,
  BarChart3, Bell, Settings, Search, Filter, Star
} from 'lucide-react'
import Link from 'next/link'

interface PartenaireAdmin {
  id: string; user_id: string; entreprise: string; nom_contact: string
  telephone: string | null; email_pro: string | null
  plan: 'starter' | 'business' | 'enterprise'
  statut: 'actif' | 'suspendu' | 'en_attente' | 'rejete'
  livraisons_max: number; livraisons_mois: number
  taux_commission: number; date_debut: string; created_at: string
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
}

const ONGLETS = [
  { id:'overview',    label:'Vue générale',  icon:BarChart3 },
  { id:'partenaires', label:'Partenaires',   icon:Building2 },
  { id:'creation',    label:'Créer compte',  icon:Plus },
]

export default function AdminDashboard() {
  const router = useRouter()
  const [adminUser,    setAdminUser]    = useState<any>(null)
  const [partenaires,  setPartenaires]  = useState<PartenaireAdmin[]>([])
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [onglet,       setOnglet]       = useState('overview')
  const [recherche,    setRecherche]    = useState('')
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [error,        setError]        = useState('')
  const [success,      setSuccess]      = useState('')
  const [detail,       setDetail]       = useState<PartenaireAdmin|null>(null)

  // Form création
  const [form, setForm] = useState({
    entreprise:'', nom_contact:'', email:'', telephone:'', plan:'starter', adresse:''
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/admin-x9k2m/login'); return }
      // Vérifier rôle admin
      const { data: u } = await supabase.from('utilisateurs').select('role,nom').eq('id', session.user.id).single()
      if (!u || u.role !== 'admin') { await supabase.auth.signOut(); router.replace('/admin-x9k2m/login'); return }
      setAdminUser({ ...session.user, nom: u.nom })
      loadData()
    })
    const { data: listener } = supabase.auth.onAuthStateChange((e) => {
      if (e === 'SIGNED_OUT') router.replace('/admin-x9k2m/login')
    })
    return () => listener.subscription.unsubscribe()
  }, [router])

  const loadData = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('partenaires').select('*').order('created_at', { ascending: false })
      if (err) throw err
      setPartenaires(data || [])
    } catch (err: any) {
      setError('Erreur de chargement: ' + err.message)
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [])

  // Changer le statut d'un partenaire
  const changerStatut = async (id: string, statut: string) => {
    const { error: err } = await supabase
      .from('partenaires').update({ statut, updated_at: new Date().toISOString() }).eq('id', id)
    if (err) { setError('Erreur: ' + err.message); return }
    setPartenaires(p => p.map(x => x.id===id ? {...x, statut: statut as any} : x))
    if (detail?.id === id) setDetail(d => d ? {...d, statut: statut as any} : null)
    setSuccess(`Statut mis à jour → ${STATUT_CFG[statut as keyof typeof STATUT_CFG]?.label}`)
    setTimeout(() => setSuccess(''), 3000)
  }

  // Créer un partenaire via l'API admin
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true); setError(''); setSuccess('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session expirée')

      const res = await fetch('/api/admin/create-partenaire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur création')

      setSuccess(`✅ ${data.message}`)
      setForm({ entreprise:'', nom_contact:'', email:'', telephone:'', plan:'starter', adresse:'' })
      await loadData()
      setOnglet('partenaires')
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création')
    } finally {
      setCreating(false)
    }
  }

  const stats = {
    total:       partenaires.length,
    actifs:      partenaires.filter(p=>p.statut==='actif').length,
    en_attente:  partenaires.filter(p=>p.statut==='en_attente').length,
    suspendus:   partenaires.filter(p=>p.statut==='suspendu').length,
    livraisons:  partenaires.reduce((s,p)=>s+p.livraisons_mois,0),
  }

  const filtres = partenaires.filter(p => {
    const matchStatut = filtreStatut==='tous' || p.statut===filtreStatut
    const matchRech = recherche==='' ||
      p.entreprise.toLowerCase().includes(recherche.toLowerCase()) ||
      p.nom_contact.toLowerCase().includes(recherche.toLowerCase()) ||
      (p.email_pro||'').toLowerCase().includes(recherche.toLowerCase())
    return matchStatut && matchRech
  })

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace('/admin-x9k2m/login') }

  if (loading) return (
    <div className="min-h-screen bg-nyme-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-[3px] border-nyme-blue/25 border-t-nyme-blue rounded-full animate-spin mx-auto mb-4"/>
        <p className="text-nyme-text-muted text-sm">Chargement administration...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-nyme-bg">
      {/* Navbar admin */}
      <nav className="bg-nyme-blue-dark border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nyme-orange to-nyme-orange-light flex items-center justify-center">
              <Zap size={16} className="text-white" strokeWidth={2.5}/>
            </div>
            <span className="font-heading text-white font-extrabold tracking-wider">NYME</span>
            <span className="text-white/30 text-xs">/ Admin</span>
            <span className="px-2 py-0.5 bg-nyme-orange/20 border border-nyme-orange/30 text-nyme-orange text-[10px] font-bold rounded-full">ADMIN</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setRefreshing(true); loadData() }} disabled={refreshing}
              className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-all">
              <RefreshCw size={15} className={refreshing?'animate-spin':''}/>
            </button>
            <span className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/8 border border-white/12 text-white/70 text-xs">
              <ShieldCheck size={13} className="text-nyme-orange"/> {adminUser?.nom || 'Admin'}
            </span>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/60 hover:text-red-400 hover:bg-red-400/10 transition-all text-xs font-semibold">
              <LogOut size={13}/><span className="hidden sm:block">Déconnexion</span>
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
          {ONGLETS.map(o => (
            <button key={o.id} onClick={()=>setOnglet(o.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${onglet===o.id?'border-nyme-orange text-nyme-orange':'border-transparent text-white/50 hover:text-white/80'}`}>
              <o.icon size={12}/>{o.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {error && (
          <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center gap-3 text-red-500 text-sm">
            <AlertCircle size={15} className="shrink-0"/>{error}
            <button onClick={()=>setError('')} className="ml-auto"><X size={13}/></button>
          </div>
        )}
        {success && (
          <div className="mb-5 p-4 rounded-xl bg-green-500/10 border border-green-500/25 flex items-center gap-3 text-green-500 text-sm">
            <CheckCircle size={15} className="shrink-0"/>{success}
            <button onClick={()=>setSuccess('')} className="ml-auto"><X size={13}/></button>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {onglet==='overview' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-black text-nyme-text">Dashboard Administration</h1>
              <p className="text-nyme-text-muted text-sm mt-1">Gestion de l'espace partenaires NYME</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              {[
                { icon:Building2, label:'Total partenaires', value:stats.total, color:'bg-nyme-blue' },
                { icon:CheckCircle, label:'Actifs', value:stats.actifs, color:'bg-green-600' },
                { icon:Bell, label:'En attente', value:stats.en_attente, color:'bg-amber-500' },
                { icon:X, label:'Suspendus', value:stats.suspendus, color:'bg-red-600' },
                { icon:Package, label:'Livraisons ce mois', value:stats.livraisons, color:'bg-nyme-orange' },
              ].map((s,i) => (
                <div key={i} className="card p-4 flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
                    <s.icon size={18} className="text-white"/>
                  </div>
                  <div>
                    <p className="text-nyme-text-muted text-xs font-semibold uppercase tracking-wider mb-0.5">{s.label}</p>
                    <p className="font-heading text-2xl font-black text-nyme-text">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Partenaires en attente de validation */}
            {partenaires.filter(p=>p.statut==='en_attente').length > 0 && (
              <div className="card overflow-hidden">
                <div className="p-5 border-b border-nyme-border-light flex items-center gap-2">
                  <Bell size={15} className="text-amber-500"/>
                  <h2 className="font-heading font-bold text-nyme-text">En attente de validation ({partenaires.filter(p=>p.statut==='en_attente').length})</h2>
                </div>
                <div className="divide-y divide-nyme-border-light">
                  {partenaires.filter(p=>p.statut==='en_attente').map(p => (
                    <PartenaireRow key={p.id} part={p} onDetail={()=>setDetail(p)} onStatut={changerStatut}/>
                  ))}
                </div>
              </div>
            )}

            {/* Tous les partenaires récents */}
            <div className="card overflow-hidden">
              <div className="p-5 border-b border-nyme-border-light flex items-center justify-between">
                <h2 className="font-heading font-bold text-nyme-text">Partenaires récents</h2>
                <button onClick={()=>setOnglet('partenaires')} className="text-nyme-blue text-xs hover:underline">Voir tout →</button>
              </div>
              <div className="divide-y divide-nyme-border-light">
                {partenaires.slice(0,5).map(p => (
                  <PartenaireRow key={p.id} part={p} onDetail={()=>setDetail(p)} onStatut={changerStatut}/>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PARTENAIRES ── */}
        {onglet==='partenaires' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="font-heading text-xl font-bold text-nyme-text">
                Tous les partenaires <span className="text-nyme-text-muted text-sm font-normal">({partenaires.length})</span>
              </h2>
              <button onClick={()=>setOnglet('creation')} className="btn-primary inline-flex items-center gap-2 text-sm">
                <Plus size={14}/> Créer un partenaire
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nyme-text-muted"/>
                <input type="text" placeholder="Rechercher entreprise, email..." value={recherche}
                  onChange={e=>setRecherche(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-xl input-nyme"/>
              </div>
              <div className="flex gap-2 flex-wrap">
                {['tous','actif','en_attente','suspendu'].map(s => (
                  <button key={s} onClick={()=>setFiltreStatut(s)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${filtreStatut===s?'bg-nyme-blue text-white':'bg-white border border-nyme-border-light text-nyme-text-muted hover:text-nyme-blue'}`}>
                    {s==='tous'?'Tous':STATUT_CFG[s as keyof typeof STATUT_CFG]?.label||s}
                  </button>
                ))}
              </div>
            </div>
            <div className="card overflow-hidden">
              {filtres.length===0 ? (
                <div className="p-10 text-center text-nyme-text-muted">
                  <Building2 size={32} className="mx-auto mb-3 opacity-30"/>Aucun partenaire trouvé
                </div>
              ) : (
                <div className="divide-y divide-nyme-border-light">
                  {filtres.map(p => <PartenaireRow key={p.id} part={p} onDetail={()=>setDetail(p)} onStatut={changerStatut} showActions/>)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CRÉATION ── */}
        {onglet==='creation' && (
          <div className="max-w-2xl">
            <div className="mb-6">
              <h2 className="font-heading text-xl font-bold text-nyme-text">Créer un compte partenaire</h2>
              <p className="text-nyme-text-muted text-sm mt-1">
                Un mot de passe aléatoire sera généré et envoyé par email au partenaire.
              </p>
            </div>
            <div className="card p-6 sm:p-8">
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-nyme-text-muted text-xs uppercase tracking-wider font-medium mb-1.5">Entreprise *</label>
                    <input type="text" required value={form.entreprise} onChange={e=>setForm({...form,entreprise:e.target.value})}
                      placeholder="Ma Boutique SARL" className="input-nyme"/>
                  </div>
                  <div>
                    <label className="block text-nyme-text-muted text-xs uppercase tracking-wider font-medium mb-1.5">Nom du contact *</label>
                    <input type="text" required value={form.nom_contact} onChange={e=>setForm({...form,nom_contact:e.target.value})}
                      placeholder="Jean Dupont" className="input-nyme"/>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-nyme-text-muted text-xs uppercase tracking-wider font-medium mb-1.5">Email *</label>
                    <input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
                      placeholder="contact@entreprise.com" className="input-nyme"/>
                  </div>
                  <div>
                    <label className="block text-nyme-text-muted text-xs uppercase tracking-wider font-medium mb-1.5">Téléphone</label>
                    <input type="tel" value={form.telephone} onChange={e=>setForm({...form,telephone:e.target.value})}
                      placeholder="+226 70 00 00 00" className="input-nyme"/>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-nyme-text-muted text-xs uppercase tracking-wider font-medium mb-1.5">Plan *</label>
                    <select value={form.plan} onChange={e=>setForm({...form,plan:e.target.value})} className="input-nyme">
                      <option value="starter">Starter — 30 livraisons/mois</option>
                      <option value="business">Business — 100 livraisons/mois</option>
                      <option value="enterprise">Enterprise — Illimité</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-nyme-text-muted text-xs uppercase tracking-wider font-medium mb-1.5">Adresse</label>
                    <input type="text" value={form.adresse} onChange={e=>setForm({...form,adresse:e.target.value})}
                      placeholder="Ouagadougou, BF" className="input-nyme"/>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-nyme-blue/5 border border-nyme-blue/15">
                  <p className="text-nyme-blue text-sm font-medium flex items-center gap-2">
                    <ShieldCheck size={14}/>Ce qui se passe automatiquement :
                  </p>
                  <ul className="text-nyme-text-muted text-xs mt-2 space-y-1 ml-5 list-disc">
                    <li>Compte Supabase Auth créé avec email confirmé</li>
                    <li>Rôle <strong>partenaire</strong> inscrit dans la table <code>utilisateurs</code></li>
                    <li>Profil créé dans la table <code>partenaires</code> avec statut <strong>actif</strong></li>
                    <li>Mot de passe aléatoire généré (14 caractères)</li>
                    <li>Email d'invitation envoyé au partenaire ET copie à nyme.contact@gmail.com</li>
                  </ul>
                </div>

                <button type="submit" disabled={creating}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 disabled:opacity-60">
                  {creating ? <><Loader2 size={16} className="animate-spin"/>Création en cours...</> : <><Plus size={15}/>Créer le compte partenaire</>}
                </button>
              </form>
            </div>
          </div>
        )}

        <p className="text-center text-nyme-text-muted text-xs mt-8">© {new Date().getFullYear()} NYME · Administration · Ouagadougou, Burkina Faso</p>
      </div>

      {/* Modal détail partenaire */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          onClick={()=>setDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto border border-nyme-border-light shadow-nyme-lg"
            onClick={e=>e.stopPropagation()}>
            <div className="p-5 border-b border-nyme-border-light flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="font-heading font-bold text-nyme-text">{detail.entreprise}</h3>
                <p className="text-nyme-text-muted text-xs">{detail.nom_contact}</p>
              </div>
              <button onClick={()=>setDetail(null)} className="p-1.5 rounded-lg hover:bg-nyme-bg"><X size={15} className="text-nyme-text-muted"/></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${STATUT_CFG[detail.statut]?.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUT_CFG[detail.statut]?.dot}`}/>
                  {STATUT_CFG[detail.statut]?.label}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${PLAN_CFG[detail.plan]?.color}`}>
                  {PLAN_CFG[detail.plan]?.label}
                </span>
              </div>
              {[
                ['📧 Email', detail.email_pro||'—'],
                ['📞 Téléphone', detail.telephone||'—'],
                ['📦 Livraisons ce mois', `${detail.livraisons_mois} / ${detail.livraisons_max}`],
                ['💰 Commission', `${detail.taux_commission}%`],
                ['📅 Depuis le', new Date(detail.date_debut).toLocaleDateString('fr-FR')],
                ['🆔 ID', detail.id.substring(0,16)+'...'],
              ].map(([l,v],i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-nyme-border-light last:border-0">
                  <span className="text-nyme-text-muted text-sm">{l}</span>
                  <span className="text-nyme-text text-sm font-medium">{v}</span>
                </div>
              ))}
              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                {detail.statut !== 'actif' && (
                  <button onClick={()=>changerStatut(detail.id,'actif')}
                    className="py-2.5 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition-colors">
                    ✅ Activer
                  </button>
                )}
                {detail.statut !== 'suspendu' && (
                  <button onClick={()=>changerStatut(detail.id,'suspendu')}
                    className="py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors">
                    🚫 Suspendre
                  </button>
                )}
                {detail.statut !== 'en_attente' && (
                  <button onClick={()=>changerStatut(detail.id,'en_attente')}
                    className="py-2.5 rounded-xl bg-amber-400 text-white text-xs font-bold hover:bg-amber-500 transition-colors">
                    ⏳ Mettre en attente
                  </button>
                )}
                {detail.statut !== 'rejete' && (
                  <button onClick={()=>changerStatut(detail.id,'rejete')}
                    className="py-2.5 rounded-xl bg-gray-400 text-white text-xs font-bold hover:bg-gray-500 transition-colors">
                    ❌ Rejeter
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Ligne partenaire ──────────────────────────────────────────────
function PartenaireRow({ part, onDetail, onStatut, showActions=false }: {
  part: PartenaireAdmin; onDetail: ()=>void; onStatut: (id:string,s:string)=>void; showActions?: boolean
}) {
  const s = STATUT_CFG[part.statut] || STATUT_CFG.en_attente
  return (
    <div className="p-4 sm:p-5 flex items-start gap-3 hover:bg-nyme-bg transition-colors">
      <div className="w-10 h-10 rounded-xl bg-nyme-blue/10 flex items-center justify-center shrink-0">
        <Building2 size={16} className="text-nyme-blue"/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-nyme-text font-semibold text-sm truncate">{part.entreprise}</p>
            <p className="text-nyme-text-muted text-xs">{part.nom_contact} · {part.email_pro||'—'}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.color}`}>
              <span className={`w-1 h-1 rounded-full ${s.dot}`}/>{s.label}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${PLAN_CFG[part.plan]?.color}`}>
              {PLAN_CFG[part.plan]?.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-nyme-text-muted text-xs">{part.livraisons_mois}/{part.livraisons_max} livraisons</span>
          {showActions && part.statut==='en_attente' && (
            <button onClick={()=>onStatut(part.id,'actif')} className="text-xs text-green-600 font-semibold hover:underline">Activer</button>
          )}
          <button onClick={onDetail} className="ml-auto text-nyme-blue text-xs hover:underline flex items-center gap-1">
            <Eye size={11}/>Détails
          </button>
        </div>
      </div>
    </div>
  )
}