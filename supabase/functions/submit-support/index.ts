import {
  errorResponse,
  jsonResponse,
  optionsResponse,
} from '../_shared/cors.ts'
import { verifyTurnstile } from '../_shared/turnstile.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { getEmailProvider } from '../_shared/email.ts'
import { getAuthUser } from '../_shared/auth.ts'
import { checkRateLimit, clientSubject } from '../_shared/rate-limit.ts'

interface SupportPayload {
  service_type_id: string
  title: string
  description: string
  contact_name: string
  contact_phone: string
  contact_email: string
  privacy_accepted: boolean
  priority?: string
  turnstile_token?: string
  /** @deprecated ignored */
  user_id?: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req)
  if (req.method !== 'POST') return errorResponse(req, 'method_not_allowed', 405)

  try {
    const payload = (await req.json()) as SupportPayload
    if (
      !payload.service_type_id ||
      !payload.title?.trim() ||
      !payload.description?.trim() ||
      !payload.contact_name?.trim() ||
      !payload.contact_phone?.trim() ||
      !payload.contact_email?.includes('@') ||
      !payload.privacy_accepted
    ) {
      return errorResponse(req, 'invalid_payload', 400)
    }

    const rl = await checkRateLimit({
      bucket: 'submit_support',
      subject: clientSubject(req, payload.contact_email),
      limit: 6,
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

    const authUser = await getAuthUser(req)
    const userId = authUser?.id ?? null

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('support_requests')
      .insert({
        service_type_id: payload.service_type_id,
        title: payload.title.trim(),
        description: payload.description.trim(),
        contact_name: payload.contact_name.trim(),
        contact_phone: payload.contact_phone.trim(),
        contact_email: payload.contact_email.trim().toLowerCase(),
        privacy_accepted: true,
        priority: payload.priority ?? 'normal',
        status: 'submitted',
        user_id: userId,
      })
      .select('id, request_code, status')
      .single()

    if (error || !data) {
      console.error('support_insert_failed', error?.code)
      return errorResponse(req, 'support_create_failed', 500)
    }

    try {
      const provider = getEmailProvider()
      await provider.send({
        to: payload.contact_email.trim().toLowerCase(),
        subject: `[VietGo Japan] Đã nhận yêu cầu hỗ trợ ${data.request_code}`,
        html: `<p>Chúng tôi đã nhận yêu cầu <strong>${data.request_code}</strong>.</p>
               <p>Hỗ trợ ngôn ngữ / chuẩn bị tài liệu / hướng dẫn — không phải tư vấn pháp lý.</p>`,
        text: `Đã nhận yêu cầu ${data.request_code}.`,
      })
      const adminEmail = Deno.env.get('ADMIN_NOTIFICATION_EMAIL')
      if (adminEmail) {
        await provider.send({
          to: adminEmail,
          subject: `[VietGo] Support ${data.request_code}`,
          html: `<p>Support request ${data.request_code}</p>`,
          text: `Support ${data.request_code}`,
        })
      }
    } catch {
      // non-fatal
    }

    return jsonResponse(req, {
      ok: true,
      request: {
        id: data.id,
        request_code: data.request_code,
        status: data.status,
      },
    })
  } catch (e) {
    console.error('submit_support_error', e instanceof Error ? e.message : 'unknown')
    return errorResponse(req, 'internal_error', 500)
  }
})
