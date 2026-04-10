// src/app/api/admin/create-admin/route.ts
// Crée un compte administrateur avec mot de passe auto-généré
// Envoie les credentials par email via email.ts centralisé
// CORRECTION AUDIT :
//   1. verifyAdmin inline → verifyAdminRole (middleware centralisé)
//   2. Resend SDK inline → sendEmail + buildCredentialsEmail depuis email.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyAdminRole } from '@/lib/auth-middleware'
import { sendEmail, buildCredentialsEmail } from '@/lib/email'

function genPassword(length = 14): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Vérification admin centralisée ──────────────────────────
    const auth = await verifyAdminRole(req)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

    // ── 2. Parser le body ──────────────────────────────────────────
    const { email, nom } = await req.json()
    if (!email || !nom) {
      return NextResponse.json({ error: 'email et nom sont requis' }, { status: 400 })
    }

    const mdpAuto  = genPassword(14)
    const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL || 'https://nyme.bf'
    const loginUrl = `${siteUrl}/admin-x9k2m/login`

    // ── 3. Créer le compte Auth ────────────────────────────────────
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email:         email.trim().toLowerCase(),
      password:      mdpAuto,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        nom:  nom.trim(),
      },
    })

    if (authErr) {
      return NextResponse.json({ error: `Erreur Auth: ${authErr.message}` }, { status: 400 })
    }

    const userId = authData.user.id

    // ── 4. Insérer dans utilisateurs avec rôle admin ───────────────
    const { error: userErr } = await supabaseAdmin
      .from('utilisateurs')
      .upsert({
        id:          userId,
        nom:         nom.trim(),
        email:       email.trim().toLowerCase(),
        role:        'admin',
        est_verifie: true,
        est_actif:   true,
        created_at:  new Date().toISOString(),
        updated_at:  new Date().toISOString(),
      }, { onConflict: 'id' })

    if (userErr) {
      console.warn('[create-admin] upsert utilisateurs:', userErr.message)
    }

    // ── 5. Envoyer l'email via service centralisé email.ts ─────────
    const emailResult = await sendEmail({
      to:      email.trim().toLowerCase(),
      toName:  nom.trim(),
      subject: '🛡️ Vos accès NYME Administrateur',
      html:    buildCredentialsEmail({
        nom:      nom.trim(),
        email:    email.trim().toLowerCase(),
        password: mdpAuto,
        loginUrl,
        role:     'admin',
      }),
    })

    return NextResponse.json({
      success:    true,
      message:    `✅ Compte admin créé pour ${nom}. Email ${emailResult.sent ? `envoyé via ${emailResult.provider}` : 'non envoyé (configurer BREVO_API_KEY ou RESEND_API_KEY)'}.`,
      user_id:    userId,
      email_sent: emailResult.sent,
      provider:   emailResult.provider,
    }, { status: 201 })

  } catch (err: unknown) {
    console.error('[admin/create-admin]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}