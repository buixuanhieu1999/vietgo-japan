# Cloudflare Turnstile setup

## Production status

Real Turnstile widget keys are configured:

| Item | Location |
|------|----------|
| Site key | Cloudflare Pages build env / local `.env.local` as `VITE_TURNSTILE_SITE_KEY` |
| Secret key | Supabase Edge secret `TURNSTILE_SECRET_KEY` only (never `VITE_*`, never git) |
| Skip mode | `TURNSTILE_SKIP_IN_DEV=false` |

**Do not commit secrets.** Site key is public by design; secret must stay server-side.

## Hostnames (widget)

Configure in Cloudflare Turnstile → Hostname Management:

- `vietgo-japan.pages.dev`
- `localhost`
- `127.0.0.1`
- custom domain when ready (e.g. `example.jp`, `www.example.jp`)

No `https://`, no paths.

## Rotate / update keys

```bash
# Server
npx supabase secrets set TURNSTILE_SECRET_KEY=<NEW_SECRET> TURNSTILE_SKIP_IN_DEV=false --project-ref xwjjmhvmmfihnmlxzldu

# Frontend rebuild (site key is public)
# PowerShell:
# $env:VITE_TURNSTILE_SITE_KEY = "<NEW_SITE_KEY>"
# (+ other VITE_* vars)
# npm run build
# npx wrangler pages deploy dist --project-name vietgo-japan
```

Optional: set `VITE_TURNSTILE_SITE_KEY` in Cloudflare Pages → Settings → Environment variables so Git-connected builds pick it up automatically.

## Verify

1. Open https://vietgo-japan.pages.dev/dat-xe (hard refresh)
2. Turnstile widget appears (not the “chưa cấu hình” warning)
3. Submit form → no `turnstile_verification_failed`
4. Check Supabase Edge Function logs if errors persist

## Local

```bash
cp .env.example .env.local
# set VITE_TURNSTILE_SITE_KEY to the same public site key
npm run dev
```

Secret remains only in Supabase secrets for Edge Functions.
