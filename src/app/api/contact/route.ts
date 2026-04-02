// src/app/api/contact/route.ts
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════
const EMAIL_TO   = 'nyme.contact@gmail.com'
const FROM_NAME  = 'NYME — Formulaire de contact'
// Resend exige un domaine vérifié OU utilise onboarding@resend.dev en test
// Brevo peut envoyer depuis Gmail sans domaine vérifié
const RESEND_FROM = 'NYME <onboarding@resend.dev>'
const BREVO_FROM  = 'nyme.contact@gmail.com'

// ═══════════════════════════════════════════════════════════
//  TEMPLATES HTML
// ═══════════════════════════════════════════════════════════
function adminHTML(nom: string, email: string, sujet: string, message: string) {
  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;
              background:#0A2E8A;color:#F9FAFB;padding:32px;border-radius:16px">
    <div style="text-align:center;margin-bottom:28px">
      <div style="display:inline-block;background:linear-gradient(135deg,#E87722,#d4691a);
                  padding:10px 28px;border-radius:12px">
        <span style="color:#fff;font-weight:800;font-size:22px;letter-spacing:3px">NYME</span>
      </div>
      <p style="color:#ffffff60;font-size:11px;margin-top:6px;letter-spacing:2px;
                text-transform:uppercase">Livraison Intelligente · Ouagadougou</p>
    </div>

    <h2 style="color:#E87722;margin-bottom:4px;font-size:20px">📬 Nouveau message de contact</h2>
    <p style="color:#ffffff60;font-size:13px;margin-bottom:24px">
      Reçu via le formulaire du site web NYME
    </p>

    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="padding:12px 16px;background:#071e6b;color:#ffffff70;font-size:11px;
                   text-transform:uppercase;letter-spacing:1px;width:90px">Nom</td>
        <td style="padding:12px 16px;background:#071e6b;color:#F9FAFB;font-weight:600">${nom}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;background:#0d2870;color:#ffffff70;font-size:11px;
                   text-transform:uppercase;letter-spacing:1px">Email</td>
        <td style="padding:12px 16px;background:#0d2870">
          <a href="mailto:${email}" style="color:#E87722;font-weight:600;text-decoration:none">
            ${email}
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;background:#071e6b;color:#ffffff70;font-size:11px;
                   text-transform:uppercase;letter-spacing:1px">Sujet</td>
        <td style="padding:12px 16px;background:#071e6b;color:#F9FAFB">${sujet}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:16px;background:#0d2870;border-radius:0 0 8px 8px">
          <div style="color:#ffffff60;font-size:11px;text-transform:uppercase;
                      letter-spacing:1px;margin-bottom:10px">Message</div>
          <div style="color:#F9FAFB;line-height:1.75;font-size:14px;
                      white-space:pre-wrap">${message}</div>
        </td>
      </tr>
    </table>

    <div style="margin-top:20px;padding:14px 18px;background:rgba(232,119,34,0.15);
                border-radius:10px;border-left:4px solid #E87722">
      <p style="color:#ffffff90;font-size:13px;margin:0">
        💡 Répondre à :
        <a href="mailto:${email}" style="color:#E87722;font-weight:700">${email}</a>
      </p>
    </div>

    <p style="text-align:center;color:#ffffff30;font-size:11px;margin-top:28px">
      © ${new Date().getFullYear()} NYME · nyme.contact@gmail.com · Ouagadougou, Burkina Faso
    </p>
  </div>`
}

function confirmHTML(nom: string, sujet: string, message: string) {
  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;
              background:#0A2E8A;color:#F9FAFB;padding:32px;border-radius:16px">
    <div style="text-align:center;margin-bottom:28px">
      <div style="display:inline-block;background:linear-gradient(135deg,#E87722,#d4691a);
                  padding:10px 28px;border-radius:12px">
        <span style="color:#fff;font-weight:800;font-size:22px;letter-spacing:3px">NYME</span>
      </div>
      <p style="color:#ffffff60;font-size:11px;margin-top:6px;letter-spacing:2px;
                text-transform:uppercase">Livraison Intelligente · Ouagadougou</p>
    </div>

    <h2 style="color:#F9FAFB;font-size:22px;margin-bottom:10px">Bonjour ${nom} 👋</h2>
    <p style="color:#ffffff80;line-height:1.75;font-size:14px;margin-bottom:20px">
      Nous avons bien reçu votre message concernant
      <strong style="color:#E87722">"${sujet}"</strong>.<br/>
      L'équipe NYME vous répondra dans les
      <strong style="color:#fff">24 heures</strong>.
    </p>

    <div style="margin-bottom:20px;padding:16px 20px;background:#071e6b;
                border-radius:12px;border-left:4px solid #1A4FBF">
      <p style="color:#ffffff50;font-size:11px;text-transform:uppercase;
                letter-spacing:1px;margin:0 0 10px">Votre message :</p>
      <p style="color:#D1D5DB;font-size:14px;line-height:1.75;
                margin:0;white-space:pre-wrap">${message}</p>
    </div>

    <div style="padding:16px 20px;background:rgba(232,119,34,0.12);
                border-radius:12px;margin-bottom:24px">
      <p style="color:#ffffff80;font-size:13px;margin:0 0 6px;font-weight:600">
        Demande urgente ?
      </p>
      <p style="color:#ffffff70;font-size:13px;margin:0">
        📧 <a href="mailto:nyme.contact@gmail.com"
              style="color:#E87722;font-weight:600">nyme.contact@gmail.com</a><br/>
        📞 <a href="tel:+22600000000"
              style="color:#E87722;font-weight:600">+226 00 00 00 00</a>
      </p>
    </div>

    <hr style="border:none;border-top:1px solid #ffffff15;margin:0 0 20px"/>
    <p style="text-align:center;color:#ffffff30;font-size:11px">
      © ${new Date().getFullYear()} NYME · Livraison Rapide & Intelligente · Ouagadougou, Burkina Faso
    </p>
  </div>`
}

