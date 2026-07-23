import {
  errorResponse,
  jsonResponse,
  optionsResponse,
} from '../_shared/cors.ts'
import { verifyTurnstile } from '../_shared/turnstile.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { getEmailProvider } from '../_shared/email.ts'
import { checkRateLimit, clientSubject } from '../_shared/rate-limit.ts'

interface ContactPayload {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  turnstile_token?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req)
  if (req.method !== 'POST') return errorResponse(req, 'method_not_allowed', 405)

  try {
    const payload = (await req.json()) as ContactPayload
    if (
      !payload.name?.trim() ||
      !payload.email?.includes('@') ||
      !payload.subject?.trim() ||
      !payload.message?.trim()
    ) {
      return errorResponse(req, 'invalid_payload', 400)
    }
    if (payload.message.length > 5000) {
      return errorResponse(req, 'message_too_long', 400)
    }

    const rl = await checkRateLimit({
      bucket: 'submit_contact',
      subject: clientSubject(req, payload.email),
      limit: 5,
      windowSeconds: 600,
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
    const { data, error } = await supabase
      .from('contact_messages')
      .insert({
        name: payload.name.trim(),
        email: payload.email.trim().toLowerCase(),
        phone: payload.phone?.trim() || null,
        subject: payload.subject.trim(),
        message: payload.message.trim(),
        status: 'new',
      })
      .select('id')
      .single()

    if (error) {
      console.error('contact_insert_failed', error.code)
      return errorResponse(req, 'contact_failed', 500)
    }

    try {
      const adminEmail = Deno.env.get('ADMIN_NOTIFICATION_EMAIL')
      if (adminEmail) {
        const provider = getEmailProvider()
        await provider.send({
          to: adminEmail,
          subject: `[VietGo] Liên hệ: ${payload.subject.trim().slice(0, 80)}`,
          html: `<p>Tin nhắn liên hệ mới (id: ${data.id})</p>`,
          text: `Contact message ${data.id}`,
        })
      }
    } catch {
      // non-fatal
    }

    return jsonResponse(req, { ok: true, id: data.id })
  } catch (e) {
    console.error('submit_contact_error', e instanceof Error ? e.message : 'unknown')
    return errorResponse(req, 'internal_error', 500)
  }
})
