// src/app/client/profil/page.tsx — NOUVEAU FICHIER
// Page profil client dédiée (modifier nom, téléphone, whatsapp, avatar)
// Route : /client/profil
'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Utilisateur } from '@/lib/supabase'
import {
  ArrowLeft, Camera, Save, Eye, EyeOff, Shield, User,
  Phone, Mail, MessageSquare, Star, Package, Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function ClientProfilPage() {
  const router   = useRouter()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [user,          setUser]          = useState<Utilisateur | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [tab,           setTab]           = useState<'infos' | 'securite' | 'stats'>('infos')

  const [form, setForm] = useState({ nom: '', telephone: '', whatsapp: '' })
  const [saving, setSaving]   = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [pwForm, setPwForm] = useState({ actuel: '', nouveau: '', confirmer: '' })
  const [showPw, setShowPw] = useState(false)
  const [savingPw, setSavingPw] = useState(false)

  const [stats, setStats] = useState({ total: 0, livrees: 0, annulees: 0, note_moyenne: 0 })

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const { data: u } = await supabase.from('utilisateurs').select('*').eq('id', session.user.id).single()
      if (!u || u.role !== 'client') { router.replace('/login'); return }
      setUser(u as Utilisateur)
      setForm({ nom: u.nom || '', telephone: u.telephone || '', whatsapp: u.whatsapp || '' })

      // Stats livraisons
      const { data: livs } = await supabase.from('livraisons').select('statut').eq('client_id', session.user.id)
      const total    = livs?.length || 0
      const livrees  = livs?.filter(l => l.statut === 'livree').length || 0
      const annulees = livs?.filter(l => l.statut === 'annulee').length || 0
      setStats({ total, livrees, annulees, note_moyenne: u.note_moyenne || 5 })
      setLoading(false)
    }
    init()
  }, [router])

  const handleSaveInfos = async () => {
    if (!user || !form.nom.trim()) { toast.error('Nom requis'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('utilisateurs').update({
        nom:       form.nom.trim(),
        telephone: form.telephone.trim() || null,
        whatsapp:  form.whatsapp.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id)
      if (error) throw error
      setUser(prev => prev ? { ...prev, nom: form.nom.trim(), telephone: form.telephone.trim() } : prev)
      toast.success('Profil mis à jour ✅')
    } catch { toast.error('Erreur lors de la mise à jour') }
    finally { setSaving(false) }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5 Mo'); return }
    setUploadingPhoto(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `avatars/${user.id}/avatar.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('utilisateurs').update({ avatar_url: publicUrl }).eq('id', user.id)
      setUser(prev => prev ? { ...prev, avatar_url: publicUrl } : prev)
      toast.success('Photo mise à jour ✅')
    } catch { toast.error('Erreur upload photo') }
    finally { setUploadingPhoto(false) }
  }

  const handleChangePassword = async () => {
    if (!pwForm.actuel)               { toast.error('Mot de passe actuel requis'); return }
    if (pwForm.nouveau.length < 6)    { toast.error('Minimum 6 caractères'); return }
    if (pwForm.nouveau !== pwForm.confirmer) { toast.error('Mots de passe différents'); return }
    setSavingPw(true)
    try {
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email: user!.email!, password: pwForm.actuel })
      if (loginErr) throw new Error('Mot de passe actuel incorrect')
      const { error } = await supabase.auth.updateUser({ password: pwForm.nouveau })
      if (error) throw error
      toast.success('Mot de passe modifié ✅')
      setPwForm({ actuel: '', nouveau: '', confirmer: '' })
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erreur') }
    finally { setSavingPw(false) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 flex items-center gap-3 h-14">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
            <ArrowLeft size={16} className="text-gray-700" />
          </button>
          <h1 className="font-black text-gray-900 flex-1">Mon profil</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-10 space-y-4">

        {/* Avatar + nom */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 flex flex-col items-center">
          <div className="relative mb-3">
            {user?.avatar_url
              ? <img src={user.avatar_url} alt={user?.nom} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg" />
              : <div className="w-24 h-24 rounded-full flex items-center justify-center text-white font-black text-4xl shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #1a56db, #f97316)' }}>
                  {user?.nom?.charAt(0).toUpperCase()}
                </div>
            }
            <button onClick={() => fileRef.current?.click()} disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg"
              style={{ background: '#1a56db' }}>
              {uploadingPhoto ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Camera size={14} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <p className="font-black text-gray-900 text-xl">{user?.nom}</p>
          <p className="text-gray-400 text-sm">{user?.email}</p>
          <div className="flex items-center gap-1.5 mt-2 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-200">
            <Star size={13} className="text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-bold text-yellow-700">{user?.note_moyenne?.toFixed(1) || '5.0'} / 5</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-2xl p-1.5 border border-gray-100">
          {([
            { k: 'infos' as const,    label: '👤 Infos',      },
            { k: 'securite' as const, label: '🔒 Sécurité',   },
            { k: 'stats' as const,    label: '📊 Statistiques' },
          ]).map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${tab === t.k ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Onglet Infos */}
        {tab === 'infos' && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
            {[
              { key: 'nom' as const,       label: 'Nom complet *',   icon: User,           type: 'text',  placeholder: 'Votre nom' },
              { key: 'telephone' as const, label: 'Téléphone',        icon: Phone,          type: 'tel',   placeholder: '+226 70 00 00 00' },
              { key: 'whatsapp' as const,  label: 'WhatsApp',         icon: MessageSquare,  type: 'tel',   placeholder: '+226 70 00 00 00' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">{f.label}</label>
                <div className="relative">
                  <f.icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={f.type} value={form[f.key]} placeholder={f.placeholder}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 text-gray-900 text-sm outline-none focus:border-blue-500 transition-colors" />
                </div>
              </div>
            ))}
            {/* Email — non modifiable */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Email (non modifiable)</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                <input value={user?.email || ''} disabled type="email"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-100 bg-gray-50 text-gray-400 text-sm outline-none cursor-not-allowed" />
              </div>
            </div>
            <button onClick={handleSaveInfos} disabled={saving}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
              style={{ background: '#1a56db' }}>
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
              {saving ? 'Sauvegarde...' : 'Enregistrer les modifications'}
            </button>
          </div>
        )}

        {/* Onglet Sécurité */}
        {tab === 'securite' && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
            <div className="bg-blue-50 rounded-2xl p-3.5 flex items-center gap-2">
              <Shield size={14} className="text-blue-600" />
              <p className="text-blue-800 text-xs font-semibold">Modification du mot de passe</p>
            </div>
            {[
              { key: 'actuel' as const,   label: 'Mot de passe actuel',  auto: 'current-password' },
              { key: 'nouveau' as const,  label: 'Nouveau mot de passe', auto: 'new-password' },
              { key: 'confirmer' as const, label: 'Confirmer',           auto: 'new-password' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">{f.label}</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={pwForm[f.key]}
                    autoComplete={f.auto}
                    onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full pl-4 pr-11 py-3 rounded-2xl border border-gray-200 text-gray-900 text-sm outline-none focus:border-blue-500"
                    placeholder="••••••••" />
                  {f.key === 'actuel' && (
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button onClick={handleChangePassword} disabled={savingPw}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: '#1a56db' }}>
              {savingPw ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Shield size={14} />}
              {savingPw ? 'Modification...' : 'Modifier le mot de passe'}
            </button>
          </div>
        )}

        {/* Onglet Stats */}
        {tab === 'stats' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Package,  label: 'Total livraisons', val: stats.total,    color: '#1a56db', bg: '#eff6ff' },
                { icon: Package,  label: 'Livrées',          val: stats.livrees,  color: '#22c55e', bg: '#f0fdf4' },
                { icon: Package,  label: 'Annulées',         val: stats.annulees, color: '#ef4444', bg: '#fef2f2' },
                { icon: Star,     label: 'Ma note',          val: `${stats.note_moyenne?.toFixed(1) || '5.0'} ⭐`, color: '#eab308', bg: '#fefce8' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                    <s.icon size={16} style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">{s.label}</p>
                    <p className="font-black text-gray-900 text-lg">{s.val}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-400">Membre depuis</p>
              <p className="font-bold text-gray-900 mt-0.5">
                {user?.created_at ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(user.created_at)) : '—'}
              </p>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}