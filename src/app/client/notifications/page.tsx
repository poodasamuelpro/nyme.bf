// src/app/client/notifications/page.tsx
// ═══════════════════════════════════════════════════════════════════════════
// PAGE NOTIFICATIONS CLIENT — NYME
// Affiche les notifications in-app + l'historique des appels WebRTC
// Gère les appels manqués avec un bouton de rappel (CallButton)
// ═══════════════════════════════════════════════════════════════════════════
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Notification } from '@/lib/supabase'
import type { CallWithNames } from '@/services/webrtc-call-service'
import CallButton from '@/components/calls/CallButton'
import toast from 'react-hot-toast'
import { Bell, Phone, PhoneMissed, PhoneIncoming, ArrowLeft, Check, CheckCheck } from 'lucide-react'

const NOTIF_ICONS: Record<string, string> = {
  course_acceptee:        '🛵',
  nouvelle_proposition:   '💬',
  statut_livraison:       '📦',
  livraison_livree:       '🎉',
  paiement:               '💳',
  evaluation:             '⭐',
  verification_documents: '🔏',
  default:                '🔔',
}

const fDate = (d: string) => {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (diff < 60)    return 'À l\'instant'
  if (diff < 3600)  return `${Math.floor(diff / 60)} min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

const fDuration = (sec: number | null): string => {
  if (!sec) return ''
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}min ${s > 0 ? s + 's' : ''}` : `${s}s`
}

type ActiveTab = 'notifications' | 'appels'

