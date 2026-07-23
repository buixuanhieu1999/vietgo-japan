# Cloudflare Turnstile setup

## Current production (test keys)

The live site uses **Cloudflare official always-pass test keys** so forms work end-to-end while a real widget is pending:

| Key | Value | Where |
|-----|--------|--------|
| Site key | `1x00000000000000000000AA` | `VITE_TURNSTILE_SITE_KEY` (Pages build) |
| Secret | `1x0000000000000000000000000000000AA` | Supabase secret `TURNSTILE_SECRET_KEY` |

These keys always pass verification. **Replace before real public traffic.**

Wrangler OAuth cannot create Turnstile widgets (missing Turnstile write scope). Create the real widget in the dashboard.

## Create a real widget (dashboard)

1. Open [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. **Add widget**
3. Name: `VietGo Japan`
4. Hostnames:
   - `vietgo-japan.pages.dev`
   - `localhost` (optional for local)
   - your custom domain when ready
5. Mode: **Managed**
6. Create → copy **Site Key** and **Secret Key**

## Apply real keys

```bash
# Server secret (never VITE_)
npx supabase secrets set TURNSTILE_SECRET_KEY=<YOUR_SECRET> TURNSTILE_SKIP_IN_DEV=false --project-ref xwjjmhvmmfihnmlxzldu

# Frontend (rebuild required)
# Set in Cloudflare Pages → Settings → Environment variables:
#   VITE_TURNSTILE_SITE_KEY=<YOUR_SITE_KEY>
# Then redeploy, or local:
```

```powershell
$env:VITE_TURNSTILE_SITE_KEY = "<YOUR_SITE_KEY>"
# plus other VITE_* vars
npm run build
npx wrangler pages deploy dist --project-name vietgo-japan
```

## Verify

1. Open form page → Turnstile checkbox/widget visible
2. Submit → Edge Function returns success (not `turnstile_verification_failed`)
3. Supabase Functions logs show no `turnstile_not_configured`

## Local

Copy `.env.example` → `.env.local` and set the same site key. Keep secret only in Supabase secrets / never in `VITE_*`.
