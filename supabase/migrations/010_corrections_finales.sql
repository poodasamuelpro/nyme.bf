-- ══════════════════════════════════════════════════════════════════
-- NYME BF — Migration 010 : Corrections et index finaux
-- Exécuter dans Supabase SQL Editor APRÈS migrations 008 et 009
-- ══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. CORRECTION : Bug validation admin/tarifs (km_min vérif)
-- La migration ne change pas le code mais documente le fix nécessaire
-- FIX dans src/app/api/admin/tarifs/route.ts ligne 128 :
-- AVANT : if (!km_min === undefined || ...)
-- APRÈS : if (km_min === undefined || ...)
-- ─────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────
-- 2. CORRECTION : Ajout colonne 'wallet' dans mode_paiement
-- Vérifier et corriger la contrainte si nécessaire
-- ─────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Vérifier si la contrainte existe déjà avec wallet
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'livraisons_mode_paiement_check'
    AND check_clause LIKE '%wallet%'
  ) THEN
    RAISE NOTICE 'Contrainte mode_paiement déjà à jour (wallet inclus)';
  ELSE
    -- Mettre à jour la contrainte
    BEGIN
      ALTER TABLE public.livraisons
        DROP CONSTRAINT IF EXISTS livraisons_mode_paiement_check;
      ALTER TABLE public.livraisons
        ADD CONSTRAINT livraisons_mode_paiement_check
          CHECK (mode_paiement IN ('cash', 'mobile_money', 'carte', 'wallet'));
      RAISE NOTICE 'Contrainte mode_paiement mise à jour avec wallet';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erreur contrainte: %', SQLERRM;
    END;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- 3. VUES UTILITAIRES POUR ADMIN DASHBOARD
-- ─────────────────────────────────────────────────────────────────

-- Vue : Statistiques du mois courant
CREATE OR REPLACE VIEW public.v_stats_mois AS
SELECT
  COUNT(*) FILTER (WHERE statut = 'livree')         AS livraisons_livrees,
  COUNT(*) FILTER (WHERE statut = 'annulee')        AS livraisons_annulees,
  COUNT(*) FILTER (WHERE statut = 'en_attente')     AS livraisons_en_attente,
  COUNT(*)                                           AS livraisons_total,
  COALESCE(SUM(prix_final) FILTER (WHERE statut = 'livree'), 0) AS ca_total,
  COALESCE(SUM(commission_nyme) FILTER (WHERE statut = 'livree'), 0) AS commissions_total,
  DATE_TRUNC('month', NOW()) AS periode
FROM public.livraisons
WHERE created_at >= DATE_TRUNC('month', NOW());

-- Vue : Wallet résumé par utilisateur
CREATE OR REPLACE VIEW public.v_wallets_users AS
SELECT
  w.id,
  w.user_id,
  w.solde,
  w.total_gains,
  w.total_retraits,
  u.nom,
  u.email,
  u.role,
  u.est_actif
FROM public.wallets w
JOIN public.utilisateurs u ON u.id = w.user_id;

-- ─────────────────────────────────────────────────────────────────
-- 4. FONCTION : Récupérer statistiques d'un partenaire
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.stats_partenaire(p_partenaire_id UUID)
RETURNS TABLE (
  livraisons_totales    BIGINT,
  livraisons_livrees    BIGINT,
  livraisons_en_cours   BIGINT,
  ca_total              NUMERIC,
  commission_payee      NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(lp.id)                                              AS livraisons_totales,
    COUNT(lp.id) FILTER (WHERE lp.statut = 'livre')          AS livraisons_livrees,
    COUNT(lp.id) FILTER (WHERE lp.statut = 'en_cours')       AS livraisons_en_cours,
    COALESCE(SUM(lp.prix),       0)                          AS ca_total,
    COALESCE(SUM(lp.commission), 0)                          AS commission_payee
  FROM public.livraisons_partenaire lp
  WHERE lp.partenaire_id = p_partenaire_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────
-- 5. INDEX FINAUX
-- ─────────────────────────────────────────────────────────────────

-- Index pour suivi-tiers (accès token fréquent)
CREATE INDEX IF NOT EXISTS idx_livraisons_client_statut
  ON public.livraisons (client_id, statut);

CREATE INDEX IF NOT EXISTS idx_livraisons_coursier_statut
  ON public.livraisons (coursier_id, statut)
  WHERE coursier_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_lu
  ON public.notifications (user_id, lu)
  WHERE lu = FALSE;

CREATE INDEX IF NOT EXISTS idx_messages_livraison
  ON public.messages (livraison_id)
  WHERE livraison_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────
-- 6. CORRECTION TRIGGER handle_new_user
-- S'assurer que le wallet est créé automatiquement à l'inscription
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role TEXT;
  v_nom  TEXT;
  v_tel  TEXT;
BEGIN
  -- Extraire les métadonnées
  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'client'
  );

  -- Valider le rôle (jamais admin via trigger)
  IF v_role NOT IN ('client', 'coursier', 'partenaire') THEN
    v_role := 'client';
  END IF;

  v_nom := COALESCE(
    NEW.raw_user_meta_data->>'nom',
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  v_tel := NEW.raw_user_meta_data->>'telephone';

  -- Upsert utilisateurs
  INSERT INTO public.utilisateurs (
    id, nom, email, telephone, role,
    est_actif, est_verifie, created_at, updated_at
  ) VALUES (
    NEW.id, v_nom, NEW.email, v_tel, v_role,
    TRUE, FALSE, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET
      nom       = EXCLUDED.nom,
      email     = EXCLUDED.email,
      telephone = COALESCE(EXCLUDED.telephone, utilisateurs.telephone),
      -- Ne pas écraser le rôle si déjà != client (ex: partenaire créé par admin)
      role      = CASE
                    WHEN utilisateurs.role = 'client' THEN EXCLUDED.role
                    ELSE utilisateurs.role
                  END,
      updated_at = NOW();

  -- Créer le wallet automatiquement
  INSERT INTO public.wallets (user_id, solde, total_gains, total_retraits)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Créer le profil coursier si applicable
  IF v_role = 'coursier' THEN
    INSERT INTO public.coursiers (
      id, statut, statut_verification, total_courses, total_gains,
      status_validation_documents, commission_due
    ) VALUES (
      NEW.id, 'hors_ligne', 'en_attente', 0, 0, 'pending', 0
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Recréer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────
-- 7. CONTRAINTE UNIQUE SUR wallets.user_id
-- ─────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wallets_user_id_key'
  ) THEN
    ALTER TABLE public.wallets ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);
    RAISE NOTICE 'Contrainte unique wallets.user_id ajoutée';
  ELSE
    RAISE NOTICE 'Contrainte unique wallets.user_id déjà présente';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- 8. VÉRIFICATION FINALE
-- ─────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_nb_users    INTEGER;
  v_nb_wallets  INTEGER;
  v_nb_tokens   INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_nb_users    FROM public.utilisateurs;
  SELECT COUNT(*) INTO v_nb_wallets  FROM public.wallets;
  SELECT COUNT(*) INTO v_nb_tokens   FROM public.suivi_tokens;

  RAISE NOTICE '═══════════════════════════════════';
  RAISE NOTICE 'Migration 010 complète';
  RAISE NOTICE 'Utilisateurs : %', v_nb_users;
  RAISE NOTICE 'Wallets      : %', v_nb_wallets;
  RAISE NOTICE 'Tokens suivi : %', v_nb_tokens;
  RAISE NOTICE '═══════════════════════════════════';
END $$;