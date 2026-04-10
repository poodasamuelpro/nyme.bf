// src/app/api/calls/turn-credentials/route.ts — NOUVEAU FICHIER
// ═══════════════════════════════════════════════════════════════════════════
// CLOUDFLARE CALLS TURN SERVER — Génération de credentials dynamiques
//
// Ce endpoint génère des credentials TURN de courte durée via l'API
// Cloudflare Calls TURN Service.
//
// Cloudflare TURN config :
//   - Nom de l'app       : nyme
//   - Turn Token ID      : 77f00ae2cb584d4141b0efb842de5425
//   - API Token          : à stocker dans CLOUDFLARE_TURN_API_TOKEN (secret)
//
// Référence API :
//   POST https://rtc.live.cloudflare.com/v1/turn/keys/{keyId}/credentials/generate
//   Headers: Authorization: Bearer {API_TOKEN}
//   Body: { "ttl": 86400 }
//
// Réponse utilisée côté client pour RTCPeerConnection :
//   {
//     "iceServers": [
//       {
//         "urls": [
//           "stun:stun.cloudflare.com:3478",
//           "turn:turn.cloudflare.com:3478?transport=udp",
//           "turn:turn.cloudflare.com:3478?transport=tcp",
//           "turns:turn.cloudflare.com:5349?transport=tcp"
//         ],
//         "username": "xxxx",
//         "credential": "yyyy"
//       }
//     ]
//   }
//
// Utilisateurs autorisés : tout utilisateur authentifié (client, coursier, admin)
// Rate limit : 1 appel / 10 minutes par utilisateur (géré côté SQL via quota)
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ── Constantes Cloudflare TURN ────────────────────────────────────────────────

const CLOUDFLARE_TURN_KEY_ID = process.env.CLOUDFLARE_TURN_KEY_ID || '77f00ae2cb584d4141b0efb842de5425'
const CLOUDFLARE_TURN_API_URL = `https://rtc.live.cloudflare.com/v1/turn/keys/${CLOUDFLARE_TURN_KEY_ID}/credentials/generate`

// TTL des credentials TURN en secondes (24h = 86400)
// Cloudflare recommande des credentials de courte durée (max 24h)
const TURN_CREDENTIALS_TTL = 86400

// ── Fallback STUN/TURN si Cloudflare indisponible ────────────────────────────
// Utilisé uniquement si l'API Cloudflare échoue
const FALLBACK_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

// ── Interface réponse Cloudflare ──────────────────────────────────────────────

interface CloudflareTurnResponse {
  iceServers: {
    urls:       string[]
    username:   string
    credential: string
  }[]
}

// ── GET : Obtenir les credentials TURN ───────────────────────────────────────
// Accessible à tout utilisateur authentifié NYME

export async function GET(req: NextRequest) {
  try {
    // 1. Vérifier que l'utilisateur est authentifié
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Authentification requise pour accéder aux serveurs TURN' },
        { status: 401 }
      )
    }

    // 2. Rate limiting : max 20 appels / 10 minutes par utilisateur
    //    (les credentials durent 24h, un appel toutes les 10min est largement suffisant)
    try {
      const { data: allowed } = await supabaseAdmin.rpc('check_and_increment_rate_limit', {
        p_user_id:        session.user.id,
        p_endpoint:       'turn_credentials',
        p_max_calls:      20,
        p_window_seconds: 600,  // 10 minutes
      })

      if (allowed === false) {
        return NextResponse.json(
          { error: 'Trop de requêtes. Réessayez dans quelques minutes.' },
          { status: 429 }
        )
      }
    } catch (rateErr) {
      // Si la table rate_limit_api n'existe pas encore (migration non appliquée),
      // on laisse passer sans bloquer
      console.warn('[TURN] Rate limit check échoué (migration 017 appliquée ?):', rateErr)
    }

    // 3. Vérifier la présence du token Cloudflare TURN
    const turnApiToken = process.env.CLOUDFLARE_TURN_API_TOKEN

    if (!turnApiToken) {
      console.warn('[TURN] CLOUDFLARE_TURN_API_TOKEN absent — utilisation fallback STUN')
      // Retourner les serveurs STUN publics comme fallback
      return NextResponse.json({
        success:    true,
        source:     'fallback_stun',
        iceServers: FALLBACK_ICE_SERVERS,
        ttl:        0,
        warning:    'CLOUDFLARE_TURN_API_TOKEN non configuré — serveurs STUN Google utilisés (qualité dégradée pour NAT symétrique)',
      })
    }

    // 4. Appel à l'API Cloudflare TURN pour générer des credentials
    const cfResponse = await fetch(CLOUDFLARE_TURN_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${turnApiToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ ttl: TURN_CREDENTIALS_TTL }),
      // Timeout 10s pour éviter les blocages
      signal: AbortSignal.timeout(10_000),
    })

    if (!cfResponse.ok) {
      const errorText = await cfResponse.text().catch(() => 'Réponse illisible')
      console.error('[TURN] Cloudflare API error:', cfResponse.status, errorText)

      // Fallback sur STUN si l'API Cloudflare échoue
      return NextResponse.json({
        success:    true,
        source:     'fallback_stun',
        iceServers: FALLBACK_ICE_SERVERS,
        ttl:        0,
        warning:    `API Cloudflare TURN indisponible (HTTP ${cfResponse.status}) — serveurs STUN utilisés`,
      })
    }

    const cfData = await cfResponse.json() as CloudflareTurnResponse

    // 5. Valider la structure de la réponse
    if (!cfData?.iceServers?.length) {
      console.error('[TURN] Réponse Cloudflare invalide:', cfData)
      return NextResponse.json({
        success:    true,
        source:     'fallback_stun',
        iceServers: FALLBACK_ICE_SERVERS,
        ttl:        0,
        warning:    'Réponse Cloudflare TURN invalide — serveurs STUN utilisés',
      })
    }

    // 6. Retourner les credentials avec métadonnées
    return NextResponse.json({
      success:    true,
      source:     'cloudflare_turn',
      iceServers: cfData.iceServers,
      ttl:        TURN_CREDENTIALS_TTL,
      // Ne jamais exposer l'identité de l'utilisateur dans la réponse ICE
    }, {
      headers: {
        // Ne pas cacher les credentials TURN côté navigateur (ils sont dynamiques)
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma':        'no-cache',
      }
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'

    // AbortError = timeout
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[TURN] Timeout API Cloudflare')
      return NextResponse.json({
        success:    true,
        source:     'fallback_stun',
        iceServers: FALLBACK_ICE_SERVERS,
        ttl:        0,
        warning:    'Timeout API Cloudflare TURN — serveurs STUN utilisés',
      })
    }

    console.error('[api/calls/turn-credentials]', msg)
    return NextResponse.json(
      { error: 'Erreur lors de la génération des credentials TURN' },
      { status: 500 }
    )
  }
}