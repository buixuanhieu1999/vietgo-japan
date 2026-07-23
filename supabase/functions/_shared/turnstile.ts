export async function verifyTurnstile(
  token: string | undefined | null,
  remoteIp?: string | null,
  expectedHostname?: string | null,
): Promise<{ success: boolean; error?: string }> {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  const skip = Deno.env.get('TURNSTILE_SKIP_IN_DEV') === 'true'
  const isProd = Deno.env.get('ENVIRONMENT') === 'production' ||
    Deno.env.get('APP_URL')?.includes('vietgo-japan.pages.dev')

  // Never skip Turnstile when APP points at production domain
  if (!secret) {
    if (skip && !isProd) return { success: true }
    return { success: false, error: 'turnstile_not_configured' }
  }

  if (skip && isProd) {
    // Explicit misconfiguration: refuse rather than open public form
    console.error('turnstile_skip_blocked_in_production')
  }

  if (!token || token.trim().length < 10) {
    return { success: false, error: 'turnstile_token_missing' }
  }

  const form = new URLSearchParams()
  form.set('secret', secret)
  form.set('response', token)
  if (remoteIp) form.set('remoteip', remoteIp)

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    return { success: false, error: 'turnstile_upstream_error' }
  }

  const data = (await res.json()) as {
    success?: boolean
    hostname?: string
    challenge_ts?: string
    'error-codes'?: string[]
  }

  if (!data.success) {
    return { success: false, error: 'turnstile_failed' }
  }

  // Hostname binding when Cloudflare returns hostname
  if (expectedHostname && data.hostname) {
    const okHosts = new Set([
      expectedHostname,
      'vietgo-japan.pages.dev',
      'localhost',
      '127.0.0.1',
    ])
    const extra = Deno.env.get('TURNSTILE_ALLOWED_HOSTNAMES')
    if (extra) {
      for (const h of extra.split(',')) okHosts.add(h.trim())
    }
    if (!okHosts.has(data.hostname)) {
      return { success: false, error: 'turnstile_hostname_mismatch' }
    }
  }

  // Reject tokens older than 10 minutes if timestamp present
  if (data.challenge_ts) {
    const ts = Date.parse(data.challenge_ts)
    if (Number.isFinite(ts) && Date.now() - ts > 10 * 60 * 1000) {
      return { success: false, error: 'turnstile_token_expired' }
    }
  }

  return { success: true }
}
