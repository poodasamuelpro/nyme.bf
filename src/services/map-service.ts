/**
 * Service de cartographie multi-API avec rotation automatique
 * Priorité: Mapbox → Google Maps → OSRM (gratuit, fallback illimité)
 */

export type MapProvider = 'mapbox' | 'google' | 'osrm'

export interface RouteResult {
  distance: number   // en km
  duration: number   // en secondes
  polyline: Array<[number, number]>  // [lat, lng]
  provider: MapProvider
}

export interface GeocodingResult {
  lat: number
  lng: number
  address: string
  provider: MapProvider
}

class MapService {
  private mapboxKey = process.env.NEXT_PUBLIC_MAPBOX_KEY || ''
  private googleKeys = (process.env.NEXT_PUBLIC_GOOGLE_KEYS || '').split(',').filter(Boolean)
  private googleKeyIndex = 0

  private mapboxRequestCount = 0
  private googleRequestCount = 0
  private mapboxLimitReached = false
  private googleLimitReached = false

  private readonly MAPBOX_LIMIT = 50000
  private readonly GOOGLE_LIMIT = 25000

  // ── Routing public ────────────────────────────────────────────────

  async getRoute(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): Promise<RouteResult> {
    if (!this.mapboxLimitReached && this.mapboxKey) {
      try {
        const result = await this.getRouteMapbox(startLat, startLng, endLat, endLng)
        this.mapboxRequestCount++
        if (this.mapboxRequestCount >= this.MAPBOX_LIMIT) this.mapboxLimitReached = true
        return result
      } catch (err) {
        console.warn('[MapService] Mapbox failed, trying Google:', err)
      }
    }

    if (!this.googleLimitReached && this.googleKeys.length > 0) {
      try {
        const result = await this.getRouteGoogle(startLat, startLng, endLat, endLng)
        this.googleRequestCount++
        if (this.googleRequestCount >= this.GOOGLE_LIMIT) this.googleLimitReached = true
        return result
      } catch (err) {
        console.warn('[MapService] Google failed, trying OSRM:', err)
      }
    }

    return this.getRouteOSRM(startLat, startLng, endLat, endLng)
  }

  // ── Geocoding public ──────────────────────────────────────────────

  async geocode(address: string): Promise<GeocodingResult> {
    if (!this.mapboxLimitReached && this.mapboxKey) {
      try {
        return await this.geocodeMapbox(address)
      } catch (err) {
        console.warn('[MapService] Mapbox geocoding failed:', err)
      }
    }

    if (!this.googleLimitReached && this.googleKeys.length > 0) {
      try {
        return await this.geocodeGoogle(address)
      } catch (err) {
        console.warn('[MapService] Google geocoding failed:', err)
      }
    }

    // Fallback: centre Ouagadougou
    return { lat: 12.3547, lng: -1.5247, address, provider: 'osrm' }
  }

  // ── Routing privé ─────────────────────────────────────────────────

