/**
 * Map abstraction — MVP uses free URL-based Google Maps open links.
 * No paid Maps API; no scraping.
 */
export interface GeoPoint {
  lat: number
  lng: number
}

export interface MapProvider {
  readonly name: string
  searchUrl(query: string): string
  directionsUrl(origin: string, destination: string): string
  staticMapUrl?(center: GeoPoint, zoom?: number): string | null
}

export class UrlMapProvider implements MapProvider {
  readonly name = 'url-google-maps'

  searchUrl(query: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
  }

  directionsUrl(origin: string, destination: string): string {
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
  }

  staticMapUrl(): null {
    return null
  }
}

/** Future: GoogleMapsProvider | MapboxProvider | MapLibreProvider */
export const mapProvider: MapProvider = new UrlMapProvider()
