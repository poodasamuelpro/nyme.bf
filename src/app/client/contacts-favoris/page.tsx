// src/app/client/contacts-favoris/page.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { ContactFavori } from '@/lib/supabase'
import { ArrowLeft, UserPlus, Phone, Edit2, Trash2, Package } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ContactsFavorisPage() {
  const router = useRouter()
  const [userId,    setUserId]    = useState<string | null>(null)
  const [contacts,  setContacts]  = useState<ContactFavori[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [editing,   setEditing]   = useState<ContactFavori | null>(null)
  const [form,      setForm]      = useState({ nom: '', telephone: '', whatsapp: '', email: '' })
  const [saving,    setSaving]    = useState(false)

  const loadContacts = useCallback(async (uid: string) => {
    const { data } = await supabase.from('contacts_favoris').select('*').eq('user_id', uid).order('nom')
    setContacts((data || []) as ContactFavori[])
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const { data: u } = await supabase.from('utilisateurs').select('role').eq('id', session.user.id).single()
      if (!u || u.role !== 'client') { router.replace('/login'); return }
      setUserId(session.user.id)
      await loadContacts(session.user.id)
      setLoading(false)
    }
    init()
  }, [router, loadContacts])

  const openAdd = () => { setEditing(null); setForm({ nom: '', telephone: '', whatsapp: '', email: '' }); setShowForm(true) }
  const openEdit = (c: ContactFavori) => { setEditing(c); setForm({ nom: c.nom, telephone: c.telephone, whatsapp: c.whatsapp || '', email: c.email || '' }); setShowForm(true) }

  const handleSave = async () => {
    if (!userId || !form.nom || !form.telephone) { toast.error('Nom et téléphone requis'); return }
    setSaving(true)
    try {
      if (editing) {
        const { error } = await supabase.from('contacts_favoris').update({ nom: form.nom, telephone: form.telephone, whatsapp: form.whatsapp || null, email: form.email || null }).eq('id', editing.id)
        if (error) throw error
        toast.success('Contact modifié')
      } else {
        const { error } = await supabase.from('contacts_favoris').insert({ user_id: userId, nom: form.nom, telephone: form.telephone, whatsapp: form.whatsapp || null, email: form.email || null })
        if (error) {
          if (error.message.includes('unique')) throw new Error('Ce numéro existe déjà dans vos contacts')
          throw error
        }
        toast.success('Contact ajouté')
      }
      setShowForm(false); setEditing(null)
      await loadContacts(userId)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string, nom: string) => {
    if (!confirm(`Supprimer ${nom} ?`)) return
    await supabase.from('contacts_favoris').delete().eq('id', id)
    setContacts(p => p.filter(c => c.id !== id))
    toast.success('Contact supprimé')
  }

  const inp = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-colors'

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center"><ArrowLeft size={16} className="text-gray-700" /></button>
          <h1 className="font-heading font-bold text-gray-900 flex-1">Contacts favoris</h1>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700">
            <UserPlus size={14} />Ajouter
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-5 pb-24 space-y-4">
        <p className="text-gray-500 text-sm">Enregistrez vos destinataires fréquents pour commander plus rapidement.</p>

        {/* Formulaire */}
        {showForm && (
          <div className="bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900">{editing ? 'Modifier le contact' : 'Nouveau contact'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nom complet *</label>
                <input type="text" placeholder="Prénom Nom" value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Téléphone *</label>
                <input type="tel" placeholder="+226 XX XX XX XX" value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">WhatsApp</label>
                <input type="tel" placeholder="+226 XX XX XX XX" value={form.whatsapp} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))} className={inp} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Email (optionnel)</label>
                <input type="email" placeholder="contact@email.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inp} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowForm(false); setEditing(null) }} className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-700">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50">{saving ? '...' : editing ? '💾 Modifier' : '✅ Ajouter'}</button>
            </div>
          </div>
        )}

        {/* Liste contacts */}
        {contacts.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
            <span className="text-5xl block mb-4">👥</span>
            <p className="font-bold text-gray-700 mb-1">Aucun contact favori</p>
            <p className="text-gray-400 text-sm mb-4">Ajoutez vos destinataires fréquents pour commander plus vite</p>
            <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700"><UserPlus size={14} />Ajouter un contact</button>
          </div>
        ) : (
          <div className="space-y-2">
            {contacts.map(c => (
              <div key={c.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4 hover:border-blue-200 transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-black text-xl">{c.nom.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{c.nom}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                    <a href={`tel:${c.telephone}`} className="flex items-center gap-1 hover:text-blue-600"><Phone size={10} />{c.telephone}</a>
                    {c.whatsapp && <a href={`https://wa.me/226${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">WhatsApp</a>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => router.push(`/client/nouvelle-livraison?tel=${c.telephone}&nom=${encodeURIComponent(c.nom)}`)}
                    className="p-2 bg-blue-50 rounded-lg text-blue-600 hover:bg-blue-100 flex items-center gap-1 text-xs font-semibold">
                    <Package size={12} />Envoyer
                  </button>
                  <button onClick={() => openEdit(c)} className="p-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200"><Edit2 size={13} /></button>
                  <button onClick={() => handleDelete(c.id, c.nom)} className="p-2 bg-red-50 rounded-lg text-red-500 hover:bg-red-100"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