  private async getRouteMapbox(
    startLat: number, startLng: number,
    endLat: number, endLng: number
  ): Promise<RouteResult> {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}`
    const params = new URLSearchParams({
      access_token: this.mapboxKey,
      geometries: 'geojson',
      steps: 'false',
      language: 'fr',
    })

    const res = await fetch(`${url}?${params}`)
    if (!res.ok) throw new Error(`Mapbox HTTP ${res.status}`)

    const data = await res.json() as {
      routes: Array<{
        distance: number
        duration: number
        geometry: { coordinates: Array<[number, number]> }
      }>
    }

    if (!data.routes?.length) throw new Error('Mapbox: no route')
    const route = data.routes[0]

    return {
      distance: route.distance / 1000,
      duration: Math.round(route.duration),
      polyline: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      provider: 'mapbox',
    }
  }

  private async getRouteGoogle(
    startLat: number, startLng: number,
    endLat: number, endLng: number
  ): Promise<RouteResult> {
    const key = this.googleKeys[this.googleKeyIndex % this.googleKeys.length]
    this.googleKeyIndex++

    const params = new URLSearchParams({
      origin: `${startLat},${startLng}`,
      destination: `${endLat},${endLng}`,
      key,
      mode: 'driving',
      language: 'fr',
    })

    const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`)
    if (!res.ok) throw new Error(`Google HTTP ${res.status}`)

    const data = await res.json() as {
      status: string
      routes: Array<{
        legs: Array<{ distance: { value: number }; duration: { value: number } }>
        overview_polyline: { points: string }
      }>
    }

    if (data.status !== 'OK' || !data.routes?.length) throw new Error(`Google: ${data.status}`)
    const route = data.routes[0]
    const leg = route.legs[0]

    return {
      distance: leg.distance.value / 1000,
      duration: leg.duration.value,
      polyline: this.decodePolyline(route.overview_polyline.points),
      provider: 'google',
    }
  }

  private async getRouteOSRM(
    startLat: number, startLng: number,
    endLat: number, endLng: number
  ): Promise<RouteResult> {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}`
    const res = await fetch(`${url}?overview=full&geometries=geojson`)
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`)

    const data = await res.json() as {
      routes: Array<{
        distance: number
        duration: number
        geometry: { coordinates: Array<[number, number]> }
      }>
    }

    if (!data.routes?.length) throw new Error('OSRM: no route')
    const route = data.routes[0]

    return {
      distance: route.distance / 1000,
      duration: Math.round(route.duration),
      polyline: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      provider: 'osrm',
    }
  }

  // ── Geocoding privé ───────────────────────────────────────────────

  private async geocodeMapbox(address: string): Promise<GeocodingResult> {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`
    const params = new URLSearchParams({
      access_token: this.mapboxKey,
      limit: '1',
      language: 'fr',
    })

    const res = await fetch(`${url}?${params}`)
    if (!res.ok) throw new Error(`Mapbox geocode HTTP ${res.status}`)

    const data = await res.json() as {
      features: Array<{
        geometry: { coordinates: [number, number] }
        place_name: string
      }>
    }

    if (!data.features?.length) throw new Error('Mapbox geocode: no results')
    const [lng, lat] = data.features[0].geometry.coordinates

    return { lat, lng, address: data.features[0].place_name, provider: 'mapbox' }
  }

  private async geocodeGoogle(address: string): Promise<GeocodingResult> {
    const key = this.googleKeys[this.googleKeyIndex % this.googleKeys.length]
    this.googleKeyIndex++

    const params = new URLSearchParams({ address, key, language: 'fr' })
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`)
    if (!res.ok) throw new Error(`Google geocode HTTP ${res.status}`)

    const data = await res.json() as {
      status: string
      results: Array<{
        geometry: { location: { lat: number; lng: number } }
        formatted_address: string
      }>
    }

    if (data.status !== 'OK' || !data.results?.length) throw new Error(`Google geocode: ${data.status}`)
    const result = data.results[0]

    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      address: result.formatted_address,
      provider: 'google',
    }
  }

  // ── Utilitaires ───────────────────────────────────────────────────

  private decodePolyline(encoded: string): Array<[number, number]> {
    const points: Array<[number, number]> = []
    let index = 0, lat = 0, lng = 0

    while (index < encoded.length) {
      let result = 0, shift = 0, byte = 0
      do {
        byte = encoded.charCodeAt(index++) - 63
        result |= (byte & 0x1f) << shift
        shift += 5
      } while (byte >= 0x20)
      lat += result & 1 ? ~(result >> 1) : result >> 1

      result = 0; shift = 0
      do {
        byte = encoded.charCodeAt(index++) - 63
        result |= (byte & 0x1f) << shift
        shift += 5
      } while (byte >= 0x20)
      lng += result & 1 ? ~(result >> 1) : result >> 1

      points.push([lat / 1e5, lng / 1e5])
    }

    return points
  }

  resetMonthlyCounters() {
    const today = new Date()
    if (today.getDate() === 1) {
      this.mapboxRequestCount = 0
      this.googleRequestCount = 0
      this.mapboxLimitReached = false
      this.googleLimitReached = false
    }
  }

  getStatus() {
    return {
      mapbox: { available: !this.mapboxLimitReached && !!this.mapboxKey, requestCount: this.mapboxRequestCount, limit: this.MAPBOX_LIMIT },
      google: { available: !this.googleLimitReached && this.googleKeys.length > 0, requestCount: this.googleRequestCount, limit: this.GOOGLE_LIMIT },
      osrm:   { available: true, requestCount: 0, limit: 'unlimited' },
    }
  }
}

export const mapService = new MapService()
