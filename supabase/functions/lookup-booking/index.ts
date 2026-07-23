import {
  errorResponse,
  jsonResponse,
  optionsResponse,
} from '../_shared/cors.ts'
import { verifyTurnstile } from '../_shared/turnstile.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { checkRateLimit, clientSubject } from '../_shared/rate-limit.ts'

interface LookupPayload {
  booking_code?: string
  contact?: string
  lookup_token?: string
  turnstile_token?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req)
  if (req.method !== 'POST') return errorResponse(req, 'method_not_allowed', 405)

  try {
    const payload = (await req.json()) as LookupPayload
    const rl = await checkRateLimit({
      bucket: 'lookup_booking',
      subject: clientSubject(req),
      limit: 10,
      windowSeconds: 300,
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
      payload.turnstile_token,
      req.headers.get('cf-connecting-ip'),
      hostname,
    )
    if (!turnstile.success) {
      return errorResponse(req, 'turnstile_verification_failed', 403, turnstile.error)
    }

    const supabase = createServiceClient()
    const token = payload.lookup_token?.trim()
    const code = payload.booking_code?.trim().toUpperCase()
    const contact = payload.contact?.trim()

    // Prefer high-entropy lookup_token when provided
    if (token && token.length >= 16) {
      const { data, error } = await supabase
        .from('bookings')
        .select(
          'id, booking_code, status, service_type, pickup_address, dropoff_address, pickup_date, pickup_time, passenger_count, payment_status, quoted_price_jpy, created_at',
        )
        .eq('lookup_token', token)
        .is('deleted_at', null)
        .maybeSingle()
      if (error) {
        console.error('lookup_token_failed', error.code)
        return errorResponse(req, 'lookup_failed', 500)
      }
      if (!data) return errorResponse(req, 'not_found', 404, 'not_found')
      return jsonResponse(req, { ok: true, booking: data })
    }

    if (!code || !contact) {
      return errorResponse(req, 'invalid_payload', 400)
    }

    // Code + contact still available; durable rate limit applies
    const { data, error } = await supabase.rpc('lookup_booking', {
      p_booking_code: code,
      p_contact: contact,
    })

    if (error) {
      console.error('lookup_failed', error.code)
      return errorResponse(req, 'lookup_failed', 500)
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!row) return errorResponse(req, 'not_found', 404, 'not_found')

    return jsonResponse(req, { ok: true, booking: row })
  } catch (e) {
    console.error('lookup_booking_error', e instanceof Error ? e.message : 'unknown')
    return errorResponse(req, 'internal_error', 500)
  }
})
