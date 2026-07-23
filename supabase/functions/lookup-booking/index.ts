import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { verifyTurnstile } from '../_shared/turnstile.ts'
import { createServiceClient } from '../_shared/supabase.ts'

interface LookupPayload {
  booking_code: string
  contact: string
  turnstile_token?: string
}

// Simple in-memory rate limit per isolate (best-effort)
const hits = new Map<string, { count: number; reset: number }>()

function rateLimit(key: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = hits.get(key)
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count += 1
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return errorResponse('method_not_allowed', 405)
  }

  try {
    const ip = req.headers.get('cf-connecting-ip') ?? 'unknown'
    if (!rateLimit(`lookup:${ip}`)) {
      return errorResponse('rate_limited', 429, 'rate_limited')
    }

    const payload = (await req.json()) as LookupPayload
    if (!payload.booking_code?.trim() || !payload.contact?.trim()) {
      return errorResponse('invalid_payload', 400)
    }

    const turnstile = await verifyTurnstile(payload.turnstile_token, ip)
    if (!turnstile.success) {
      return errorResponse('turnstile_verification_failed', 403, turnstile.error)
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase.rpc('lookup_booking', {
      p_booking_code: payload.booking_code.trim().toUpperCase(),
      p_contact: payload.contact.trim(),
    })

    if (error) {
      console.error('lookup_failed', error.code)
      return errorResponse('lookup_failed', 500)
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!row) {
      // Same response shape timing — do not reveal which field failed
      return errorResponse('not_found', 404, 'not_found')
    }

    return jsonResponse({ ok: true, booking: row })
  } catch (e) {
    console.error('lookup_booking_error', e instanceof Error ? e.message : 'unknown')
    return errorResponse('internal_error', 500)
  }
})