export default function NotificationsPage() {
  const router = useRouter()

  const [tab,             setTab]           = useState<ActiveTab>('notifications')
  const [userId,          setUserId]        = useState<string | null>(null)
  const [notifications,   setNotifications] = useState<Notification[]>([])
  const [calls,           setCalls]         = useState<CallWithNames[]>([])
  const [loadingNotifs,   setLoadingNotifs] = useState(true)
  const [loadingCalls,    setLoadingCalls]  = useState(true)

  // ── Auth ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
    })
  }, [router])

  // ── Chargement notifications ───────────────────────────────────────────────

  const loadNotifications = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications((data || []) as Notification[])
    setLoadingNotifs(false)
  }, [userId])

  // ── Chargement historique appels ───────────────────────────────────────────

  const loadCalls = useCallback(async () => {
    if (!userId) return
    setLoadingCalls(true)
    try {
      const res  = await fetch('/api/calls?limit=30')
      const data = await res.json() as { calls?: CallWithNames[] }
      setCalls(data.calls || [])
    } catch {
      toast.error('Erreur chargement historique appels')
    } finally {
      setLoadingCalls(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    loadNotifications()
    loadCalls()

    // Realtime pour les nouvelles notifications
    const channel = supabase
      .channel(`notifs-page-${userId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${userId}`,
      }, (p) => {
        setNotifications(prev => [p.new as Notification, ...prev.slice(0, 49)])
        toast((p.new as Notification).titre || '🔔 Nouvelle notification', { icon: '🔔' })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, loadNotifications, loadCalls])

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ lu: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n))
  }

  const markAllRead = async () => {
    if (!userId) return
    await supabase.from('notifications').update({ lu: true }).eq('user_id', userId).eq('lu', false)
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })))
    toast.success('Toutes les notifications marquées comme lues')
  }

  const unreadCount = notifications.filter(n => !n.lu).length
  const missedCalls = calls.filter(c => c.statut === 'manque' && c.destinataire_id === userId)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 flex items-center gap-3 h-14">
          <button onClick={() => router.push('/client/dashboard')}
            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <ArrowLeft size={16} className="text-gray-600" />
          </button>
          <h1 className="font-bold text-gray-900 flex-1">Notifications & Appels</h1>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
              <CheckCheck size={12} />
              Tout lire
            </button>
          )}
        </div>

        {/* Onglets */}
        <div className="max-w-2xl mx-auto px-4 flex gap-4 pb-0">
          <button
            onClick={() => setTab('notifications')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'notifications'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Bell size={14} />
              Notifications
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setTab('appels')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'appels'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Phone size={14} />
              Appels
              {missedCalls.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {missedCalls.length}
                </span>
              )}
            </span>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">

        {/* ── Onglet Notifications ──────────────────────────────────────────── */}
        {tab === 'notifications' && (
          <div className="space-y-1">
            {loadingNotifs ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-20">
                <Bell size={36} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">Aucune notification</p>
                <p className="text-gray-300 text-sm mt-1">Vos notifications apparaîtront ici</p>
              </div>
            ) : notifications.map(notif => {
              const icon = NOTIF_ICONS[notif.type] || NOTIF_ICONS.default
              const data = (notif.data || {}) as Record<string, string>

              let href: string | null = null
              if (data.livraison_id) {
                if (notif.type === 'statut_livraison' || notif.type === 'course_acceptee') {
                  href = `/client/suivi/${data.livraison_id}`
                } else if (notif.type === 'livraison_livree') {
                  href = `/client/evaluation/${data.livraison_id}`
                } else if (notif.type === 'nouvelle_proposition') {
                  href = `/client/propositions/${data.livraison_id}`
                }
              }

              const Content = (
                <div
                  onClick={() => !notif.lu && markAsRead(notif.id)}
                  className={`flex items-start gap-3 p-4 rounded-2xl mb-1 cursor-pointer transition-colors ${
                    !notif.lu ? 'bg-blue-50 hover:bg-blue-100' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${!notif.lu ? 'bg-blue-500' : 'bg-transparent'}`} />
                  <span className="text-2xl shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${!notif.lu ? 'text-gray-900' : 'text-gray-600'}`}>{notif.titre}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{fDate(notif.created_at)}</p>
                  </div>
                  {!notif.lu && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markAsRead(notif.id) }}
                      className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 hover:bg-blue-200"
                    >
                      <Check size={10} className="text-blue-600" />
                    </button>
                  )}
                </div>
              )

              return href ? (
                <Link key={notif.id} href={href} onClick={() => markAsRead(notif.id)}>
                  {Content}
                </Link>
              ) : (
                <div key={notif.id}>{Content}</div>
              )
            })}
          </div>
        )}

        {/* ── Onglet Appels ────────────────────────────────────────────────── */}
        {tab === 'appels' && (
          <div className="space-y-2">
            {loadingCalls ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : calls.length === 0 ? (
              <div className="text-center py-20">
                <Phone size={36} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">Aucun appel</p>
                <p className="text-gray-300 text-sm mt-1">Votre historique d'appels NYME apparaîtra ici</p>
              </div>
            ) : calls.map(call => {
              const isIncoming = call.destinataire_id === userId
              const isMissed   = call.statut === 'manque'
              const isRefused  = call.statut === 'refuse'
              const otherUser  = isIncoming
                ? { nom: call.appelant_nom, avatar: call.appelant_avatar, id: call.appelant_id }
                : { nom: call.destinataire_nom, avatar: call.destinataire_avatar, id: call.destinataire_id }

              return (
                <div key={call.id}
                  className={`flex items-center gap-3 p-4 rounded-2xl ${
                    isMissed ? 'bg-red-50 border border-red-100' : 'bg-white'
                  }`}
                >
                  {/* Icône type d'appel */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    isMissed ? 'bg-red-100' :
                    isRefused ? 'bg-gray-100' :
                    call.statut === 'en_cours' || call.statut === 'termine' ? 'bg-green-100' :
                    'bg-gray-100'
                  }`}>
                    {isMissed     ? <PhoneMissed   size={18} className="text-red-500"   /> :
                     isIncoming  ? <PhoneIncoming  size={18} className="text-green-600" /> :
                                    <Phone          size={18} className="text-blue-600"  />
                    }
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${isMissed ? 'text-red-700' : 'text-gray-900'}`}>
                      {otherUser.nom || 'Inconnu'}
                    </p>
                    <p className={`text-xs mt-0.5 ${isMissed ? 'text-red-500' : 'text-gray-400'}`}>
                      {isMissed   ? '📵 Appel manqué'        :
                       isRefused  ? '🚫 Appel refusé'        :
                       isIncoming ? '📲 Appel entrant'       :
                                    '📞 Appel sortant'       }
                      {call.duree_secondes ? ` · ${fDuration(call.duree_secondes)}` : ''}
                      {' · '}{fDate(call.created_at)}
                    </p>
                    {call.livraison_id && (
                      <Link href={`/client/suivi/${call.livraison_id}`}
                        className="text-[10px] text-blue-500 hover:underline">
                        Livraison #{call.livraison_id.slice(0, 8).toUpperCase()}
                      </Link>
                    )}
                  </div>

                  {/* Bouton rappel pour appels manqués */}
                  {(isMissed || isRefused) && userId && otherUser.id && (
                    <CallButton
                      appelantId={userId}
                      appelantRole="client"
                      destinataireId={otherUser.id}
                      livraisonId={call.livraison_id || undefined}
                      variant="mini"
                      className="shrink-0"
                      title="Rappeler"
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}