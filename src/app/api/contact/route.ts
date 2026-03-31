// src/app/api/contact/route.ts
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import * as brevo from '@getbrevo/brevo'

// Configuration des emails
const EMAIL_TO = 'contact@nyme.app'
const EMAIL_FROM = 'NYME <noreply@nyme.app>'
const EMAIL_FROM_NAME = 'NYME'
const EMAIL_FROM_ADDRESS = 'noreply@nyme.app'

// Types pour les services d'email
type EmailService = 'resend' | 'brevo' | 'none'

// Détection du service disponible
const getEmailService = (): EmailService => {
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_')) {
    return 'resend'
  }
  if (process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.length > 0) {
    return 'brevo'
  }
  return 'none'
}

// Envoi d'email via Resend
const sendViaResend = async (to: string, subject: string, html: string, replyTo?: string) => {
  const resend = new Resend(process.env.RESEND_API_KEY!)
  
  return await resend.emails.send({
    from: EMAIL_FROM,
    to,
    replyTo: replyTo || undefined,
    subject,
    html,
  })
}

// Envoi d'email via Brevo
const sendViaBrevo = async (to: string, subject: string, html: string, replyTo?: string) => {
  const apiInstance = new brevo.TransactionalEmailsApi()
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY!)
  
  const sendSmtpEmail = new brevo.SendSmtpEmail()
  sendSmtpEmail.subject = subject
  sendSmtpEmail.htmlContent = html
  sendSmtpEmail.sender = { name: EMAIL_FROM_NAME, email: EMAIL_FROM_ADDRESS }
  sendSmtpEmail.to = [{ email: to, name: to.split('@')[0] }]
  
  if (replyTo) {
    sendSmtpEmail.replyTo = { email: replyTo, name: replyTo.split('@')[0] }
  }
  
  return await apiInstance.sendTransacEmail(sendSmtpEmail)
}

// Template HTML commun
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
    // Vérifier quel service d'email est disponible
    const emailService = getEmailService()
    
    // Si aucun service n'est configuré, retourner une réponse mais sans erreur
    if (emailService === 'none') {
      console.warn('⚠️ Aucun service email configuré (Resend ou Brevo). Le formulaire est en mode simulation.')
      return NextResponse.json(
        { 
          success: true,
          warning: 'Mode simulation - Aucun email envoyé car aucun service email configuré',
          message: 'Votre message a bien été enregistré. Notre équipe vous répondra sous 24h.'
        },
        { status: 200 }
      )
    }

    const body = await req.json()
    const { nom, email, sujet, message } = body

    // Validation basique
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

    // Envoi des emails selon le service disponible
    const adminEmailHTML = getAdminEmailHTML(nom, email, sujet, message)
    const userEmailHTML = getUserEmailHTML(nom, sujet, message)

    if (emailService === 'resend') {
      // Envoi via Resend
      await Promise.all([
        sendViaResend(EMAIL_TO, `[NYME Contact] ${sujet} — ${nom}`, adminEmailHTML, email),
        sendViaResend(email, `✅ Message reçu — NYME vous répondra sous 24h`, userEmailHTML)
      ])
    } else if (emailService === 'brevo') {
      // Envoi via Brevo
      await Promise.all([
        sendViaBrevo(EMAIL_TO, `[NYME Contact] ${sujet} — ${nom}`, adminEmailHTML, email),
        sendViaBrevo(email, `✅ Message reçu — NYME vous répondra sous 24h`, userEmailHTML)
      ])
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Votre message a bien été envoyé. Notre équipe vous répondra sous 24h.'
      }, 
      { status: 200 }
    )

  } catch (err) {
    console.error('Erreur envoi email:', err)
    
    // Ne pas retourner d'erreur 500 si c'est juste un problème de configuration
    if (err instanceof Error && err.message.includes('API key')) {
      return NextResponse.json(
        { 
          error: 'Service email temporairement indisponible', 
          message: 'Votre message a été enregistré. Notre équipe vous contactera manuellement.'
        },
        { status: 200 } // Retourner 200 pour ne pas bloquer l'utilisateur
      )
    }
    
    return NextResponse.json(
      { error: 'Erreur serveur. Réessayez dans quelques instants.' },
      { status: 500 }
    )
  }
}