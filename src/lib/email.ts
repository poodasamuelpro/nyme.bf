// src/lib/email.ts
// ══════════════════════════════════════════════════════════════════
// SERVICE EMAIL CENTRALISÉ — NYME
// Priorité : Brevo → Resend (fallback)
// Aucun SMS — email uniquement
// ══════════════════════════════════════════════════════════════════

export interface EmailPayload {
  to: string
  toName?: string
  subject: string
  html: string
  replyTo?: string
}

export interface EmailResult {
  sent: boolean
  provider: 'brevo' | 'resend' | 'simulation' | 'none'
  error?: string
}

// ── Envoi via Brevo (API v3) — PRIORITAIRE ────────────────────────
async function sendViaBrevo(payload: EmailPayload): Promise<EmailResult> {
  const apiKey = process.env.BREVO_API_KEY?.trim()
  if (!apiKey) return { sent: false, provider: 'none', error: 'BREVO_API_KEY manquante' }

  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim() || 'noreply@nyme.bf'
  const senderName  = process.env.BREVO_SENDER_NAME?.trim()  || 'NYME'

  try {
    const body: Record<string, unknown> = {
      sender:      { email: senderEmail, name: senderName },
      to:          [{ email: payload.to, name: payload.toName || payload.to }],
      subject:     payload.subject,
      htmlContent: payload.html,
    }
    if (payload.replyTo) {
      body.replyTo = { email: payload.replyTo }
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body:    JSON.stringify(body),
    })

    if (res.ok) {
      console.log(`[Email/Brevo] ✅ Envoyé à ${payload.to} — "${payload.subject}"`)
      return { sent: true, provider: 'brevo' }
    }

    const errData = await res.text()
    console.warn(`[Email/Brevo] ❌ ${res.status}: ${errData}`)
    return { sent: false, provider: 'brevo', error: `HTTP ${res.status}` }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn(`[Email/Brevo] ❌ Exception: ${msg}`)
    return { sent: false, provider: 'brevo', error: msg }
  }
}

// ── Envoi via Resend — FALLBACK ───────────────────────────────────
async function sendViaResend(payload: EmailPayload): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return { sent: false, provider: 'none', error: 'RESEND_API_KEY manquante' }

  // Resend exige un domaine vérifié OU utilise onboarding@resend.dev en dev
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || 'onboarding@resend.dev'
  const fromName  = process.env.RESEND_FROM_NAME?.trim()  || 'NYME'

  try {
    const body: Record<string, unknown> = {
      from:    `${fromName} <${fromEmail}>`,
      to:      payload.toName ? [`${payload.toName} <${payload.to}>`] : [payload.to],
      subject: payload.subject,
      html:    payload.html,
    }
    if (payload.replyTo) body.reply_to = payload.replyTo

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body:    JSON.stringify(body),
    })

    if (res.ok) {
      console.log(`[Email/Resend] ✅ Envoyé à ${payload.to} — "${payload.subject}"`)
      return { sent: true, provider: 'resend' }
    }

    const errData = await res.text()
    console.warn(`[Email/Resend] ❌ ${res.status}: ${errData}`)
    return { sent: false, provider: 'resend', error: `HTTP ${res.status}` }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn(`[Email/Resend] ❌ Exception: ${msg}`)
    return { sent: false, provider: 'resend', error: msg }
  }
}

