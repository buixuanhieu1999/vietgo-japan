import { useEffect, useRef, useState } from 'react'
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, mapProvider, type GeoPoint } from '@/services/map-provider'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'

interface MapPreviewProps {
  className?: string
  center?: GeoPoint
  zoom?: number
  markers?: Array<GeoPoint & { label?: string; color?: string }>
  interactive?: boolean
}

/**
 * MapLibre display only — lazy-loaded to keep main bundle small.
 * Tiles: OpenFreeMap / VITE_MAP_STYLE_URL. Navigation: Google URL elsewhere.
 */
export function MapPreview({
  className,
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_MAP_ZOOM,
  markers = [],
  interactive = true,
}: MapPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any = null

    void (async () => {
      try {
        const maplibregl = await import('maplibre-gl')
        await import('maplibre-gl/dist/maplibre-gl.css')
        if (cancelled || !containerRef.current) return

        map = new maplibregl.Map({
          container: containerRef.current,
          style: mapProvider.styleUrl(),
          center: [center.lng, center.lat],
          zoom,
          attributionControl: {},
          interactive,
        })
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
        mapRef.current = map
        setReady(true)

        map.on('load', () => {
          if (cancelled) return
          // markers applied in separate effect
        })
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()

    return () => {
      cancelled = true
      map?.remove()
      mapRef.current = null
    }
  }, [center.lat, center.lng, interactive, zoom])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    void import('maplibre-gl').then((maplibregl) => {
      const prev = map._vgMarkers as Array<{ remove: () => void }> | undefined
      prev?.forEach((m) => m.remove())
      const next: Array<{ remove: () => void }> = []

      for (const m of markers) {
        const el = document.createElement('div')
        el.className = 'h-3 w-3 rounded-full border-2 border-white shadow'
        el.style.backgroundColor = m.color ?? '#c43c3c'
        el.title = m.label ?? ''
        const marker = new maplibregl.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(map)
        if (m.label) {
          marker.setPopup(new maplibregl.Popup({ offset: 12 }).setText(m.label))
        }
        next.push(marker)
      }
      map._vgMarkers = next

      if (markers.length === 1) {
        map.easeTo({ center: [markers[0]!.lng, markers[0]!.lat], zoom: Math.max(zoom, 11) })
      } else if (markers.length > 1) {
        const bounds = new maplibregl.LngLatBounds()
        markers.forEach((m) => bounds.extend([m.lng, m.lat]))
        map.fitBounds(bounds, { padding: 48, maxZoom: 12 })
      }
    })
  }, [markers, ready, zoom])

  if (failed) {
    return (
      <div
        className={cn(
          'flex min-h-[220px] items-center justify-center rounded-xl border border-navy-100 bg-navy-50 text-sm text-navy-600',
          className,
        )}
      >
        Không tải được bản đồ (MapLibre). Dùng nút mở Google Maps trên form.
      </div>
    )
  }

  return (
    <div className={cn('relative min-h-[220px] w-full', className)}>
      {!ready ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-navy-50">
          <Spinner />
        </div>
      ) : null}
      <div
        ref={containerRef}
        className="h-full min-h-[220px] w-full overflow-hidden rounded-xl border border-navy-100"
        role="img"
        aria-label="Map preview"
      />
    </div>
  )
}
