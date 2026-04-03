import { createClient } from '@supabase/supabase-js'

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!URL || !ANON) {
  throw new Error('Variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY manquantes')
}

export const supabase = createClient(URL, ANON, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
  },
})

// ── TYPES ALIGNÉS SUR LES MIGRATIONS NYME (001-006) ──────────────────

/**
 * Table: utilisateurs
 * Note: Remplace "profiles" ou "users" dans tout le code TS.
 */
export type Utilisateur = {
  id:           string
  nom:          string | null
  telephone:    string | null
  email:        string | null
  role:         'client' | 'coursier' | 'admin' | 'partenaire'
  avatar_url:   string | null
  whatsapp:     string | null
  est_verifie:  boolean
  note_moyenne: number
  est_actif:    boolean
  fcm_token:    string | null
  created_at:   string
  updated_at:   string
}

/**
 * Table: livraisons (Standard App Mobile)
 * ATTENTION : Les noms ici doivent matcher exactement la Migration 006
 */
export type Livraison = {
  id:                string
  client_id:         string
  coursier_id:       string | null
  statut:            'en_attente' | 'acceptee' | 'en_rout_depart' | 'colis_recupere' | 'en_route_arrivee' | 'livree' | 'annulee'
  // Noms exacts de la Migration 006
  depart_adresse:    string
  depart_lat:        number 
  depart_lng:        number
  arrivee_adresse:   string
  arrivee_lat:       number
  arrivee_lng:       number
  // Paiement et Prix
  prix_calcule:      number
  prix_final:        number | null
  statut_paiement:   'en_attente' | 'paye' | 'rembourse'
  destinataire_nom:  string
  destinataire_tel:  string
  created_at:        string
  updated_at:        string
}

/**
 * Table: partenaires (Dashboard Web)
 */
export type PartenaireRow = {
  id:               string
  user_id:          string
  entreprise:       string
  nom_contact:      string
  telephone:        string | null
  email_pro:        string | null
  adresse:          string | null
  plan:             'starter' | 'business' | 'enterprise'
  statut:           'actif' | 'suspendu' | 'en_attente' | 'rejete'
  livraisons_max:   number
  livraisons_mois:  number
  date_debut:       string
  date_fin:         string | null
  taux_commission:  number
  created_at:       string
  updated_at:       string
}

/**
 * Table: livraisons_partenaire (Dashboard Web)
 * Note: Ici les colonnes sont restées en lat_depart (Migration 004)
 */
export type LivraisonPartenaireRow = {
  id:               string
  partenaire_id:    string
  adresse_depart:   string
  adresse_arrivee:  string
  lat_depart:       number | null
  lng_depart:       number | null
  lat_arrivee:      number | null
  lng_arrivee:      number | null
  destinataire_nom: string | null
  destinataire_tel: string | null
  instructions:     string | null
  statut:           'en_attente' | 'en_cours' | 'livre' | 'annule'
  prix:             number | null
  commission:       number | null
  coursier_id:      string | null
  livraison_app_id: string | null
  created_at:       string
  updated_at:       string
}

export interface PropositionPrix {
  id: string
  livraison_id: string
  auteur_id: string
  role_auteur: 'client' | 'coursier'
  montant: number
  statut: 'en_attente' | 'accepte' | 'refuse'
  created_at: string
}

// ── HELPERS SYNC SUR LA TABLE 'utilisateurs' ───────────────────────

/**
 * Récupérer le profil depuis la table 'utilisateurs'
 */
export async function getUtilisateur(userId: string): Promise<Utilisateur | null> {
  const { data, error } = await supabase
    .from('utilisateurs')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null
  return data
}

export async function getPartenaire(userId: string): Promise<PartenaireRow | null> {
  const { data, error } = await supabase
    .from('partenaires')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) { console.error('[supabase] getPartenaire:', error.message); return null }
  return data
}

export async function getLivraisonsPartenaire(
  partenaireId: string, limit = 100
): Promise<LivraisonPartenaireRow[]> {
  const { data, error } = await supabase
    .from('livraisons_partenaire')
    .select('*')
    .eq('partenaire_id', partenaireId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) { console.error('[supabase] getLivraisons:', error.message); return [] }
  return data || []
}
