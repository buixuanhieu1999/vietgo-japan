export async function verifyTurnstile(
  token: string | undefined | null,
  remoteIp?: string | null,
): Promise<{ success: boolean; error?: string }> {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secret) {
    // Allow local/dev when secret not set but flag enabled
    if (Deno.env.get('TURNSTILE_SKIP_IN_DEV') === 'true') {
      return { success: true }
    }
    return { success: false, error: 'turnstile_not_configured' }
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

  const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] }
  if (!data.success) {
    return { success: false, error: 'turnstile_failed' }
  }
  return { success: true }
}