// ═══════════════════════════════════════════════════════════
//  FOURNISSEURS D'EMAIL
// ═══════════════════════════════════════════════════════════

/**
 * Envoi via Resend
 * Retourne true si succès, false si échec
 */
async function sendViaResend(
  resendKey: string,
  toEmail: string,
  toName: string,
  replyTo: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from:     RESEND_FROM,
        to:       [`${toName} <${toEmail}>`],
        reply_to: replyTo,
        subject,
        html,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.warn(`⚠️  Resend échec (${res.status}): ${err}`)
      return false
    }
    console.log('✅ Email envoyé via Resend')
    return true
  } catch (e: any) {
    console.warn('⚠️  Resend exception:', e.message)
    return false
  }
}

/**
 * Envoi via Brevo
 * Retourne true si succès, false si échec
 */
async function sendViaBrevo(
  brevoKey: string,
  toEmail: string,
  toName: string,
  replyTo: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': brevoKey,
      },
      body: JSON.stringify({
        sender:      { name: FROM_NAME, email: BREVO_FROM },
        to:          [{ email: toEmail, name: toName }],
        replyTo:     { email: replyTo },
        subject,
        htmlContent: html,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.warn(`⚠️  Brevo échec (${res.status}): ${err}`)
      return false
    }
    console.log('✅ Email envoyé via Brevo')
    return true
  } catch (e: any) {
    console.warn('⚠️  Brevo exception:', e.message)
    return false
  }
}

/**
 * Logique principale d'envoi avec fallback automatique :
 *
 * - Resend + Brevo configurés → essaie Resend en premier, si échec → Brevo
 * - Resend uniquement          → utilise Resend
 * - Brevo uniquement           → utilise Brevo
 * - Aucun                      → mode simulation (log console)
 *
 * Retourne true si au moins un fournisseur a réussi
 */
async function sendEmail(
  toEmail: string,
  toName: string,
  replyTo: string,
  subject: string,
  html: string
): Promise<{ sent: boolean; provider: string }> {
  const resendKey = process.env.RESEND_API_KEY?.trim()
  const brevoKey  = process.env.BREVO_API_KEY?.trim()

  // ── Aucune clé configurée → simulation ──
  if (!resendKey && !brevoKey) {
    console.warn('⚠️  Aucune clé email configurée — mode simulation')
    console.log('📧', { to: toEmail, subject })
    return { sent: true, provider: 'simulation' }
  }

  // ── Resend prioritaire (seul ou les deux configurés) ──
  if (resendKey) {
    const ok = await sendViaResend(resendKey, toEmail, toName, replyTo, subject, html)
    if (ok) return { sent: true, provider: 'resend' }

    // Resend a échoué → fallback Brevo si disponible
    if (brevoKey) {
      console.log('🔄 Fallback vers Brevo...')
      const ok2 = await sendViaBrevo(brevoKey, toEmail, toName, replyTo, subject, html)
      if (ok2) return { sent: true, provider: 'brevo (fallback)' }
    }

    return { sent: false, provider: 'aucun' }
  }

  // ── Brevo uniquement ──
  if (brevoKey) {
    const ok = await sendViaBrevo(brevoKey, toEmail, toName, replyTo, subject, html)
    return { sent: ok, provider: ok ? 'brevo' : 'aucun' }
  }

  return { sent: false, provider: 'aucun' }
}

// ═══════════════════════════════════════════════════════════
//  ROUTE POST
// ═══════════════════════════════════════════════════════════
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { nom, email, sujet, message } = body

    // ── Validation ──
    if (!nom?.trim() || !email?.trim() || !sujet?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis.' },
        { status: 400 }
      )
    }
    if (!email.includes('@') || !email.includes('.')) {
      return NextResponse.json(
        { error: 'Adresse email invalide.' },
        { status: 400 }
      )
    }

    // ── Email vers l'équipe NYME (obligatoire) ──
    const adminResult = await sendEmail(
      EMAIL_TO,
      'Équipe NYME',
      email,
      `[NYME Contact] ${sujet} — ${nom}`,
      adminHTML(nom, email, sujet, message)
    )

    if (!adminResult.sent) {
      console.error('❌ Impossible d\'envoyer l\'email admin via tous les fournisseurs')
      return NextResponse.json(
        {
          error:
            'Erreur lors de l\'envoi. Contactez-nous directement à nyme.contact@gmail.com',
        },
        { status: 500 }
      )
    }

    console.log(`📨 Email admin envoyé via ${adminResult.provider}`)

    // ── Email de confirmation à l'utilisateur (non bloquant) ──
    sendEmail(
      email,
      nom,
      EMAIL_TO,
      '✅ Votre message a bien été reçu — NYME',
      confirmHTML(nom, sujet, message)
    ).then(r => {
      console.log(`📨 Confirmation utilisateur via ${r.provider}`)
    }).catch(e => {
      console.warn('⚠️  Confirmation utilisateur non envoyée:', e.message)
    })

    return NextResponse.json(
      { success: true, message: 'Votre message a bien été envoyé.' },
      { status: 200 }
    )

  } catch (err: any) {
    console.error('❌ Erreur route contact:', err)
    return NextResponse.json(
      {
        error:
          'Erreur inattendue. Contactez-nous directement à nyme.contact@gmail.com',
        details:
          process.env.NODE_ENV === 'development' ? err.message : undefined,
      },
      { status: 500 }
    )
  }
}
