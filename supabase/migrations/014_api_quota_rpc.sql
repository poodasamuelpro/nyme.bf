-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 014 — FONCTION RPC increment_api_quota
-- Complète la migration 009 qui a créé la table api_quota_tracking.
-- Fournit un upsert atomique pour incrémenter les compteurs d'usage API.
-- Route d'enregistrement : supabase/migrations/014_api_quota_rpc.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Fonction RPC atomique pour incrémenter le quota API
-- Utilisée par map-service.ts — évite les race conditions en serverless
CREATE OR REPLACE FUNCTION public.increment_api_quota(
  p_provider  TEXT,
  p_annee     INTEGER,
  p_mois      INTEGER,
  p_limite    INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.api_quota_tracking (provider, annee, mois, nb_requetes, limite, updated_at)
  VALUES (p_provider, p_annee, p_mois, 1, p_limite, NOW())
  ON CONFLICT (provider, annee, mois)
  DO UPDATE SET
    nb_requetes = api_quota_tracking.nb_requetes + 1,
    updated_at  = NOW(),
    limite      = COALESCE(p_limite, api_quota_tracking.limite);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- S'assurer que la contrainte unique (provider, annee, mois) existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'api_quota_tracking_provider_annee_mois_key'
      AND conrelid = 'public.api_quota_tracking'::regclass
  ) THEN
    ALTER TABLE public.api_quota_tracking
      ADD CONSTRAINT api_quota_tracking_provider_annee_mois_key
      UNIQUE (provider, annee, mois);
  END IF;
END $$;

-- Index pour la lecture mensuelle des quotas
CREATE INDEX IF NOT EXISTS idx_api_quota_tracking_period
  ON public.api_quota_tracking(annee, mois, provider);

-- Vue de monitoring des quotas (pour le dashboard admin)
CREATE OR REPLACE VIEW public.v_api_quota_current_month AS
SELECT
  provider,
  nb_requetes,
  limite,
  CASE
    WHEN limite IS NULL OR limite = 0 THEN 0
    ELSE ROUND((nb_requetes::NUMERIC / limite) * 100, 1)
  END AS usage_pct,
  CASE
    WHEN limite IS NOT NULL AND nb_requetes >= limite THEN '🔴 Quota atteint'
    WHEN limite IS NOT NULL AND nb_requetes >= (limite * 0.8) THEN '🟡 Proche limite'
    ELSE '🟢 Normal'
  END AS statut,
  updated_at
FROM public.api_quota_tracking
WHERE annee  = EXTRACT(YEAR FROM NOW())::INTEGER
  AND mois   = EXTRACT(MONTH FROM NOW())::INTEGER
ORDER BY provider;

COMMENT ON FUNCTION public.increment_api_quota IS
  'Incrémente atomiquement le compteur API dans api_quota_tracking. 
   Crée la ligne du mois si elle n''existe pas (upsert).
   Utilisée par map-service.ts pour persister les quotas au lieu de les garder en mémoire.';