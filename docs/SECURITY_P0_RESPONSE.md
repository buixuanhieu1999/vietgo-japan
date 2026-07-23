# P0 security response (implemented)

Static review findings mapped to code changes.

| Finding | Fix |
|---------|-----|
| Client-supplied `user_id` | Edge Functions use `getAuthUser(req)` JWT only; frontend no longer sends `user_id` |
| Broad booking UPDATE RLS | Dropped customer update policy; `customer_cancel_booking` + `staff_transition_booking` RPCs |
| Seat reservation delta bug | `reserve_trip_seats` uses delta; staff-only; booking/trip checks |
| Forgeable audit insert | Dropped `audit_logs_insert`; `write_audit_log_trusted` service/staff only |
| CORS `*` | Origin allowlist in `_shared/cors.ts` |
| Turnstile skip / hostname | Hostname check + no skip on production domain |
| In-memory rate limit | `rate_limit_buckets` + `check_rate_limit` RPC |
| No idempotency | `idempotency_keys` + client UUID; outbox for email |
| Lookup weak | Prefer `lookup_token`; code+contact still rate-limited |

## Remaining before *true* public commercial launch

- Fill legal entity / licenses (still placeholders)
- Full admin quote/assign/payment UI
- Distributed email worker for outbox
- Staging environment + RLS integration tests against live DB
- MFA for admin, backup drills
- PostGIS / MapLibre (P1)
- Do **not** claim $0 forever SLA

## Deploy

```bash
npx supabase db push --yes
npx supabase functions deploy create-booking --no-verify-jwt
npx supabase functions deploy submit-contact --no-verify-jwt
npx supabase functions deploy submit-support --no-verify-jwt
npx supabase functions deploy lookup-booking --no-verify-jwt
```
