# Security checklist

- [x] TypeScript strict
- [x] Zod validation (client + server Edge Functions)
- [x] Turnstile server verification
- [x] Rate limiting on lookup (best-effort per isolate)
- [x] RLS on all public schema tables
- [x] No service-role key in frontend (`VITE_*` only)
- [x] `.env` gitignored; `.env.example` without secrets
- [x] CSP / security headers via Cloudflare `_headers`
- [x] Escape HTML in email templates
- [x] No arbitrary HTML render of user content in React (text nodes)
- [x] Upload MIME/size limits (storage policies)
- [x] Roles not solely in client-editable metadata
- [x] Audit log append-only (no delete policy)
- [x] Payment: no card storage
- [x] Map: no scraping
- [ ] Dependency audit on each release (`npm audit`)
- [ ] Secret rotation procedure (see README_DEPLOY)
- [ ] Legal review of terms/privacy before go-live
- [ ] Confirm transport licenses before public “licensed” claims

## Pre-production

1. Rotate all keys if any were ever committed (they must not be).
2. Enable Supabase email confirmations as required.
3. Restrict CORS / Auth redirect URLs to production domain.
4. Set Turnstile hostnames.
5. Verify Resend domain SPF/DKIM.
6. Disable `TURNSTILE_SKIP_IN_DEV` in production.