// ── Fonction principale avec fallback automatique ─────────────────
/**
 * Envoie un email.
 * Ordre de priorité : Brevo → Resend → simulation (dev).
 * Ne jamais lever d'exception — retourne toujours un EmailResult.
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const hasBrevo  = !!process.env.BREVO_API_KEY?.trim()
  const hasResend = !!process.env.RESEND_API_KEY?.trim()

  // ── Aucune clé → simulation (dev) ──
  if (!hasBrevo && !hasResend) {
    console.warn('[Email] ⚠️  Aucune clé email — simulation')
    console.log('[Email] 📧 SIMULATED:', { to: payload.to, subject: payload.subject })
    return { sent: true, provider: 'simulation' }
  }

  // ── Brevo prioritaire ──
  if (hasBrevo) {
    const r = await sendViaBrevo(payload)
    if (r.sent) return r

    // Brevo a échoué → fallback Resend
    if (hasResend) {
      console.log('[Email] 🔄 Fallback Resend...')
      return sendViaResend(payload)
    }
    return r
  }

  // ── Resend uniquement ──
  return sendViaResend(payload)
}

// ── Templates HTML NYME ───────────────────────────────────────────

/** En-tête commune NYME */
function htmlHeader(title: string): string {
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
    <h2 style="color:#E87722;margin-bottom:16px;font-size:20px">${title}</h2>
  `
}

function htmlFooter(): string {
  return `
    <hr style="border:none;border-top:1px solid #ffffff15;margin:24px 0"/>
    <p style="text-align:center;color:#ffffff30;font-size:11px">
      © ${new Date().getFullYear()} NYME · nyme.contact@gmail.com · Ouagadougou, Burkina Faso
    </p>
  </div>`
}

// ── Templates spécifiques ─────────────────────────────────────────

export function buildCredentialsEmail(params: {
  nom: string
  email: string
  password: string
  loginUrl: string
  role: 'admin' | 'partenaire' | 'coursier'
  extra?: string
}): string {
  const roleLabel = params.role === 'admin' ? '🛡️ Administrateur' : params.role === 'partenaire' ? '🤝 Partenaire' : '🛵 Coursier'
  return `
  ${htmlHeader(`Bienvenue sur NYME — ${roleLabel}`)}
    <p style="color:#ffffff80;line-height:1.75;margin-bottom:20px">
      Bonjour <strong style="color:#fff">${params.nom}</strong>,<br/>
      Votre compte NYME a été créé. Voici vos identifiants de connexion :
    </p>
    <div style="background:#071e6b;border-radius:12px;padding:20px;margin-bottom:20px">
      <div style="margin-bottom:12px">
        <div style="color:#93C5FD;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Email</div>
        <div style="color:#fff;font-size:15px;font-weight:600">${params.email}</div>
      </div>
      <div>
        <div style="color:#93C5FD;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Mot de passe temporaire</div>
        <div style="color:#E87722;font-size:18px;font-weight:900;letter-spacing:2px;font-family:monospace">${params.password}</div>
      </div>
    </div>
    <div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:12px;padding:14px;margin-bottom:20px">
      <p style="color:#92400E;font-size:13px;margin:0">
        ⚠️ Changez votre mot de passe lors de votre première connexion.
      </p>
    </div>
    ${params.extra ? `<p style="color:#ffffff80;font-size:14px;margin-bottom:20px">${params.extra}</p>` : ''}
    <div style="text-align:center;margin-bottom:20px">
      <a href="${params.loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#E87722,#F59343);
              color:white;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:15px">
        Accéder à mon espace →
      </a>
    </div>
  ${htmlFooter()}`
}

export function buildOtpEmail(params: { nom: string; otp: string; expireMin?: number }): string {
  return `
  ${htmlHeader('Votre code de vérification NYME')}
    <p style="color:#ffffff80;line-height:1.75;margin-bottom:24px">
      Bonjour <strong style="color:#fff">${params.nom}</strong>,<br/>
      Voici votre code de vérification NYME. Ce code expire dans
      <strong style="color:#E87722">${params.expireMin || 10} minutes</strong>.
    </p>
    <div style="text-align:center;margin:32px 0">
      <div style="display:inline-block;background:#071e6b;border:2px solid #E87722;
                  border-radius:16px;padding:24px 48px">
        <div style="color:#ffffff60;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">Code OTP</div>
        <div style="color:#E87722;font-size:40px;font-weight:900;letter-spacing:8px;font-family:monospace">
          ${params.otp}
        </div>
      </div>
    </div>
    <p style="color:#ffffff60;font-size:13px;text-align:center">
      Si vous n'avez pas fait cette demande, ignorez cet email.
    </p>
  ${htmlFooter()}`
}

export function buildPasswordResetEmail(params: { nom: string; resetUrl: string; expireMin?: number }): string {
  return `
  ${htmlHeader('Réinitialisation de votre mot de passe')}
    <p style="color:#ffffff80;line-height:1.75;margin-bottom:24px">
      Bonjour <strong style="color:#fff">${params.nom}</strong>,<br/>
      Vous avez demandé à réinitialiser votre mot de passe NYME.<br/>
      Ce lien est valable <strong style="color:#E87722">${params.expireMin || 60} minutes</strong>.
    </p>
    <div style="text-align:center;margin:24px 0">
      <a href="${params.resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#E87722,#F59343);
              color:white;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:15px">
        Réinitialiser mon mot de passe →
      </a>
    </div>
    <p style="color:#ffffff60;font-size:13px;text-align:center">
      Si vous n'avez pas fait cette demande, ignorez cet email.<br/>
      Votre mot de passe ne sera pas modifié.
    </p>
  ${htmlFooter()}`
}

export function buildNotificationEmail(params: {
  nom: string
  titre: string
  message: string
  ctaText?: string
  ctaUrl?: string
}): string {
  return `
  ${htmlHeader(params.titre)}
    <p style="color:#ffffff80;line-height:1.75;margin-bottom:20px">
      Bonjour <strong style="color:#fff">${params.nom}</strong>,
    </p>
    <div style="background:#071e6b;border-left:4px solid #E87722;border-radius:0 12px 12px 0;padding:16px 20px;margin-bottom:20px">
      <p style="color:#F9FAFB;font-size:15px;line-height:1.7;margin:0">${params.message}</p>
    </div>
    ${params.ctaUrl && params.ctaText ? `
    <div style="text-align:center;margin:24px 0">
      <a href="${params.ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#E87722,#F59343);
              color:white;font-weight:700;padding:12px 28px;border-radius:12px;text-decoration:none">
        ${params.ctaText} →
      </a>
    </div>` : ''}
  ${htmlFooter()}`
}

export function buildContactEmail(params: {
  nom: string; email: string; sujet: string; message: string
}): string {
  return `
  ${htmlHeader('📬 Nouveau message de contact')}
    <p style="color:#ffffff60;font-size:13px;margin-bottom:20px">Reçu via le formulaire du site web NYME</p>
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="padding:12px 16px;background:#071e6b;color:#ffffff70;font-size:11px;text-transform:uppercase;letter-spacing:1px;width:90px">Nom</td>
        <td style="padding:12px 16px;background:#071e6b;color:#F9FAFB;font-weight:600">${params.nom}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;background:#0d2870;color:#ffffff70;font-size:11px;text-transform:uppercase;letter-spacing:1px">Email</td>
        <td style="padding:12px 16px;background:#0d2870">
          <a href="mailto:${params.email}" style="color:#E87722;font-weight:600;text-decoration:none">${params.email}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;background:#071e6b;color:#ffffff70;font-size:11px;text-transform:uppercase;letter-spacing:1px">Sujet</td>
        <td style="padding:12px 16px;background:#071e6b;color:#F9FAFB">${params.sujet}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:16px;background:#0d2870;border-radius:0 0 8px 8px">
          <div style="color:#ffffff60;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Message</div>
          <div style="color:#F9FAFB;line-height:1.75;font-size:14px;white-space:pre-wrap">${params.message}</div>
        </td>
      </tr>
    </table>
    <div style="margin-top:16px;padding:12px 16px;background:rgba(232,119,34,0.15);border-radius:10px;border-left:4px solid #E87722">
      <p style="color:#ffffff90;font-size:13px;margin:0">
        💡 Répondre à : <a href="mailto:${params.email}" style="color:#E87722;font-weight:700">${params.email}</a>
      </p>
    </div>
  ${htmlFooter()}`
}

export function buildPaymentEmail(params: {
  nom: string
  montant: number
  mode: string
  livraisonId: string
  statut: 'succes' | 'echec' | 'rembourse'
}): string {
  const label = params.statut === 'succes' ? '✅ Paiement confirmé' : params.statut === 'rembourse' ? '🔄 Remboursement effectué' : '❌ Échec du paiement'
  const color = params.statut === 'succes' ? '#22C55E' : params.statut === 'rembourse' ? '#3B82F6' : '#EF4444'
  return `
  ${htmlHeader(label)}
    <p style="color:#ffffff80;line-height:1.75;margin-bottom:20px">
      Bonjour <strong style="color:#fff">${params.nom}</strong>,
    </p>
    <div style="background:#071e6b;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center">
      <div style="color:#ffffff60;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Montant</div>
      <div style="color:${color};font-size:32px;font-weight:900;font-family:monospace">
        ${params.montant.toLocaleString('fr-FR')} FCFA
      </div>
      <div style="color:#ffffff60;font-size:13px;margin-top:8px">Via ${params.mode} — Livraison #${params.livraisonId.slice(0,8).toUpperCase()}</div>
    </div>
    <p style="color:#ffffff60;font-size:13px;text-align:center">
      Merci de faire confiance à NYME pour vos livraisons.
    </p>
  ${htmlFooter()}`
}