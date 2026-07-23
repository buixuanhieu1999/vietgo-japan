# Security & Row Level Security

## Principles

1. **Deny by default** — RLS enabled on all exposed tables.
2. **Roles in `user_roles` table**, not only JWT metadata (client can forge metadata).
3. **Service role key never in browser** — only Edge Functions / CI.
4. **No `USING (true)` on private tables** for broad access (audit insert is append-only exception for authenticated actors writing their own events).
5. **Privileged writes** (guest booking, contact, support create, lookup) go through Edge Functions with Turnstile.

## Helper functions

- `has_role(role)`, `has_any_role(...)`, `is_staff()`, `is_admin()` — `SECURITY DEFINER`, `search_path = public`.

## Policy map (high level)

| Table | anon | customer | driver | staff/admin |
|-------|------|----------|--------|-------------|
| prefectures, airports, routes (public) | SELECT active/public | same | same | write admin |
| bookings | none | own | assigned only | dispatcher/admin |
| booking_status_history | none | own booking | — | staff |
| trips | public scheduled | public | assigned + staff | write staff |
| support_requests | none | own | no | agent/admin |
| support_messages | none | non-internal on own | no | internal ok for staff |
| private_files | none | owner | no | staff |
| operator/driver/vehicle documents | none | none | limited | staff/admin |
| transport_operators public | only verified + listed | same | staff all | admin write |
| audit_logs | none | none | none | admin SELECT; no DELETE |
| contact_messages | none (EF insert) | none | none | staff |

## Storage

- `public-assets` — public read; admin write.
- `private-documents` — private; path prefix = `auth.uid()` or staff; MIME/extension limited; **signed URLs** short-lived via Supabase client `createSignedUrl`.

## Testing RLS

### Local

```bash
supabase start
supabase db reset
# Use two user JWTs (customer A/B) and service role
```

### Checklist

1. Customer A cannot `select` booking of customer B.
2. Driver A cannot select trip of driver B.
3. Guest cannot select `private_files` or `driver_documents`.
4. `is_publicly_listed = true` with `verification_status != verified` fails check constraint.
5. `reserve_trip_seats` with concurrent clients does not oversell seats.
6. Super admin has no DELETE policy on `audit_logs`.

### Example (SQL as user)

```sql
set request.jwt.claim.sub = '<user-a-uuid>';
select * from bookings; -- only own rows under RLS
```

## Turnstile

Server verification in Edge Functions `_shared/turnstile.ts` against Cloudflare siteverify. Frontend-only checks are insufficient.

## Logging

Do **not** log passport numbers, residence card numbers, or document contents. Email provider logs only subject + short preview.

## Threat notes

- Booking code is random (non-sequential alphabet) + lookup requires contact match + Turnstile + rate limit.
- Sensitive data not placed in URL query strings on success page.
