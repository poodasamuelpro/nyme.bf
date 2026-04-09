// src/services/payment-service.ts
// ══════════════════════════════════════════════════════════════════
// SERVICE DE PAIEMENT CENTRALISÉ — NYME
// Providers : DuniaPay (prioritaire) → Flutterwave → Orange Money (direct)
// Modes : mobile_money | carte | wallet
// ══════════════════════════════════════════════════════════════════

export type PaymentProvider = 'duniapay' | 'flutterwave' | 'orange' | 'wallet'
export type PaymentMode     = 'mobile_money' | 'carte' | 'wallet' | 'cash'
export type PaymentStatus   = 'pending' | 'success' | 'failed' | 'cancelled' | 'refunded'

export interface PaymentInitParams {
  livraisonId:  string
  montant:      number          // XOF
  mode:         PaymentMode
  clientId:     string
  clientEmail:  string
  clientPhone?: string
  clientName?:  string
  description?: string
  returnUrl?:   string
  callbackUrl?: string
}

export interface PaymentInitResult {
  success:          boolean
  provider:         PaymentProvider | null
  paymentUrl?:      string          // URL de redirection ou paiement
  transactionId?:   string          // ID interne NYME
  externalRef?:     string          // Référence externe (provider)
  error?:           string
}

export interface PaymentVerifyResult {
  success:     boolean
  status:      PaymentStatus
  provider:    PaymentProvider | null
  externalRef: string
  montant?:    number
  metadata?:   Record<string, unknown>
  error?:      string
}

// ══════════════════════════════════════════════════════════════════
// HELPER — génération référence unique
// ══════════════════════════════════════════════════════════════════
function generateRef(prefix: string, livraisonId: string): string {
  const ts   = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  const lid  = livraisonId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `${prefix}_${lid}_${ts}_${rand}`
}

