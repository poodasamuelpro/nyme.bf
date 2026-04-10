// src/services/communication-service.ts — FICHIER MODIFIÉ
// MODIFICATION : ajout de sendMessageWithPhoto() pour envoi photo dans chat
// + upload photo vers Supabase Storage avant insertion
import { supabase } from "@/lib/supabase"

export interface Message {
  id:               string
  expediteur_id:    string
  destinataire_id:  string
  livraison_id?:    string | null
  contenu:          string
  photo_url?:       string | null
  created_at:       string
  lu:               boolean
}

export type MessageWithAuthor = Message & {
  expediteur?: { nom: string; avatar_url?: string }
}

export interface Conversation {
  interlocuteur_id:     string
  interlocuteur_nom:    string
  interlocuteur_avatar?: string
  dernier_message:      string
  dernier_message_date: string
  messages_non_lus:     number
}

class CommunicationService {

  async sendMessage(
    expediteurId:    string,
    destinataireId:  string,
    contenu:         string,
    livraisonId?:    string
  ): Promise<Message> {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        expediteur_id:   expediteurId,
        destinataire_id: destinataireId,
        livraison_id:    livraisonId ?? null,
        contenu,
        photo_url:       null,
      })
      .select()
      .single()
    if (error) throw new Error("Impossible d'envoyer le message.")
    return data as Message
  }

  /**
   * NOUVEAU — Envoyer un message avec une photo jointe.
   * Upload l'image vers Supabase Storage (bucket: chat-photos),
   * puis insère le message avec photo_url.
   */
  async sendMessageWithPhoto(
    expediteurId:   string,
    destinataireId: string,
    file:           File,
    caption?:       string,
    livraisonId?:   string
  ): Promise<Message> {
    if (!file) throw new Error('Fichier requis')
    if (file.size > 10 * 1024 * 1024) throw new Error('Fichier trop volumineux (max 10 Mo)')

    // Upload vers Supabase Storage
    const ext       = file.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const path      = `chat/${livraisonId || 'general'}/${expediteurId}_${timestamp}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('chat-photos')
      .upload(path, file, { upsert: false })

    if (upErr) throw new Error(`Erreur upload photo : ${upErr.message}`)

    const { data: { publicUrl } } = supabase.storage
      .from('chat-photos')
      .getPublicUrl(path)

    // Insérer le message avec photo_url
    const { data, error } = await supabase
      .from("messages")
      .insert({
        expediteur_id:   expediteurId,
        destinataire_id: destinataireId,
        livraison_id:    livraisonId ?? null,
        contenu:         caption || '📷 Photo',
        photo_url:       publicUrl,
      })
      .select()
      .single()

    if (error) throw new Error("Impossible d'envoyer le message avec photo.")
    return data as Message
  }

  async getConversation(
    userId1:      string,
    userId2:      string,
    livraisonId?: string
  ): Promise<MessageWithAuthor[]> {
    let query = supabase
      .from("messages")
      .select("*, expediteur:expediteur_id(nom, avatar_url)")
      .or(`and(expediteur_id.eq.${userId1},destinataire_id.eq.${userId2}),and(expediteur_id.eq.${userId2},destinataire_id.eq.${userId1})`)
      .order("created_at", { ascending: true })
    if (livraisonId) query = query.eq("livraison_id", livraisonId)
    const { data, error } = await query
    if (error) throw new Error("Impossible de récupérer la conversation.")
    return (data || []) as MessageWithAuthor[]
  }

  async markMessagesAsRead(
    destinataireId: string,
    expediteurId:   string,
    livraisonId?:   string
  ): Promise<void> {
    let query = supabase
      .from("messages")
      .update({ lu: true })
      .eq("expediteur_id", expediteurId)
      .eq("destinataire_id", destinataireId)
      .eq("lu", false)
    if (livraisonId) query = query.eq("livraison_id", livraisonId)
    await query
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return this.getConversationsList(userId)
  }

  async getConversationsList(userId: string): Promise<Conversation[]> {
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*, expediteur:expediteur_id(id, nom, avatar_url), destinataire:destinataire_id(id, nom, avatar_url)")
      .or(`expediteur_id.eq.${userId},destinataire_id.eq.${userId}`)
      .order("created_at", { ascending: false })
    if (error) throw new Error("Impossible de récupérer les conversations.")

    const map = new Map<string, Conversation>()
    for (const msg of messages || []) {
      const isExp       = msg.expediteur_id === userId
      const interlocuteur = isExp ? msg.destinataire : msg.expediteur
      const iId: string | undefined = interlocuteur?.id
      if (!iId || map.has(iId)) continue
      const nonLus = (messages || []).filter(
        (m: Message) => m.expediteur_id === iId && m.destinataire_id === userId && !m.lu
      ).length
      map.set(iId, {
        interlocuteur_id:     iId,
        interlocuteur_nom:    interlocuteur?.nom ?? "Inconnu",
        interlocuteur_avatar: interlocuteur?.avatar_url,
        dernier_message:      msg.contenu,
        dernier_message_date: msg.created_at,
        messages_non_lus:     nonLus,
      })
    }
    return Array.from(map.values())
  }

  getWhatsAppLink(phoneNumber: string): string {
    const cleaned     = phoneNumber.replace(/\D/g, "")
    const international = cleaned.startsWith("226") ? cleaned : `226${cleaned}`
    return `https://wa.me/${international}`
  }
}

export const communicationService = new CommunicationService()