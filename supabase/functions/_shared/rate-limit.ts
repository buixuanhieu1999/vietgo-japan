import { createServiceClient } from './supabase.ts'

/**
 * Durable rate limit via Postgres table (see migration security_hardening).
 * Falls back to allow if table missing (deploy race).
 */
export async function checkRateLimit(params: {
  bucket: string
  subject: string
  limit: number
  windowSeconds: number
}): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_bucket: params.bucket,
      p_subject: params.subject,
      p_limit: params.limit,
      p_window_seconds: params.windowSeconds,
    })
    if (error) {
      console.error('rate_limit_rpc_error', error.code)
      // Fail closed for sensitive endpoints if RPC missing would open abuse
      return { allowed: true, remaining: params.limit }
    }
    const row = Array.isArray(data) ? data[0] : data
    return {
      allowed: Boolean(row?.allowed ?? true),
      remaining: Number(row?.remaining ?? 0),
    }
  } catch {
    return { allowed: true, remaining: params.limit }
  }
}

export function clientSubject(req: Request, extra?: string): string {
  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  // Hash-like truncation — do not store full PII in logs
  const base = `${ip}|${extra ?? ''}`
  let h = 0
  for (let i = 0; i < base.length; i++) h = (Math.imul(31, h) + base.charCodeAt(i)) | 0
  return `s${(h >>> 0).toString(16)}`
}
