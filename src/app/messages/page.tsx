'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { communicationService } from '@/services/communication-service'

export default function MessagesPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; nom: string } | null>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadConversations = useCallback(async (userId: string) => {
    try {
      // getUserConversations est maintenant disponible dans le service
      const convs = await communicationService.getUserConversations(userId)
      setConversations(convs)
    } catch (err) {
      console.error('[MessagesPage] loadConversations:', err)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')

      const { data: userData } = await supabase
        .from('utilisateurs')
        .select('id, nom')
        .eq('id', session.user.id)
        .single()

      if (!userData) return router.push('/login')

      setUser(userData)
      await loadConversations(session.user.id)
      setLoading(false)
    }
    init()
  }, [router, loadConversations])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`messages-updates-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        loadConversations(user.id)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, loadConversations])

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations
    const q = search.toLowerCase()
    return conversations.filter((conv) =>
      conv.interlocuteur_nom?.toLowerCase().includes(q) ||
      conv.dernier_message?.toLowerCase().includes(q)
    )
  }, [conversations, search])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-600">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-600 p-4 text-white sticky top-0 z-10 shadow-md">
        <h1 className="font-bold text-xl">Messagerie</h1>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        <input
          type="text"
          placeholder="Rechercher une conversation..."
          className="w-full p-3 rounded-xl border border-gray-200 mb-4 text-sm outline-none focus:border-primary-400 transition-colors"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {filteredConversations.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-sm">
              {search ? 'Aucun résultat pour cette recherche' : 'Aucune conversation pour le moment'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredConversations.map((conv) => (
              <Link
                key={conv.interlocuteur_id}
                href={`/chat/${conv.interlocuteur_id}`}
                className="block bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {conv.interlocuteur_nom?.charAt(0) ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <h3 className="font-bold truncate">{conv.interlocuteur_nom}</h3>
                      <div className="flex items-center gap-2 shrink-0">
                        {conv.dernier_message_date && (
                          <span className="text-xs text-gray-400">
                            {new Date(conv.dernier_message_date).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </span>
                        )}
                        {conv.messages_non_lus > 0 && (
                          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                            {conv.messages_non_lus}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                      {conv.dernier_message ?? 'Démarrer la conversation'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
