// src/services/geocoding-service.ts
// ═══════════════════════════════════════════════════════════════════════════
// SERVICE DE GÉOCODAGE — NYME
// Découplé de map-service.ts pour une gestion indépendante.
// Fournit : geocode(adresse) et reverseGeocode(lat, lng)
// Rotation : Mapbox → Google → Nominatim (OpenStreetMap — GRATUIT illimité)
// CORRECTION audit : OSRM n'est PAS un service de géocodage.
//   Le vrai fallback est Nominatim (OpenStreetMap).
// ═══════════════════════════════════════════════════════════════════════════

export interface GeocodingResult {
  lat:      number
  lng:      number
  address:  string
  provider: 'mapbox' | 'google' | 'nominatim' | 'fallback'
}

// Coordonnées de Ouagadougou — utilisées seulement comme dernier recours absolu
const OUAGA_DEFAULT: GeocodingResult = {
  lat:      12.3547,
  lng:      -1.5247,
  address:  'Ouagadougou, Burkina Faso',
  provider: 'fallback',
}

class GeocodingService {
  private mapboxKey   = process.env.NEXT_PUBLIC_MAPBOX_KEY || ''
  private googleKeys  = (process.env.NEXT_PUBLIC_GOOGLE_KEYS || '').split(',').filter(Boolean)
  private googleIdx   = 0

  // ── Géocodage (adresse → coordonnées) ────────────────────────────────────

  /**
   * Convertit une adresse textuelle en coordonnées GPS.
   * Rotation : Mapbox → Google → Nominatim (OSM)
   * Ne retourne JAMAIS des coordonnées fictives sauf si l'adresse est vide.
   */
  async geocode(address: string): Promise<GeocodingResult> {
    if (!address?.trim()) return OUAGA_DEFAULT

    // 1. Mapbox Geocoding API
    if (this.mapboxKey) {
      try {
        const result = await this.geocodeMapbox(address)
        if (result) return result
      } catch (e) {
        console.warn('[GeocodingService] Mapbox échoué:', (e as Error).message)
      }
    }

    // 2. Google Maps Geocoding API
    if (this.googleKeys.length > 0) {
      try {
        const result = await this.geocodeGoogle(address)
        if (result) return result
      } catch (e) {
        console.warn('[GeocodingService] Google Geocoding échoué:', (e as Error).message)
      }
    }

    // 3. Nominatim (OpenStreetMap) — GRATUIT, pas de clé, illimité avec respect des limites
    try {
      const result = await this.geocodeNominatim(address)
      if (result) return result
    } catch (e) {
      console.warn('[GeocodingService] Nominatim échoué:', (e as Error).message)
    }

    // 4. Dernier recours : coordonnées Ouagadougou avec l'adresse telle quelle
    console.error('[GeocodingService] Géocodage impossible pour:', address, '— utilisation fallback Ouagadougou')
    return { ...OUAGA_DEFAULT, address }
  }

  // ── Géocodage inverse (coordonnées → adresse) ─────────────────────────────

  /**
   * Convertit des coordonnées GPS en adresse textuelle.
   * Rotation : Mapbox → Google → Nominatim
   */
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    // 1. Mapbox
    if (this.mapboxKey) {
      try {
        const address = await this.reverseGeocodeMapbox(lat, lng)
        if (address) return address
      } catch { /* fallthrough */ }
    }

    // 2. Google
    if (this.googleKeys.length > 0) {
      try {
        const address = await this.reverseGeocodeGoogle(lat, lng)
        if (address) return address
      } catch { /* fallthrough */ }
    }

