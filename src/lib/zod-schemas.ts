// src/lib/zod-schemas.ts  [NOUVEAU FICHIER]
// ══════════════════════════════════════════════════════════════════
// SCHÉMAS DE VALIDATION ZOD — NYME
// Centralise la validation des données d'entrée pour toutes les
// routes API critiques. Utilisation dans les routes :
//
//   import { schemaLivraisonCreate, validate } from '@/lib/zod-schemas'
//   const result = validate(schemaLivraisonCreate, body)
//   if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })
//   const data = result.data  // typed & validated
//
// ══════════════════════════════════════════════════════════════════
import { z } from 'zod'

// ── Helper de validation ──────────────────────────────────────────

export interface ValidationOk<T> {
  success: true
  data: T
}
export interface ValidationFail {
  success: false
  error: string
  details: z.ZodIssue[]
}
export type ValidationResult<T> = ValidationOk<T> | ValidationFail

/**
 * Valide un objet quelconque contre un schéma Zod.
 * Retourne un résultat typé (success / error) sans jamais lever d'exception.
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data:   unknown
): ValidationResult<T> {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const issues  = result.error.issues
  const message = issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
  return { success: false, error: message, details: issues }
}

// ────────────────────────────────────────────────────────────────
// 1. LIVRAISON — Création
// POST /api/client/livraisons/create
// ────────────────────────────────────────────────────────────────
export const schemaLivraisonCreate = z.object({
  client_id:            z.string().uuid('client_id doit être un UUID'),
  depart_adresse:       z.string().min(3, 'Adresse départ trop courte').max(300),
  depart_lat:           z.number().min(-90).max(90),
  depart_lng:           z.number().min(-180).max(180),
  arrivee_adresse:      z.string().min(3, 'Adresse arrivée trop courte').max(300),
  arrivee_lat:          z.number().min(-90).max(90),
  arrivee_lng:          z.number().min(-180).max(180),
  destinataire_nom:     z.string().min(2).max(100),
  destinataire_tel:     z.string().min(8).max(20),
  destinataire_whatsapp: z.string().max(20).optional().nullable(),
  destinataire_email:   z.string().email().optional().nullable(),
  instructions:         z.string().max(500).optional().nullable(),
  photos_colis:         z.array(z.string().url()).max(5).optional().nullable(),
  type:                 z.enum(['immediate', 'urgente', 'programmee']).default('immediate'),
  prix_calcule:         z.number().positive().optional(),
  programme_le:         z.string().datetime({ offset: true }).optional().nullable(),
  pour_tiers:           z.boolean().default(false),
  mode_paiement:        z.enum(['cash', 'mobile_money', 'carte', 'wallet']).default('cash'),
})

export type LivraisonCreateInput = z.infer<typeof schemaLivraisonCreate>

// ────────────────────────────────────────────────────────────────
// 2. LIVRAISON — Annulation client
// POST /api/client/livraisons/annuler
// ────────────────────────────────────────────────────────────────
export const schemaAnnulationClient = z.object({
  livraison_id: z.string().uuid('livraison_id doit être un UUID'),
  motif:        z.string().max(300).optional(),
})

export type AnnulationClientInput = z.infer<typeof schemaAnnulationClient>

// ────────────────────────────────────────────────────────────────
// 3. LIVRAISON — Annulation coursier
// POST /api/coursier/livraisons/annuler
// ────────────────────────────────────────────────────────────────
export const schemaAnnulationCoursier = z.object({
  livraison_id: z.string().uuid('livraison_id doit être un UUID'),
  motif:        z.string().max(300).optional(),
})

export type AnnulationCoursierInput = z.infer<typeof schemaAnnulationCoursier>

// ────────────────────────────────────────────────────────────────
// 4. LIVRAISON — Statut coursier
// POST /api/coursier/livraisons/statut
// ────────────────────────────────────────────────────────────────
export const schemaStatutLivraison = z.object({
  livraison_id: z.string().uuid(),
  statut:       z.enum(['en_rout_depart', 'colis_recupere', 'en_route_arrivee', 'livree']),
  note:         z.string().max(300).optional(),
  photos_preuve: z.array(z.string().url()).max(5).optional(),
})

export type StatutLivraisonInput = z.infer<typeof schemaStatutLivraison>

// ────────────────────────────────────────────────────────────────
// 5. PAIEMENT — Initiation
// POST /api/payment/initiate
// ────────────────────────────────────────────────────────────────
export const schemaPaiementInitiate = z.object({
  livraison_id:  z.string().uuid(),
  mode_paiement: z.enum(['cash', 'mobile_money', 'carte', 'wallet']),
  client_phone:  z.string().min(8).max(20).optional(),
})

export type PaiementInitiateInput = z.infer<typeof schemaPaiementInitiate>

// ────────────────────────────────────────────────────────────────
// 6. WALLET — Recharge client
// POST /api/client/wallet/recharger
// ────────────────────────────────────────────────────────────────
export const schemaWalletRecharge = z.object({
  montant:    z.number().positive().min(100, 'Minimum 100 XOF'),
  mode:       z.enum(['mobile_money', 'carte']),
  telephone:  z.string().min(8).max(20).optional(),
})

export type WalletRechargeInput = z.infer<typeof schemaWalletRecharge>

// ────────────────────────────────────────────────────────────────
// 7. RETRAIT WALLET — Coursier
// POST /api/coursier/wallet/retirer
// ────────────────────────────────────────────────────────────────
export const schemaRetraitCoursier = z.object({
  montant:         z.number().positive().min(500, 'Minimum 500 XOF').max(500_000, 'Maximum 500 000 XOF'),
  methode_retrait: z.enum(['orange_money', 'moov_money', 'wave', 'coris', 'bank']),
  numero_mobile:   z.string().min(8).max(20).optional(),
}).refine(
  data => !['orange_money', 'moov_money', 'wave', 'coris'].includes(data.methode_retrait) || !!data.numero_mobile,
  { message: 'numero_mobile requis pour le mobile money', path: ['numero_mobile'] }
)

export type RetraitCoursierInput = z.infer<typeof schemaRetraitCoursier>

// ────────────────────────────────────────────────────────────────
// 8. ADMIN — Créer admin
// POST /api/admin/create-admin
// ────────────────────────────────────────────────────────────────
export const schemaCreateAdmin = z.object({
  email: z.string().email('Email invalide'),
  nom:   z.string().min(2, 'Nom trop court').max(100),
})

export type CreateAdminInput = z.infer<typeof schemaCreateAdmin>

// ────────────────────────────────────────────────────────────────
// 9. ADMIN — Créer partenaire
// POST /api/admin/create-partenaire
// ────────────────────────────────────────────────────────────────
export const schemaCreatePartenaire = z.object({
  email:      z.string().email(),
  nom:        z.string().min(2).max(100),
  entreprise: z.string().min(2).max(200),
  telephone:  z.string().min(8).max(20),
  plan:       z.enum(['starter', 'business', 'enterprise']).default('starter'),
})

export type CreatePartenaireInput = z.infer<typeof schemaCreatePartenaire>

// ────────────────────────────────────────────────────────────────
// 10. ADMIN — Valider coursier
// POST /api/admin/valider-coursier
// ────────────────────────────────────────────────────────────────
export const schemaValiderCoursier = z.object({
  coursier_id: z.string().uuid(),
  decision:    z.enum(['verifie', 'rejete']),
  motif:       z.string().max(300).optional(),
})

export type ValiderCoursierInput = z.infer<typeof schemaValiderCoursier>

// ────────────────────────────────────────────────────────────────
// 11. ADMIN — Remboursement
// POST /api/admin/remboursements
// ────────────────────────────────────────────────────────────────
export const schemaRemboursement = z.object({
  livraison_id: z.string().uuid(),
  motif:        z.string().max(300).optional(),
  montant:      z.number().positive().optional(),
})

export type RemboursementInput = z.infer<typeof schemaRemboursement>

// ────────────────────────────────────────────────────────────────
// 12. USER — Blocage
// POST /api/user/bloquer
// ────────────────────────────────────────────────────────────────
export const schemaBlocage = z.object({
  bloque_id: z.string().uuid('bloque_id doit être un UUID'),
  motif:     z.string().max(200).optional(),
})

export type BlocageInput = z.infer<typeof schemaBlocage>

// ────────────────────────────────────────────────────────────────
// 13. USER — Mise à jour profil
// POST /api/user/update-profile
// ────────────────────────────────────────────────────────────────
export const schemaUpdateProfile = z.object({
  nom:       z.string().min(2).max(100).optional(),
  telephone: z.string().min(8).max(20).optional().nullable(),
  whatsapp:  z.string().min(8).max(20).optional().nullable(),
  fcm_token: z.string().max(500).optional().nullable(),
})

export type UpdateProfileInput = z.infer<typeof schemaUpdateProfile>

// ────────────────────────────────────────────────────────────────
// 14. POSITION — Coursier
// POST /api/coursier/position
// ────────────────────────────────────────────────────────────────
export const schemaPosition = z.object({
  lat:       z.number().min(-90).max(90),
  lng:       z.number().min(-180).max(180),
  vitesse:   z.number().min(0).max(300).optional(),
  direction: z.number().min(0).max(360).optional(),
})

export type PositionInput = z.infer<typeof schemaPosition>

// ────────────────────────────────────────────────────────────────
// 15. CONTACT — Formulaire contact
// POST /api/contact
// ────────────────────────────────────────────────────────────────
export const schemaContact = z.object({
  nom:     z.string().min(2).max(100),
  email:   z.string().email(),
  sujet:   z.string().min(3).max(200),
  message: z.string().min(10).max(2000),
})

export type ContactInput = z.infer<typeof schemaContact>