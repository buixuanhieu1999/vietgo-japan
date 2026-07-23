# VietGo Japan — Architecture

## Phase 1 summary

**Product:** Website nhận yêu cầu đặt xe + hỗ trợ hồ sơ cho người Việt tại Nhật Bản (trụ sở Nagoya).

**Legal model:** Không phải chợ mở cho tài xế xe tư nhân biển trắng. Chỉ điều phối qua đơn vị vận tải / tài xế đã xác minh (`pending|verified|suspended|rejected`), gắn `transport_operators`.

**Stack:** React + Vite + TypeScript (Cloudflare Pages) · Supabase (Postgres, Auth, Storage, Edge Functions, RLS) · Resend · Cloudflare Turnstile.

## Assumptions

1. Tên pháp nhân, địa chỉ Nagoya, giấy phép, số điện thoại, email thật **chưa có** → placeholder trong seed/settings/env.
2. Dịch vụ **BHP** chưa có tên chính thức → placeholder `bhp_placeholder` trong `support_service_types`.
3. Giá tuyến demo **không** phải giá kinh doanh thật (null hoặc tham khảo UI).
4. Thanh toán online (Stripe) **chưa** bật; interface `PaymentProvider` sẵn sàng.
5. Bản đồ: chỉ URL Google Maps; `MapProvider` sẵn sàng tích hợp sau.
6. Deploy production cần người dùng tạo Supabase project, Turnstile, Resend, Cloudflare Pages.

## Missing business data (placeholders)

| Field | Status |
|-------|--------|
| Tên pháp nhân | Placeholder |
| Địa chỉ Nagoya đầy đủ | Placeholder / `VITE_CONTACT_ADDRESS` |
| SĐT / Email / LINE | Env placeholders |
| Mã doanh nghiệp | `site_settings` private |
| Giấy phép vận tải | Private until verified |
| Người đại diện / data controller | Private settings |
| Chính sách lưu giữ dữ liệu chi tiết | Placeholder text |
| Tên chính xác dịch vụ BHP | Placeholder |

## Sitemap (public)

`/` · `/dua-don-san-bay` · `/xe-ghep` · `/di-tinh` · `/dua-don-nha-may` · `/ho-tro-ho-so` · `/bang-gia` · `/tuyen-duong` · `/ve-chung-toi` · `/tru-so-nagoya` · `/faq` · `/lien-he` · `/dat-xe` · `/dat-xe/thanh-cong` · `/tra-cuu-booking` · `/phap-ly/*` · `/dang-nhap` · `/dang-ky`

**Authenticated:** `/tai-khoan/*` · `/quan-tri/*` · `/tai-xe`

## Data flow — booking

1. Client validates with Zod.
2. Turnstile token collected in UI.
3. `create-booking` Edge Function verifies Turnstile server-side.
4. Insert `bookings` status `requested` via service role.
5. Email customer + admin (Resend or console fallback).
6. Redirect success page with booking code in **router state** (not query string secrets).

## Shared rides

- `trips` + `trip_bookings` + `reserve_trip_seats()` with `FOR UPDATE`.
- Dispatcher confirms; no auto-merge by distance only.

## Role matrix (summary)

| Role | Bookings | Trips | Support | Docs | Admin |
|------|----------|-------|---------|------|-------|
| guest | create via EF / lookup | public list | create via EF | no | no |
| customer | own | public | own | own private files | no |
| support_agent | staff read | — | assigned/all staff | assigned | limited |
| dispatcher | manage transport | manage | — | ops docs | no full CMS |
| driver | assigned only | assigned | no admin docs | no | no |
| admin | full | full | full | full | yes |
| super_admin | full + roles/config | full | full | full | yes; no audit delete |

## Project structure

See repository root `vietgo-japan` layout under `src/`, `supabase/`, `docs/`, `tests/`.
