import { supabase } from "@/lib/supabase";

interface Message {
    id: string;
    expediteur_id: string;
    destinataire_id: string;
    livraison_id?: string;
    contenu: string;
    created_at: string;
    lu: boolean;
}

interface Conversation {
    interlocuteur_id: string;
    interlocuteur_nom: string;
    dernier_message: string;
    dernier_message_date: string;
    non_lus: number;
}

class CommunicationService {

    /**
     * Envoie un message entre deux utilisateurs, potentiellement lié à une livraison.
     * @param expediteurId - L\"ID de l\"expéditeur.
     * @param destinataireId - L\"ID du destinataire.
     * @param contenu - Le contenu du message.
     * @param livraisonId - L\"ID de la livraison (optionnel).
     */
    async sendMessage(expediteurId: string, destinataireId: string, contenu: string, livraisonId?: string): Promise<Message> {
        const { data, error } = await supabase
            .from("messages")
            .insert({
                expediteur_id: expediteurId,
                destinataire_id: destinataireId,
                livraison_id: livraisonId,
                contenu: contenu,
            })
            .select()
            .single();

        if (error) {
            console.error("Error sending message:", error);
            throw new Error("Impossible d\"envoyer le message.");
        }
        return data;
    }

    /**
     * Récupère tous les messages d\"une conversation entre deux utilisateurs pour une livraison donnée.
     * @param userId1 - L\"ID du premier utilisateur.
     * @param userId2 - L\"ID du second utilisateur.
     * @param livraisonId - L\"ID de la livraison.
     */
    async getConversation(userId1: string, userId2: string, livraisonId: string): Promise<Message[]> {
        const { data, error } = await supabase
            .from("messages")
            .select("*")
            .eq("livraison_id", livraisonId)
            .or(`(expediteur_id.eq.${userId1},destinataire_id.eq.${userId2}),(expediteur_id.eq.${userId2},destinataire_id.eq.${userId1})`)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error fetching conversation:", error);
            throw new Error("Impossible de récupérer la conversation.");
        }
        return data || [];
    }

    /**
     * Marque les messages comme lus.
     * @param expediteurId - L\"ID de l\"expéditeur (messages à marquer comme lus).
     * @param destinataireId - L\"ID du destinataire (utilisateur actuel).
     * @param livraisonId - L\"ID de la livraison (optionnel).
     */
    async markMessagesAsRead(expediteurId: string, destinataireId: string, livraisonId?: string): Promise<void> {
        let query = supabase
            .from("messages")
            .update({ lu: true })
            .eq("expediteur_id", expediteurId)
            .eq("destinataire_id", destinataireId)
            .eq("lu", false);

        if (livraisonId) {
            query = query.eq("livraison_id", livraisonId);
        }

        const { error } = await query;

        if (error) {
            console.error("Error marking messages as read:", error);
            throw new Error("Impossible de marquer les messages comme lus.");
        }
    }

    /**
     * Récupère la liste des conversations pour un utilisateur.
     * @param userId - L\"ID de l\"utilisateur.
     */
    async getConversationsList(userId: string): Promise<Conversation[]> {
        // Cette fonction est plus complexe car elle nécessite des agrégations.
        // Pour simplifier, nous allons récupérer les messages et les regrouper côté client
        // ou utiliser une fonction Supabase RPC/Vue matérialisée si la performance est critique.

        const { data: messages, error } = await supabase
            .from("messages")
            .select(
                `*,
                expediteur:expediteur_id(nom, avatar_url),
                destinataire:destinataire_id(nom, avatar_url)`
            )
            .or(`expediteur_id.eq.${userId},destinataire_id.eq.${userId}`)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching messages for conversations list:", error);
            throw new Error("Impossible de récupérer la liste des conversations.");
        }

        const conversationsMap = new Map<string, Conversation>();

        for (const msg of messages || []) {
            const interlocuteur = msg.expediteur_id === userId ? msg.destinataire : msg.expediteur;
            const interlocuteurId = interlocuteur?.id;

            if (interlocuteurId && !conversationsMap.has(interlocuteurId)) {
                // Compter les messages non lus pour cette conversation
                const nonLusCount = messages.filter(
                    (m: Message) => m.expediteur_id === interlocuteurId && m.destinataire_id === userId && !m.lu
                ).length;

                conversationsMap.set(interlocuteurId, {
                    interlocuteur_id: interlocuteurId,
                    interlocuteur_nom: interlocuteur?.nom || "Inconnu",
                    dernier_message: msg.contenu,
                    dernier_message_date: msg.created_at,
                    non_lus: nonLusCount,
                });
            }
        }

        return Array.from(conversationsMap.values());
    }

    /**
     * Génère un lien WhatsApp pour un numéro donné.
     * @param phoneNumber - Le numéro de téléphone.
     */
    getWhatsAppLink(phoneNumber: string): string {
        // Supprime tous les caractères non numériques et ajoute le code pays si manquant
        const cleanedNumber = phoneNumber.replace(/\D/g, "");
        // Supposons que le code pays par défaut est +226 pour le Burkina Faso si non présent
        const internationalNumber = cleanedNumber.startsWith("226") ? cleanedNumber : `226${cleanedNumber}`;
        return `https://wa.me/${internationalNumber}`;
    }
}

export const communicationService = new CommunicationService();