    // 3. Nominatim
    try {
      const address = await this.reverseGeocodeNominatim(lat, lng)
      if (address) return address
    } catch { /* fallthrough */ }

    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }

  // ── Implémentations privées ───────────────────────────────────────────────

  private async geocodeMapbox(address: string): Promise<GeocodingResult | null> {
    const url    = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`
    const params = new URLSearchParams({
      access_token:  this.mapboxKey,
      limit:         '1',
      language:      'fr',
      // Biais géographique Burkina Faso
      proximity:     '-1.5247,12.3547',
      country:       'bf',
    })
    const res  = await fetch(`${url}?${params}`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`Mapbox geocode HTTP ${res.status}`)
    const data = await res.json() as {
      features: Array<{
        geometry:   { coordinates: [number, number] }
        place_name: string
      }>
    }
    if (!data.features?.length) return null
    const [lng, lat] = data.features[0].geometry.coordinates
    return { lat, lng, address: data.features[0].place_name, provider: 'mapbox' }
  }

  private async geocodeGoogle(address: string): Promise<GeocodingResult | null> {
    const key    = this.googleKeys[this.googleIdx++ % this.googleKeys.length]
    const params = new URLSearchParams({ address, key, language: 'fr', region: 'bf' })
    const res    = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) throw new Error(`Google Geocode HTTP ${res.status}`)
    const data = await res.json() as {
      status:  string
      results: Array<{
        geometry:          { location: { lat: number; lng: number } }
        formatted_address: string
      }>
    }
    if (data.status !== 'OK' || !data.results?.length) return null
    const r = data.results[0]
    return {
      lat:      r.geometry.location.lat,
      lng:      r.geometry.location.lng,
      address:  r.formatted_address,
      provider: 'google',
    }
  }

  /**
   * Nominatim — API de géocodage OpenStreetMap, GRATUITE et ILLIMITÉE.
   * Note : respecter max 1 requête/seconde (usage raisonnable).
   * CORRECTION audit : c'est le VRAI fallback de géocodage,
   * pas OSRM qui est uniquement un moteur de routage.
   */
  private async geocodeNominatim(address: string): Promise<GeocodingResult | null> {
    const params = new URLSearchParams({
      q:              address,
      format:         'json',
      limit:          '1',
      'accept-language': 'fr',
      // Biais géographique Burkina Faso
      countrycodes:   'bf',
    })
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: { 'User-Agent': 'NYME-BF/1.0 (livraison@nyme.bf)' },
        signal:   AbortSignal.timeout(10000),
      }
    )
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`)
    const data = await res.json() as Array<{
      lat:          string
      lon:          string
      display_name: string
    }>
    if (!data?.length) return null
    return {
      lat:      parseFloat(data[0].lat),
      lng:      parseFloat(data[0].lon),
      address:  data[0].display_name,
      provider: 'nominatim',
    }
  }

  private async reverseGeocodeMapbox(lat: number, lng: number): Promise<string | null> {
    const url    = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`
    const params = new URLSearchParams({ access_token: this.mapboxKey, limit: '1', language: 'fr' })
    const res    = await fetch(`${url}?${params}`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`Mapbox reverse HTTP ${res.status}`)
    const data = await res.json() as { features: Array<{ place_name: string }> }
    return data.features?.[0]?.place_name || null
  }

  private async reverseGeocodeGoogle(lat: number, lng: number): Promise<string | null> {
    const key    = this.googleKeys[this.googleIdx++ % this.googleKeys.length]
    const params = new URLSearchParams({ latlng: `${lat},${lng}`, key, language: 'fr' })
    const res    = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) throw new Error(`Google Reverse HTTP ${res.status}`)
    const data = await res.json() as {
      status:  string
      results: Array<{ formatted_address: string }>
    }
    return data.status === 'OK' ? (data.results?.[0]?.formatted_address || null) : null
  }

  private async reverseGeocodeNominatim(lat: number, lng: number): Promise<string | null> {
    const params = new URLSearchParams({
      lat:               String(lat),
      lon:               String(lng),
      format:            'json',
      'accept-language': 'fr',
    })
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params}`,
      {
        headers: { 'User-Agent': 'NYME-BF/1.0 (livraison@nyme.bf)' },
        signal:   AbortSignal.timeout(10000),
      }
    )
    if (!res.ok) throw new Error(`Nominatim Reverse HTTP ${res.status}`)
    const data = await res.json() as { display_name?: string; error?: string }
    return data.display_name || null
  }
}

// ── Singleton exporté ─────────────────────────────────────────────────────────
export const geocodingService = new GeocodingService()