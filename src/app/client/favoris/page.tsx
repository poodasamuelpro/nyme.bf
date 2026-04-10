// src/app/client/favoris/page.tsx — FICHIER MODIFIÉ
// MODIFICATION : onglet "coursiers favoris" maintenant fonctionnel
// Requête sur table coursiers_favoris avec jointure utilisateurs
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { AdresseFavorite, CoursierFavori } from '@/lib/supabase'
import { ArrowLeft, Plus, MapPin, Star, Trash2, Heart, User } from 'lucide-react'
import toast from 'react-hot-toast'

type Tab = 'adresses' | 'coursiers'

interface CoursierFavoriWithDetails extends CoursierFavori {
  coursier?: {
    id:           string
    nom:          string
    avatar_url:   string | null
    note_moyenne: number
    telephone:    string | null
    total_courses: number
  }
}

export default function FavorisPage() {
  const router = useRouter()
  const [user,     setUser]     = useState<{ id: string } | null>(null)
  const [tab,      setTab]      = useState<Tab>('adresses')
  const [loading,  setLoading]  = useState(true)

  // Adresses
  const [addresses, setAddresses] = useState<AdresseFavorite[]>([])
  const [showAdd,   setShowAdd]   = useState(false)
  const [newAddress, setNewAddress] = useState({ label: '', adresse: '', latitude: 12.3547, longitude: -1.5247 })
  const [submittingAddr, setSubmittingAddr] = useState(false)

  // Coursiers favoris
  const [coursiersF,    setCoursiersF]    = useState<CoursierFavoriWithDetails[]>([])
  const [loadingCF,     setLoadingCF]     = useState(false)

  const loadAddresses = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('adresses_favorites')
      .select('*')
      .eq('user_id', userId)
      .order('est_defaut', { ascending: false })
    setAddresses((data || []) as AdresseFavorite[])
  }, [])

  // MODIFICATION : chargement réel depuis coursiers_favoris + jointure
  const loadCoursiersF = useCallback(async (userId: string) => {
    setLoadingCF(true)
    const { data, error } = await supabase
      .from('coursiers_favoris')
      .select(`
        *,
        coursier:coursier_id (
          id,
          nom,
          avatar_url,
          note_moyenne,
          telephone,
          total_courses
        )
      `)
      .eq('client_id', userId)
      .order('created_at', { ascending: false })
    if (!error) setCoursiersF((data || []) as CoursierFavoriWithDetails[])
    setLoadingCF(false)
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: userData } = await supabase
        .from('utilisateurs').select('id').eq('id', session.user.id).single()
      if (!userData) { router.push('/login'); return }
      setUser(userData)
      await loadAddresses(session.user.id)
      setLoading(false)
    }
    init()
  }, [router, loadAddresses])

  // Charger les coursiers favoris quand on bascule sur l'onglet
  useEffect(() => {
    if (tab === 'coursiers' && user && coursiersF.length === 0 && !loadingCF) {
      loadCoursiersF(user.id)
    }
  }, [tab, user, coursiersF.length, loadingCF, loadCoursiersF])

  // ── Adresses ──────────────────────────────────────────────────────
  const handleAddAddress = async () => {
    if (!user || !newAddress.label || !newAddress.adresse) {
      toast.error('Remplissez tous les champs')
      return
    }
    if (addresses.length >= 10) {
      toast.error('Maximum 10 adresses')
      return
    }
    setSubmittingAddr(true)
    try {
      const { error } = await supabase.from('adresses_favorites').insert({
        user_id:   user.id,
        label:     newAddress.label.trim(),
        adresse:   newAddress.adresse.trim(),
        latitude:  newAddress.latitude,
        longitude: newAddress.longitude,
        est_defaut: addresses.length === 0,
      })
      if (error) throw error
      toast.success('Adresse ajoutée ✅')
      setShowAdd(false)
      setNewAddress({ label: '', adresse: '', latitude: 12.3547, longitude: -1.5247 })
      await loadAddresses(user.id)
    } catch { toast.error('Erreur lors de l\'ajout') }
    finally { setSubmittingAddr(false) }
  }

  const handleDeleteAddress = async (id: string) => {
    const { error } = await supabase.from('adresses_favorites').delete().eq('id', id)
    if (!error) {
      setAddresses(prev => prev.filter(a => a.id !== id))
      toast.success('Adresse supprimée')
    }
  }

  const handleSetDefault = async (id: string) => {
    if (!user) return
    await supabase.from('adresses_favorites').update({ est_defaut: false }).eq('user_id', user.id)
    await supabase.from('adresses_favorites').update({ est_defaut: true }).eq('id', id)
    await loadAddresses(user.id)
    toast.success('Adresse principale définie')
  }

  // ── Coursiers favoris ─────────────────────────────────────────────
  const handleRemoveFavoriCoursier = async (favoriId: string) => {
    const { error } = await supabase.from('coursiers_favoris').delete().eq('id', favoriId)
    if (!error) {
      setCoursiersF(prev => prev.filter(c => c.id !== favoriId))
      toast.success('Retiré des favoris')
    }
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
          <h1 className="font-black text-gray-900 flex-1">Mes favoris</h1>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 pb-2 flex gap-2">
          {([
            { k: 'adresses' as const,  label: '📍 Adresses',  count: addresses.length },
            { k: 'coursiers' as const, label: '🛵 Coursiers',  count: coursiersF.length },
          ]).map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${tab === t.k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {t.label}
              {t.count > 0 && <span className={`text-[11px] ${tab === t.k ? 'text-blue-200' : 'text-gray-400'}`}>{t.count}</span>}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-8 space-y-3">

        {/* ── Onglet Adresses ── */}
        {tab === 'adresses' && (
          <>
            <button onClick={() => setShowAdd(!showAdd)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-blue-200 text-blue-600 font-bold text-sm hover:bg-blue-50 transition-colors">
              <Plus size={15} /> Ajouter une adresse
              <span className="text-xs text-gray-400">({addresses.length}/10)</span>
            </button>

            {showAdd && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <p className="font-bold text-gray-900 text-sm">Nouvelle adresse</p>
                {[
                  { key: 'label' as const,   label: 'Label (ex: Maison, Bureau)*', placeholder: 'Maison' },
                  { key: 'adresse' as const, label: 'Adresse complète *',           placeholder: 'Rue, quartier, ville' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">{f.label}</label>
                    <input type="text" value={newAddress[f.key]} placeholder={f.placeholder}
                      onChange={e => setNewAddress(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500" />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Latitude</label>
                    <input type="number" step="0.0001" value={newAddress.latitude}
                      onChange={e => setNewAddress(p => ({ ...p, latitude: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Longitude</label>
                    <input type="number" step="0.0001" value={newAddress.longitude}
                      onChange={e => setNewAddress(p => ({ ...p, longitude: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAdd(false)}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-700 text-sm">
                    Annuler
                  </button>
                  <button onClick={handleAddAddress} disabled={submittingAddr}
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm disabled:opacity-60">
                    {submittingAddr ? '...' : 'Ajouter'}
                  </button>
                </div>
              </div>
            )}

            {addresses.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <MapPin size={32} className="mx-auto mb-2 text-gray-200" />
                <p className="text-sm">Aucune adresse favorite</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {addresses.map(addr => (
                  <div key={addr.id} className="flex items-center gap-3 px-4 py-4 border-b border-gray-50 last:border-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${addr.est_defaut ? 'bg-blue-600' : 'bg-gray-100'}`}>
                      <MapPin size={16} className={addr.est_defaut ? 'text-white' : 'text-gray-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 text-sm">{addr.label}</p>
                        {addr.est_defaut && <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full">Principal</span>}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{addr.adresse}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!addr.est_defaut && (
                        <button onClick={() => handleSetDefault(addr.id)}
                          className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors"
                          title="Définir comme principal">
                          <Star size={13} className="text-blue-600" />
                        </button>
                      )}
                      <button onClick={() => handleDeleteAddress(addr.id)}
                        className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors">
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Onglet Coursiers Favoris (maintenant fonctionnel) ── */}
        {tab === 'coursiers' && (
          <>
            {loadingCF ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : coursiersF.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Heart size={32} className="mx-auto mb-2 text-gray-200" />
                <p className="text-sm font-medium">Aucun coursier favori</p>
                <p className="text-xs text-gray-300 mt-1">Ajoutez des coursiers en favoris depuis la page d'évaluation</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {coursiersF.map(fav => (
                  <div key={fav.id} className="flex items-center gap-3 px-4 py-4 border-b border-gray-50 last:border-0">
                    {/* Avatar */}
                    {fav.coursier?.avatar_url
                      ? <img src={fav.coursier.avatar_url} alt={fav.coursier.nom}
                          className="w-12 h-12 rounded-full object-cover border-2 border-orange-100 shrink-0" />
                      : <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                          style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                          {fav.coursier?.nom?.charAt(0).toUpperCase() || '?'}
                        </div>
                    }
                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-gray-900 text-sm">{fav.coursier?.nom || 'Coursier'}</p>
                        <Heart size={11} className="text-red-400 fill-red-400" />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-yellow-600 flex items-center gap-0.5">
                          <Star size={10} className="fill-yellow-500 text-yellow-500" />
                          {fav.coursier?.note_moyenne?.toFixed(1) || '—'}
                        </span>
                        <span className="text-[10px] text-gray-400">·</span>
                        <span className="text-xs text-gray-400">{fav.coursier?.total_courses || 0} courses</span>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-1.5 shrink-0">
                      {fav.coursier?.telephone && (
                        <a href={`tel:${fav.coursier.telephone}`}
                          className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center text-lg hover:bg-green-100 transition-colors">
                          📞
                        </a>
                      )}
                      <button onClick={() => handleRemoveFavoriCoursier(fav.id)}
                        className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors">
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}