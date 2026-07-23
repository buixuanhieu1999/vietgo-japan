# VietGo Japan

**Slogan:** Đồng hành cùng người Việt trên mọi hành trình tại Nhật Bản  
**HQ:** Nagoya, Aichi, Japan  

Production-oriented web app for **licensed / verified transport request intake** and **document support** for the Vietnamese community in Japan.

> This is **not** a white-plate rideshare marketplace. Drivers and vehicles must be verified and linked to a transport operator record.

## Stack

- **Frontend:** React 19, TypeScript strict, Vite, Tailwind CSS 4, React Router, TanStack Query, React Hook Form, Zod, i18next (VI default, JA second), PWA, Cloudflare Pages
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime-ready, Edge Functions, RLS)
- **Email:** Resend via `EmailProvider` abstraction
- **Anti-spam:** Cloudflare Turnstile (server-verified)
- **Maps:** URL provider (no paid API in MVP)
- **Payments:** Manual (cash / bank / office) + `PaymentProvider` for future Stripe

## Bắt đầu từ zero (đăng nhập + API keys + deploy)

**Hướng dẫn tiếng Việt từng bước:** [`docs/HUONG_DAN_TU_DAU.md`](docs/HUONG_DAN_TU_DAU.md)

## Quick start (local UI)

```bash
npm install
cp .env.example .env.local
# Fill VITE_SUPABASE_* when backend is ready
npm run dev
```


## Quality gates

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Repository layout

See `docs/ARCHITECTURE.md`. Database migrations live in `supabase/migrations/`. Deploy guide: **`README_DEPLOY.md`**.

## Legal placeholders

Company legal name, full Nagoya address, licenses, and BHP service official name are **placeholders** until the operator provides verified data. The UI must not claim “licensed” publicly unless `transport_operators.verification_status = verified` and admin enables listing.

## License

Proprietary — all rights reserved unless otherwise stated by the project owner.
