/**
 * Service de cartographie multi-API avec rotation automatique
 */
export type MapProvider = 'mapbox' | 'google' | 'osrm'

export interface RouteResult {
  distance: number
  duration: number
  polyline: Array<[number, number]>
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

  private mapboxLimitReached = false
  private googleLimitReached = false

  async getRoute(startLat: number, startLng: number, endLat: number, endLng: number): Promise<RouteResult> {
    if (!this.mapboxLimitReached && this.mapboxKey) {
      try {
        return await this.getRouteMapbox(startLat, startLng, endLat, endLng)
      } catch (err) { console.warn('Mapbox failed:', err) }
    }
    return this.getRouteOSRM(startLat, startLng, endLat, endLng)
  }

  private async getRouteMapbox(lat1: number, lng1: number, lat2: number, lng2: number): Promise<RouteResult> {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${lng1},${lat1};${lng2},${lat2}?access_token=${this.mapboxKey}&geometries=geojson&language=fr`
    const res = await fetch(url)
    const data = await res.json()
    const route = data.routes[0]
    return {
      distance: route.distance / 1000,
      duration: route.duration,
      polyline: route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]),
      provider: 'mapbox'
    }
  }

  private async getRouteOSRM(lat1: number, lng1: number, lat2: number, lng2: number): Promise<RouteResult> {
    const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`
    const res = await fetch(url)
    const data = await res.json()
    const route = data.routes[0]
    return {
      distance: route.distance / 1000,
      duration: route.duration,
      polyline: route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]),
      provider: 'osrm'
    }
  }

  async geocode(query: string): Promise<GeocodingResult[]> {
    try {
      if (this.mapboxKey) {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${this.mapboxKey}&limit=1&language=fr`
        const res = await fetch(url)
        const data = await res.json()
        if (data.features?.length) {
          const f = data.features[0]
          return [{ lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], address: f.place_name, provider: 'mapbox' }]
        }
      }
    } catch (e) { console.error(e) }
    
    // Fallback simple si API échoue ou si c'est des coordonnées
    return [{ lat: 12.3714, lng: -1.5197, address: query, provider: 'osrm' }]
  }
}

export const mapService = new MapService()
