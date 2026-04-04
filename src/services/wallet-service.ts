// src/services/wallet-service.ts
import { supabase } from "@/lib/supabase"
import type { Wallet, TransactionWallet } from "@/lib/supabase"

// Re-export des types du fichier supabase pour la cohérence
export type { Wallet as WalletData }

// Type transaction aligné sur les colonnes réelles de transactions_wallet
export type TransactionData = TransactionWallet

class WalletService {
  /**
   * Récupère le wallet d'un utilisateur.
   * Table wallets : id, user_id, solde, total_gains, total_retraits, created_at, updated_at
   */
  async getWallet(userId: string): Promise<Wallet | null> {
    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single()
    if (error && error.code !== "PGRST116") throw new Error("Impossible de récupérer le portefeuille.")
    return data as Wallet | null
  }

  /**
   * Crée un wallet vide pour un utilisateur.
   */
  async createWallet(userId: string): Promise<Wallet> {
    const { data, error } = await supabase
      .from("wallets")
      .insert({ user_id: userId, solde: 0, total_gains: 0, total_retraits: 0 })
      .select()
      .single()
    if (error) throw new Error("Impossible de créer le portefeuille.")
    return data as Wallet
  }

  /**
   * Recharge via RPC Supabase.
   * La fonction SQL gère l'insertion dans transactions_wallet avec solde_avant/solde_apres.
   */
  async rechargeWallet(userId: string, montant: number, type: string, reference: string): Promise<Wallet> {
    const { data, error } = await supabase.rpc("recharge_wallet", {
      p_user_id:    userId,
      p_montant:    montant,
      p_type:       type,
      p_note:       `Recharge de ${montant} XOF`,
      p_reference:  reference,
    })
    if (error) throw new Error("Impossible de recharger le portefeuille.")
    return data as Wallet
  }

  /**
   * Débit via RPC Supabase.
   */
  async debitWallet(userId: string, montant: number, type: string, reference: string): Promise<Wallet> {
    const { data, error } = await supabase.rpc("debit_wallet", {
      p_user_id:   userId,
      p_montant:   montant,
      p_type:      type,
      p_note:      `Paiement de ${montant} XOF`,
      p_reference: reference,
    })
    if (error) throw new Error("Impossible de débiter le portefeuille.")
    return data as Wallet
  }

  /**
   * Récupère les transactions d'un utilisateur.
   * Table transactions_wallet : id, user_id, type, montant, solde_avant, solde_apres,
   *   livraison_id, reference, note, created_at, status, payment_method, idempotency_key, updated_at
   * ⚠ Filtre par user_id (pas wallet_id — il n'y a pas de colonne wallet_id dans la table)
   */
  async getTransactions(userId: string): Promise<TransactionData[]> {
    const { data, error } = await supabase
      .from("transactions_wallet")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    if (error) throw new Error("Impossible de récupérer les transactions.")
    return (data || []) as TransactionData[]
  }

  /**
   * Vérifie si une référence de transaction existe déjà (idempotence).
   * Utilise la colonne "reference" de transactions_wallet.
   */
  async checkTransactionReference(reference: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("transactions_wallet")
      .select("id")
      .eq("reference", reference)
      .single()
    if (error && error.code !== "PGRST116") throw new Error("Erreur vérification référence.")
    return !!data
  }

  /**
   * Vérifie l'idempotency_key (uuid unique dans transactions_wallet).
   */
  async checkIdempotencyKey(key: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("transactions_wallet")
      .select("id")
      .eq("idempotency_key", key)
      .single()
    if (error && error.code !== "PGRST116") throw new Error("Erreur vérification idempotency_key.")
    return !!data
  }
}

export const walletService = new WalletService()
