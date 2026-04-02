// src/lib/supabase-admin.ts
// ⚠️ Ne jamais importer ce fichier côté client — server-side uniquement
import { createClient } from '@supabase/supabase-js'

const URL         = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!URL || !SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante dans les variables d\'environnement')
}

// Client admin avec service_role — bypass RLS
export const supabaseAdmin = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})