// src/app/api/contact/route.ts
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const EMAIL_TO = 'contact@nyme.app'
const EMAIL_FROM = 'NYME <noreply@nyme.app>'

// Templates HTML (inchangés)
const getAdminEmailHTML = (nom: string, email: string, sujet: string, message: string) => `
  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0A0F1E;color:#F9FAFB;padding:32px;border-radius:16px">
    <div style="text-align:center;margin-bottom:24px">
      <div style="display:inline-block;background:linear-gradient(135deg,#F97316,#DC2626);padding:10px 20px;border-radius:12px">
        <span style="color:white;font-weight:800;font-size:20px;letter-spacing:2px">NYME</span>
      </div>
    </div>
    <h2 style="color:#F97316;margin-bottom:8px">Nouveau message de contact</h2>
    <p style="color:#9CA3AF;font-size:14px;margin-bottom:24px">Reçu via le formulaire du site web</p>

    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="padding:12px;background:#111827;border-radius:8px 8px 0 0;color:#9CA3AF;font-size:12px;text-transform:uppercase;letter-spacing:1px">Nom</td>
        <td style="padding:12px;background:#111827;border-radius:8px 8px 0 0;color:#F9FAFB;font-weight:600">${nom}</td>
      </tr>
      <tr>
        <td style="padding:12px;background:#1F2937;color:#9CA3AF;font-size:12px;text-transform:uppercase;letter-spacing:1px">Email</td>
        <td style="padding:12px;background:#1F2937;color:#F97316">${email}</td>
      </tr>
      <tr>
        <td style="padding:12px;background:#111827;color:#9CA3AF;font-size:12px;text-transform:uppercase;letter-spacing:1px">Sujet</td>
        <td style="padding:12px;background:#111827;color:#F9FAFB">${sujet}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:16px;background:#1F2937;border-radius:0 0 8px 8px">
          <div style="color:#9CA3AF;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Message</div>
          <div style="color:#F9FAFB;line-height:1.6;white-space:pre-wrap">${message}</div>
        </td>
      </tr>
    </table>

    <div style="margin-top:24px;padding:16px;background:#0F3460;border-radius:12px;border-left:4px solid #F97316">
      <p style="color:#9CA3AF;font-size:12px;margin:0">
        Pour répondre, utilisez directement cet email : 
        <a href="mailto:${email}" style="color:#F97316">${email}</a>
      </p>
    </div>

    <p style="text-align:center;color:#4B5563;font-size:11px;margin-top:24px">
      © ${new Date().getFullYear()} NYME · Ouagadougou, Burkina Faso
    </p>
  </div>
`

const getUserEmailHTML = (nom: string, sujet: string, message: string) => `
  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0A0F1E;color:#F9FAFB;padding:32px;border-radius:16px">
    <div style="text-align:center;margin-bottom:24px">
      <div style="display:inline-block;background:linear-gradient(135deg,#F97316,#DC2626);padding:10px 20px;border-radius:12px">
        <span style="color:white;font-weight:800;font-size:20px;letter-spacing:2px">NYME</span>
      </div>
    </div>
    <h2 style="color:#F9FAFB">Bonjour ${nom} 👋</h2>
    <p style="color:#9CA3AF;line-height:1.7">
      Nous avons bien reçu votre message concernant <strong style="color:#F97316">${sujet}</strong>.<br/>
      Notre équipe vous répondra dans les <strong style="color:#F9FAFB">24 heures</strong>.
    </p>
    <div style="margin:24px 0;padding:16px;background:#111827;border-radius:12px;border-left:4px solid #1A6EBF">
      <p style="color:#6B7280;font-size:12px;margin:0 0 8px">Votre message :</p>
      <p style="color:#D1D5DB;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap">${message}</p>
    </div>
    <p style="color:#9CA3AF;font-size:14px">
      Si votre demande est urgente, vous pouvez nous appeler directement au 
      <a href="tel:+22600000000" style="color:#F97316">+226 00 00 00 00</a>
    </p>
    <hr style="border:none;border-top:1px solid #1F2937;margin:24px 0"/>
    <p style="text-align:center;color:#4B5563;font-size:11px">
      © ${new Date().getFullYear()} NYME · Livraison Rapide & Intelligente · Ouagadougou, Burkina Faso
    </p>
  </div>
`

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { nom, email, sujet, message } = body

    // Validation
    if (!nom || !email || !sujet || !message) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis.' },
        { status: 400 }
      )
    }

    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Adresse email invalide.' },
        { status: 400 }
      )
    }

    // Vérifier que Resend est configuré (sinon mode simulation)
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY non configurée - Mode simulation')
      return NextResponse.json(
        { 
          success: true, 
          warning: 'Mode simulation - Aucun email envoyé',
          message: 'Votre message a bien été enregistré.'
        },
        { status: 200 }
      )
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const adminHtml = getAdminEmailHTML(nom, email, sujet, message)
    const userHtml = getUserEmailHTML(nom, sujet, message)

    // Envoi des deux emails en parallèle
    await Promise.all([
      resend.emails.send({
        from: EMAIL_FROM,
        to: EMAIL_TO,
        replyTo: email,
        subject: `[NYME Contact] ${sujet} — ${nom}`,
        html: adminHtml,
      }),
      resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: `✅ Message reçu — NYME vous répondra sous 24h`,
        html: userHtml,
      })
    ])

    return NextResponse.json(
      { 
        success: true, 
        message: 'Votre message a bien été envoyé.'
      },
      { status: 200 }
    )

  } catch (err: any) {
    console.error('Erreur envoi email:', err)

    return NextResponse.json(
      { 
        error: 'Erreur lors de l\'envoi du message', 
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      },
      { status: 500 }
    )
  }
}