// ══════════════════════════════════════════════════════════════════
// 1. DUNIAPAY
// Docs : https://developer.duniapay.net
// Variables : DUNIAPAY_API_KEY, DUNIAPAY_SECRET_KEY, DUNIAPAY_MERCHANT_ID
// ══════════════════════════════════════════════════════════════════
async function initDuniaPay(params: PaymentInitParams): Promise<PaymentInitResult> {
  const apiKey     = process.env.DUNIAPAY_API_KEY?.trim()
  const secretKey  = process.env.DUNIAPAY_SECRET_KEY?.trim()
  const merchantId = process.env.DUNIAPAY_MERCHANT_ID?.trim()
  const baseUrl    = process.env.DUNIAPAY_BASE_URL?.trim() || 'https://api.duniapay.net/v1'

  if (!apiKey || !merchantId) {
    return { success: false, provider: 'duniapay', error: 'DuniaPay non configuré (DUNIAPAY_API_KEY, DUNIAPAY_MERCHANT_ID requis)' }
  }

  const transactionId = generateRef('DP', params.livraisonId)
  const siteUrl       = process.env.NEXT_PUBLIC_SITE_URL || 'https://nyme.bf'

  try {
    // DuniaPay — initiation paiement mobile money ou carte
    const payload: Record<string, unknown> = {
      merchant_id:     merchantId,
      transaction_id:  transactionId,
      amount:          params.montant,
      currency:        'XOF',
      description:     params.description || `Livraison NYME #${params.livraisonId.slice(0, 8)}`,
      customer: {
        email: params.clientEmail,
        name:  params.clientName  || 'Client NYME',
        phone: params.clientPhone || '',
      },
      return_url:   params.returnUrl   || `${siteUrl}/client/suivi/${params.livraisonId}?payment=success`,
      cancel_url:   `${siteUrl}/client/suivi/${params.livraisonId}?payment=cancelled`,
      callback_url: params.callbackUrl || `${siteUrl}/api/payment/duniapay/callback`,
      metadata: {
        livraison_id: params.livraisonId,
        client_id:    params.clientId,
        mode:         params.mode,
      },
    }

    // Mode mobile_money → on passe le téléphone directement
    if (params.mode === 'mobile_money' && params.clientPhone) {
      payload.payment_method = 'mobile_money'
      payload.phone          = params.clientPhone
    } else {
      payload.payment_method = 'card'
    }

    const res = await fetch(`${baseUrl}/payments/initiate`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(secretKey ? { 'X-Secret-Key': secretKey } : {}),
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json() as Record<string, unknown>

    if (!res.ok || !data.success) {
      console.warn('[DuniaPay] Initiation échouée:', data)
      return {
        success: false, provider: 'duniapay',
        error:   (data.message as string) || `HTTP ${res.status}`,
      }
    }

    return {
      success:       true,
      provider:      'duniapay',
      paymentUrl:    (data.payment_url as string) || (data.redirect_url as string) || '',
      transactionId,
      externalRef:   (data.reference as string) || (data.transaction_id as string) || transactionId,
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[DuniaPay] Exception:', msg)
    return { success: false, provider: 'duniapay', error: msg }
  }
}

async function verifyDuniaPay(externalRef: string): Promise<PaymentVerifyResult> {
  const apiKey  = process.env.DUNIAPAY_API_KEY?.trim()
  const baseUrl = process.env.DUNIAPAY_BASE_URL?.trim() || 'https://api.duniapay.net/v1'

  if (!apiKey) return { success: false, status: 'failed', provider: 'duniapay', externalRef, error: 'DuniaPay non configuré' }

  try {
    const res = await fetch(`${baseUrl}/payments/${externalRef}/status`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    const data = await res.json() as Record<string, unknown>

    const status = mapStatus(data.status as string)
    return {
      success:     status === 'success',
      status,
      provider:    'duniapay',
      externalRef,
      montant:     data.amount as number,
      metadata:    data as Record<string, unknown>,
    }
  } catch (e: unknown) {
    return { success: false, status: 'failed', provider: 'duniapay', externalRef, error: String(e) }
  }
}

// ══════════════════════════════════════════════════════════════════
// 2. FLUTTERWAVE
// Docs : https://developer.flutterwave.com
// Variables : FLUTTERWAVE_SECRET_KEY, FLUTTERWAVE_PUBLIC_KEY
// ══════════════════════════════════════════════════════════════════
async function initFlutterwave(params: PaymentInitParams): Promise<PaymentInitResult> {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY?.trim()
  if (!secretKey) {
    return { success: false, provider: 'flutterwave', error: 'FLUTTERWAVE_SECRET_KEY manquante' }
  }

  const transactionId = generateRef('FW', params.livraisonId)
  const siteUrl       = process.env.NEXT_PUBLIC_SITE_URL || 'https://nyme.bf'

  try {
    const payload = {
      tx_ref:          transactionId,
      amount:          params.montant,
      currency:        'XOF',
      redirect_url:    params.returnUrl   || `${siteUrl}/api/payment/flutterwave/callback`,
      meta: {
        livraison_id: params.livraisonId,
        client_id:    params.clientId,
        mode:         params.mode,
      },
      customer: {
        email:      params.clientEmail,
        name:       params.clientName  || 'Client NYME',
        phonenumber: params.clientPhone || '',
      },
      customizations: {
        title:       'NYME — Paiement livraison',
        description: params.description || `Livraison #${params.livraisonId.slice(0, 8)}`,
        logo:        `${siteUrl}/logo.png`,
      },
      // Mobile money Burkina Faso
      ...(params.mode === 'mobile_money' && params.clientPhone ? {
        payment_options: 'mobilemoneyghana,mobilemoneyrwanda,card',
      } : {
        payment_options: 'card,mobilemoneyrwanda',
      }),
    }

    const res = await fetch('https://api.flutterwave.com/v3/payments', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${secretKey}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json() as { status: string; message: string; data?: { link: string } }

    if (data.status !== 'success' || !data.data?.link) {
      console.warn('[Flutterwave] Initiation échouée:', data.message)
      return { success: false, provider: 'flutterwave', error: data.message || 'Erreur Flutterwave' }
    }

    return {
      success:       true,
      provider:      'flutterwave',
      paymentUrl:    data.data.link,
      transactionId,
      externalRef:   transactionId,
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[Flutterwave] Exception:', msg)
    return { success: false, provider: 'flutterwave', error: msg }
  }
}

async function verifyFlutterwave(transactionId: string): Promise<PaymentVerifyResult> {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY?.trim()
  if (!secretKey) return { success: false, status: 'failed', provider: 'flutterwave', externalRef: transactionId, error: 'Non configuré' }

  try {
    // Vérification par tx_ref
    const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${transactionId}`, {
      headers: { 'Authorization': `Bearer ${secretKey}` },
    })
    const data = await res.json() as {
      status: string; message: string
      data?: { status: string; amount: number; id: number }
    }

    if (data.status !== 'success' || !data.data) {
      return { success: false, status: 'failed', provider: 'flutterwave', externalRef: transactionId, error: data.message }
    }

    const status = data.data.status === 'successful' ? 'success' : data.data.status === 'pending' ? 'pending' : 'failed'
    return {
      success:     status === 'success',
      status:      status as PaymentStatus,
      provider:    'flutterwave',
      externalRef: transactionId,
      montant:     data.data.amount,
      metadata:    data.data as unknown as Record<string, unknown>,
    }
  } catch (e: unknown) {
    return { success: false, status: 'failed', provider: 'flutterwave', externalRef: transactionId, error: String(e) }
  }
}

// ══════════════════════════════════════════════════════════════════
// 3. ORANGE MONEY DIRECT (API officielle Orange BF)
// Variables : ORANGE_API_KEY, ORANGE_MERCHANT_NUMBER, ORANGE_AUTH_HEADER
// Docs : Orange Developer Portal
// ══════════════════════════════════════════════════════════════════
async function initOrangeMoney(params: PaymentInitParams): Promise<PaymentInitResult> {
  const apiKey        = process.env.ORANGE_API_KEY?.trim()
  const merchantNum   = process.env.ORANGE_MERCHANT_NUMBER?.trim()
  const authHeader    = process.env.ORANGE_AUTH_HEADER?.trim()   // Base64 encoded
  const baseUrl       = process.env.ORANGE_BASE_URL?.trim()      || 'https://api.orange.com/orange-money-webpay/bf/v1'

  if (!apiKey && !authHeader) {
    return { success: false, provider: 'orange', error: 'Orange Money non configuré' }
  }

  const transactionId = generateRef('OM', params.livraisonId)
  const siteUrl       = process.env.NEXT_PUBLIC_SITE_URL || 'https://nyme.bf'

  try {
    // Orange Money BF — paiement via numéro de téléphone
    const headers: Record<string, string> = {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
    }

    if (authHeader) {
      headers['Authorization'] = `Basic ${authHeader}`
    } else if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    const payload = {
      merchant_key:    merchantNum || '',
      currency:        'OUV',     // Code Orange Money Burkina
      order_id:        transactionId,
      amount:          params.montant,
      return_url:      params.returnUrl   || `${siteUrl}/client/suivi/${params.livraisonId}?payment=success`,
      cancel_url:      `${siteUrl}/client/suivi/${params.livraisonId}?payment=cancelled`,
      notif_url:       params.callbackUrl || `${siteUrl}/api/payment/orange/callback`,
      lang:            'fr',
      reference:       transactionId,
    }

    const res = await fetch(`${baseUrl}/webpayment`, {
      method:  'POST',
      headers,
      body:    JSON.stringify(payload),
    })

    const data = await res.json() as Record<string, unknown>

    if (!res.ok) {
      console.warn('[Orange Money] Initiation échouée:', data)
      return {
        success: false, provider: 'orange',
        error:   (data.message as string) || `HTTP ${res.status}`,
      }
    }

    return {
      success:       true,
      provider:      'orange',
      paymentUrl:    (data.payment_url as string) || '',
      transactionId,
      externalRef:   (data.pay_token as string) || transactionId,
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[Orange Money] Exception:', msg)
    return { success: false, provider: 'orange', error: msg }
  }
}

async function verifyOrangeMoney(payToken: string): Promise<PaymentVerifyResult> {
  const apiKey  = process.env.ORANGE_API_KEY?.trim()
  const baseUrl = process.env.ORANGE_BASE_URL?.trim() || 'https://api.orange.com/orange-money-webpay/bf/v1'

  if (!apiKey) return { success: false, status: 'failed', provider: 'orange', externalRef: payToken, error: 'Non configuré' }

  try {
    const res = await fetch(`${baseUrl}/webpayment/status/${payToken}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    const data = await res.json() as Record<string, unknown>
    const status = mapStatus(data.status as string)
    return {
      success:     status === 'success',
      status,
      provider:    'orange',
      externalRef: payToken,
      metadata:    data,
    }
  } catch (e: unknown) {
    return { success: false, status: 'failed', provider: 'orange', externalRef: payToken, error: String(e) }
  }
}

// ══════════════════════════════════════════════════════════════════
// HELPER — normalisation statut
// ══════════════════════════════════════════════════════════════════
function mapStatus(raw?: string): PaymentStatus {
  if (!raw) return 'pending'
  const s = raw.toLowerCase()
  if (['success', 'successful', 'completed', 'paid', 'approved', 'succeeded'].some(v => s.includes(v))) return 'success'
  if (['fail', 'failed', 'declined', 'rejected', 'error'].some(v => s.includes(v))) return 'failed'
  if (['cancel', 'cancelled', 'abandoned'].some(v => s.includes(v))) return 'cancelled'
  if (['refund', 'rembours'].some(v => s.includes(v))) return 'refunded'
  return 'pending'
}

// ══════════════════════════════════════════════════════════════════
// CLASSE PRINCIPALE — PaymentService
// ══════════════════════════════════════════════════════════════════
class PaymentService {
  /**
   * Initie un paiement avec fallback automatique :
   * DuniaPay → Flutterwave → Orange Money
   *
   * Pour le mode 'wallet', aucune API externe n'est appelée.
   * Pour le mode 'cash', aucune API externe n'est appelée.
   */
  async initPayment(params: PaymentInitParams): Promise<PaymentInitResult> {
    // Cash ou wallet → pas d'API externe
    if (params.mode === 'cash' || params.mode === 'wallet') {
      return {
        success:       true,
        provider:      params.mode === 'wallet' ? 'wallet' : null,
        transactionId: generateRef(params.mode === 'wallet' ? 'WL' : 'CASH', params.livraisonId),
        externalRef:   generateRef(params.mode === 'wallet' ? 'WL' : 'CASH', params.livraisonId),
      }
    }

    // Essai DuniaPay
    if (process.env.DUNIAPAY_API_KEY?.trim()) {
      const r = await initDuniaPay(params)
      if (r.success) return r
      console.warn('[PaymentService] DuniaPay échoué, fallback Flutterwave')
    }

    // Fallback Flutterwave
    if (process.env.FLUTTERWAVE_SECRET_KEY?.trim()) {
      const r = await initFlutterwave(params)
      if (r.success) return r
      console.warn('[PaymentService] Flutterwave échoué, fallback Orange Money')
    }

    // Fallback Orange Money
    if (process.env.ORANGE_API_KEY?.trim() || process.env.ORANGE_AUTH_HEADER?.trim()) {
      return initOrangeMoney(params)
    }

    return {
      success:  false,
      provider: null,
      error:    'Aucun provider de paiement configuré (DuniaPay, Flutterwave, Orange). Ajoutez les clés API dans .env.',
    }
  }

  /**
   * Vérifie le statut d'un paiement externe.
   */
  async verifyPayment(provider: PaymentProvider, externalRef: string): Promise<PaymentVerifyResult> {
    switch (provider) {
      case 'duniapay':    return verifyDuniaPay(externalRef)
      case 'flutterwave': return verifyFlutterwave(externalRef)
      case 'orange':      return verifyOrangeMoney(externalRef)
      case 'wallet':
        return { success: true, status: 'success', provider: 'wallet', externalRef }
      default:
        return { success: false, status: 'failed', provider: null, externalRef, error: 'Provider inconnu' }
    }
  }

  /**
   * Liste les providers disponibles selon les variables d'environnement.
   */
  getAvailableProviders(): { provider: PaymentProvider; configured: boolean; label: string }[] {
    return [
      {
        provider:   'duniapay',
        configured: !!(process.env.DUNIAPAY_API_KEY && process.env.DUNIAPAY_MERCHANT_ID),
        label:      'DuniaPay (Mobile Money + Carte)',
      },
      {
        provider:   'flutterwave',
        configured: !!process.env.FLUTTERWAVE_SECRET_KEY,
        label:      'Flutterwave (International)',
      },
      {
        provider:   'orange',
        configured: !!(process.env.ORANGE_API_KEY || process.env.ORANGE_AUTH_HEADER),
        label:      'Orange Money BF (Direct)',
      },
      {
        provider:   'wallet',
        configured: true,
        label:      'Wallet NYME (interne)',
      },
    ]
  }

  /**
   * Vérifie la signature d'un webhook DuniaPay.
   */
  verifyDuniaPayWebhook(payload: string, signature: string): boolean {
    const secret = process.env.DUNIAPAY_WEBHOOK_SECRET?.trim()
    if (!secret) return true  // pas de vérification en dev

    try {
      const crypto = require('crypto') as typeof import('crypto')
      const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
      return expected === signature
    } catch {
      return false
    }
  }

  /**
   * Vérifie la signature d'un webhook Flutterwave.
   */
  verifyFlutterwaveWebhook(payload: string, signature: string): boolean {
    const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET?.trim() || process.env.FLUTTERWAVE_SECRET_KEY?.trim()
    if (!secret) return true

    try {
      const crypto = require('crypto') as typeof import('crypto')
      const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
      return expected === signature
    } catch {
      return false
    }
  }
}

export const paymentService = new PaymentService()