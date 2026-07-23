/**
 * Map abstraction — free-tier practical stack:
 * - Display: MapLibre + OpenFreeMap (or PMTiles URL via env)
 * - Navigation: Google Maps URL (no paid embed API)
 * - Geocode/routing: Geoapify via Edge Function proxy (optional key)
 * Never scrape Google Maps. Never use public Nominatim from browser at scale.
 */

export interface GeoPoint {
  lat: number
  lng: number
}

export interface MapProvider {
  readonly name: string
  searchUrl(query: string): string
  directionsUrl(origin: string, destination: string): string
  /** MapLibre style JSON URL — override via VITE_MAP_STYLE_URL */
  styleUrl(): string
  staticMapUrl?(center: GeoPoint, zoom?: number): string | null
}

export class UrlMapProvider implements MapProvider {
  readonly name = 'maplibre-openfreemap'

  searchUrl(query: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
  }

  directionsUrl(origin: string, destination: string): string {
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
  }

  styleUrl(): string {
    const fromEnv = import.meta.env.VITE_MAP_STYLE_URL
    if (typeof fromEnv === 'string' && fromEnv.length > 0) return fromEnv
    // OpenFreeMap — free vector tiles suitable for small/closed-beta traffic
    return 'https://tiles.openfreemap.org/styles/liberty'
  }

  staticMapUrl(): null {
    return null
  }
}

export const mapProvider: MapProvider = new UrlMapProvider()

/** Japan-ish default center (Nagoya) */
export const DEFAULT_MAP_CENTER: GeoPoint = { lat: 35.1815, lng: 136.9066 }
export const DEFAULT_MAP_ZOOM = 9
