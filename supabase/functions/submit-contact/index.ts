import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { verifyTurnstile } from '../_shared/turnstile.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { getEmailProvider } from '../_shared/email.ts'

interface ContactPayload {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  turnstile_token?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return errorResponse('method_not_allowed', 405)
  }

  try {
    const payload = (await req.json()) as ContactPayload
    if (!payload.name?.trim() || !payload.email?.includes('@') || !payload.subject?.trim() || !payload.message?.trim()) {
      return errorResponse('invalid_payload', 400)
    }
    if (payload.message.length > 5000) {
      return errorResponse('message_too_long', 400)
    }

    const turnstile = await verifyTurnstile(
      payload.turnstile_token,
      req.headers.get('cf-connecting-ip'),
    )
    if (!turnstile.success) {
      return errorResponse('turnstile_verification_failed', 403, turnstile.error)
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
      return errorResponse('contact_failed', 500)
    }

    try {
      const adminEmail = Deno.env.get('ADMIN_NOTIFICATION_EMAIL')
      if (adminEmail) {
        const provider = getEmailProvider()
        await provider.send({
          to: adminEmail,
          subject: `[VietGo] Liên hệ: ${payload.subject.trim().slice(0, 80)}`,
          html: `<p>Tin nhắn liên hệ mới (id: ${data.id})</p><p>Từ: ${payload.name}</p>`,
          text: `Contact message ${data.id} from ${payload.name}`,
        })
      }
    } catch {
      // non-fatal
    }

    return jsonResponse({ ok: true, id: data.id })
  } catch (e) {
    console.error('submit_contact_error', e instanceof Error ? e.message : 'unknown')
    return errorResponse('internal_error', 500)
  }
})
