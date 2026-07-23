const DEFAULT_ALLOWED = [
  'https://vietgo-japan.pages.dev',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]

function allowedOrigins(): string[] {
  const extra = Deno.env.get('CORS_ALLOWED_ORIGINS')
  if (!extra) return DEFAULT_ALLOWED
  return [
    ...DEFAULT_ALLOWED,
    ...extra.split(',').map((s) => s.trim()).filter(Boolean),
  ]
}

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowed = allowedOrigins()
  const match = allowed.includes(origin) ? origin : allowed[0]!

  return {
    'Access-Control-Allow-Origin': match,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-turnstile-token, x-idempotency-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

/** @deprecated use corsHeadersFor(req) — kept only if mis-imported */
export const corsHeaders = {
  'Access-Control-Allow-Origin': DEFAULT_ALLOWED[0]!,
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-turnstile-token, x-idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function jsonResponse(
  req: Request,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersFor(req),
      'Content-Type': 'application/json',
    },
  })
}

export function errorResponse(
  req: Request,
  message: string,
  status = 400,
  code?: string,
): Response {
  return jsonResponse(req, { error: message, code: code ?? 'error' }, status)
}

export function optionsResponse(req: Request): Response {
  return new Response('ok', { headers: corsHeadersFor(req) })
}
