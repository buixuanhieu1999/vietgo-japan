/**
 * Proxy Geoapify geocoding/routing — API key never exposed to browser.
 * Free tier: set GEOAPIFY_API_KEY secret. Debounce client-side.
 */
import {
  errorResponse,
  jsonResponse,
  optionsResponse,
} from '../_shared/cors.ts'
import { checkRateLimit, clientSubject } from '../_shared/rate-limit.ts'
import { verifyTurnstile } from '../_shared/turnstile.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req)
  if (req.method !== 'POST') return errorResponse(req, 'method_not_allowed', 405)

  const apiKey = Deno.env.get('GEOAPIFY_API_KEY')
  if (!apiKey) {
    return errorResponse(req, 'geoapify_not_configured', 503, 'geoapify_not_configured')
  }

  try {
    const body = (await req.json()) as {
      action: 'geocode' | 'route'
      text?: string
      lat?: number
      lon?: number
      from?: { lat: number; lon: number }
      to?: { lat: number; lon: number }
      turnstile_token?: string
    }

    const rl = await checkRateLimit({
      bucket: 'geoapify',
      subject: clientSubject(req),
      limit: 30,
      windowSeconds: 60,
    })
    if (!rl.allowed) return errorResponse(req, 'rate_limited', 429, 'rate_limited')

    let hostname: string | null = null
    try {
      const o = req.headers.get('Origin')
      if (o) hostname = new URL(o).hostname
    } catch {
      /* ignore */
    }
    const turnstile = await verifyTurnstile(
      body.turnstile_token,
      req.headers.get('cf-connecting-ip'),
      hostname,
    )
    if (!turnstile.success) {
      return errorResponse(req, 'turnstile_verification_failed', 403, turnstile.error)
    }

    if (body.action === 'geocode') {
      const text = body.text?.trim()
      if (!text || text.length < 2 || text.length > 200) {
        return errorResponse(req, 'invalid_text', 400)
      }
      // Bias to Japan
      const url = new URL('https://api.geoapify.com/v1/geocode/search')
      url.searchParams.set('text', text)
      url.searchParams.set('filter', 'countrycode:jp')
      url.searchParams.set('limit', '5')
      url.searchParams.set('apiKey', apiKey)

      const res = await fetch(url.toString())
      if (!res.ok) return errorResponse(req, 'upstream_error', 502)
      const data = await res.json()
      // Strip overly detailed properties if needed — return features only
      return jsonResponse(req, {
        ok: true,
        features: (data.features ?? []).map(
          (f: {
            properties?: Record<string, unknown>
            geometry?: { coordinates?: number[] }
          }) => ({
            label: f.properties?.formatted ?? f.properties?.name,
            lat: f.geometry?.coordinates?.[1],
            lon: f.geometry?.coordinates?.[0],
            city: f.properties?.city,
            postcode: f.properties?.postcode,
          }),
        ),
      })
    }

    if (body.action === 'route') {
      if (!body.from || !body.to) return errorResponse(req, 'invalid_route', 400)
      const url = new URL('https://api.geoapify.com/v1/routing')
      url.searchParams.set(
        'waypoints',
        `${body.from.lat},${body.from.lon}|${body.to.lat},${body.to.lon}`,
      )
      url.searchParams.set('mode', 'drive')
      url.searchParams.set('apiKey', apiKey)
      const res = await fetch(url.toString())
      if (!res.ok) return errorResponse(req, 'upstream_error', 502)
      const data = await res.json()
      const feat = data.features?.[0]
      return jsonResponse(req, {
        ok: true,
        distance_m: feat?.properties?.distance,
        time_s: feat?.properties?.time,
      })
    }

    return errorResponse(req, 'invalid_action', 400)
  } catch (e) {
    console.error('geoapify_proxy_error', e instanceof Error ? e.message : 'unknown')
    return errorResponse(req, 'internal_error', 500)
  }
})
