import { supabase } from "@/lib/supabase"; 

interface Proposition {
    id: string;
    livraison_id: string;
    propose_par_id: string;
    montant: number;
    statut: 'en_attente' | 'accepte' | 'refuse';
    created_at: string;
}

class PriceNegotiationService {

    /**
     * Crée une nouvelle proposition de prix pour une livraison.
     * @param livraisonId - L'ID de la livraison.
     * @param proposeParId - L'ID de l'utilisateur qui fait la proposition (client ou coursier).
     * @param montant - Le montant proposé.
     */
    async createProposition(livraisonId: string, proposeParId: string, montant: number): Promise<Proposition> {
        // D'abord, refuser toutes les propositions précédentes pour cette livraison
        await supabase
            .from('propositions_prix')
            .update({ statut: 'refuse' })
            .eq('livraison_id', livraisonId)
            .eq('statut', 'en_attente');

        // Ensuite, créer la nouvelle proposition
        const { data, error } = await supabase
            .from('propositions_prix')
            .insert({
                livraison_id: livraisonId,
                propose_par_id: proposeParId,
                montant: montant,
                statut: 'en_attente'
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating proposition:', error);
            throw new Error("Impossible de créer la proposition.");
        }

        return data;
    }

    /**
     * Récupère toutes les propositions pour une livraison donnée.
     * @param livraisonId - L'ID de la livraison.
     */
    async getPropositions(livraisonId: string): Promise<Proposition[]> {
        const { data, error } = await supabase
            .from('propositions_prix')
            .select('*')
            .eq('livraison_id', livraisonId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching propositions:', error);
            throw new Error("Impossible de récupérer les propositions.");
        }

        return data || [];
    }

    /**
     * Accepte une proposition de prix. Met à jour le statut de la proposition et le prix final de la livraison.
     * @param propositionId - L'ID de la proposition à accepter.
     */
    async acceptProposition(propositionId: string): Promise<void> {
        // 1. Récupérer les détails de la proposition
        const { data: proposition, error: propError } = await supabase
            .from('propositions_prix')
            .select('id, livraison_id, montant')
            .eq('id', propositionId)
            .single();

        if (propError || !proposition) {
            console.error('Error fetching proposition to accept:', propError);
            throw new Error("Proposition introuvable.");
        }

        // 2. Mettre à jour le statut de la proposition acceptée
        const { error: updatePropError } = await supabase
            .from('propositions_prix')
            .update({ statut: 'accepte' })
            .eq('id', propositionId);

        if (updatePropError) {
            console.error('Error accepting proposition:', updatePropError);
            throw new Error("Impossible d'accepter la proposition.");
        }

        // 3. Mettre à jour le prix final de la livraison
        const { error: updateLivraisonError } = await supabase
            .from('livraisons')
            .update({ prix_final: proposition.montant })
            .eq('id', proposition.livraison_id);

        if (updateLivraisonError) {
            console.error('Error updating livraison price:', updateLivraisonError);
            // Idéalement, il faudrait une transaction pour rollback la proposition acceptée
            throw new Error("Impossible de mettre à jour le prix de la livraison.");
        }

        // 4. Refuser toutes les autres propositions en attente pour cette livraison
        await supabase
            .from('propositions_prix')
            .update({ statut: 'refuse' })
            .eq('livraison_id', proposition.livraison_id)
            .eq('statut', 'en_attente');
    }

     /**
     * Refuse une proposition de prix.
     * @param propositionId - L'ID de la proposition à refuser.
     */
    async refuseProposition(propositionId: string): Promise<void> {
        const { error } = await supabase
            .from('propositions_prix')
            .update({ statut: 'refuse' })
            .eq('id', propositionId);

        if (error) {
            console.error('Error refusing proposition:', error);
            throw new Error("Impossible de refuser la proposition.");
        }
    }
}

export const priceNegotiationService = new PriceNegotiationService();
