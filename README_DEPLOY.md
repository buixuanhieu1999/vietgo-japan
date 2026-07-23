# README_DEPLOY — VietGo Japan (A→Z)

Tài liệu triển khai cho người mới. Mỗi bước: **Mục tiêu · Command · Kết quả · Lỗi thường gặp · Xử lý**.

---

## 0. Phần mềm cần cài

**Mục tiêu:** Môi trường dev/deploy sẵn sàng.

- Node.js 20+
- npm 10+
- Git
- (Tuỳ chọn) Supabase CLI, Wrangler, GitHub CLI

```bash
node -v
npm -v
git --version
```

**Kết quả mong đợi:** In ra version.  
**Lỗi:** `node` not found → cài từ nodejs.org LTS.

---

## 1. Clone & cài dependency

**Mục tiêu:** Chạy được project local.

```bash
git clone <YOUR_REPO_URL> vietgo-japan
cd vietgo-japan
npm install
cp .env.example .env.local
```

**Kết quả:** `node_modules` tồn tại, `.env.local` có mặt.  
**Lỗi `EPERM` trên Windows:** đóng IDE/antivirus, chạy lại `npm install`.

---

## 2. Tạo Supabase project

**Mục tiêu:** Backend Postgres + Auth + Storage.

1. Đăng ký https://supabase.com (free tier).
2. New project → ghi nhớ **Project URL**, **anon key**, **service_role key** (chỉ server).
3. Authentication → URL configuration: thêm `http://localhost:5173` và domain production sau này.

**Không** đưa `service_role` vào frontend.

---

## 3. Chạy migration

**Mục tiêu:** Schema + RLS + storage policies.

```bash
npm install -g supabase
supabase login
supabase link --project-ref <PROJECT_REF>
supabase db push
```

Seed (SQL editor hoặc local):

```bash
# Local full reset with seed
supabase start
supabase db reset
# seed.sql được cấu hình trong config nếu gắn; hoặc dán nội dung supabase/seed.sql vào SQL Editor
```

**Kết quả:** Các bảng `bookings`, `profiles`, … tồn tại; RLS bật.  
**Lỗi permission:** kiểm tra đã `link` đúng project.  
**Lỗi extension:** project free đã có `pgcrypto`.

---

## 4. Storage buckets

**Mục tiêu:** `public-assets` + `private-documents`.

Migration `20260324000003_storage.sql` tạo buckets. Kiểm tra Dashboard → Storage.

- Private bucket: **không** public.
- Chỉ JPEG/PNG/WebP/PDF; size limit theo policy.

---

## 5. Auth

**Mục tiêu:** Email/password signup.

1. Auth → Providers → Email bật.
2. Confirm email: bật production khi sẵn sàng.
3. Redirect URLs: app domain + localhost.

Tạo admin **thủ công** (không seed password production):

1. Đăng ký user qua UI `/dang-ky` hoặc Dashboard.
2. SQL:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin' FROM public.profiles WHERE email = 'you@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## 6. Cloudflare Turnstile

**Mục tiêu:** Chống spam form.

1. Cloudflare Dashboard → Turnstile → Add site.
2. Domains: localhost + production.
3. Site key → `VITE_TURNSTILE_SITE_KEY`.
4. Secret → Supabase secrets `TURNSTILE_SECRET_KEY` (không VITE_).

Local dev: có thể set secret Edge `TURNSTILE_SKIP_IN_DEV=true` **chỉ local** — tắt trên production.

---

## 7. Resend

**Mục tiêu:** Email xác nhận booking / admin notify.

1. https://resend.com → API key.
2. Verify domain (SPF, DKIM, DMARC).
3. Secrets:

```bash
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set RESEND_FROM_EMAIL="VietGo <noreply@yourdomain>"
supabase secrets set ADMIN_NOTIFICATION_EMAIL=you@example.com
supabase secrets set APP_URL=https://your-pages-domain
```

**Lỗi domain chưa verify:** Resend reject → email rơi vào console provider fallback khi không có key.

---

## 8. Deploy Edge Functions

```bash
supabase functions deploy create-booking --no-verify-jwt
supabase functions deploy submit-contact --no-verify-jwt
supabase functions deploy submit-support --no-verify-jwt
supabase functions deploy lookup-booking --no-verify-jwt
```

`--no-verify-jwt` cho phép guest gọi; bảo vệ bằng Turnstile + validation.

**Kết quả:** Functions list hiện 4 function.  
**Lỗi CORS:** kiểm tra `_shared/cors.ts` và request OPTIONS.

---

## 9. Chạy local

```bash
# .env.local
VITE_APP_NAME=VietGo Japan
VITE_APP_URL=http://localhost:5173
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_TURNSTILE_SITE_KEY=0x...

npm run dev
```

**Kết quả:** http://localhost:5173 mở được tiếng Việt.  
**Lỗi blank:** xem console; thiếu env → form báo “chưa cấu hình backend”.

---

## 10. Test

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

E2E (sau build):

```bash
npx playwright install chromium
npm run test:e2e
```

---

## 11. GitHub

```bash
git init
git add .
git commit -m "chore: initialize VietGo Japan"
git branch -M main
# Cài GitHub CLI nếu chưa có: https://cli.github.com
gh auth login
gh repo create vietgo-japan --private --source=. --remote=origin --push
```

**Không** commit `.env.local`.  
CI: `.github/workflows/ci.yml` chạy lint/typecheck/test/build trên PR và main. **Không** auto-deploy production từ PR.

---

## 12. Cloudflare Pages

**Mục tiêu:** Host frontend miễn phí.

```bash
npm run build
npx wrangler login
npx wrangler pages project create vietgo-japan
npx wrangler pages deploy dist --project-name vietgo-japan
```

Hoặc kết nối GitHub repo trong Cloudflare Dashboard:

- Build command: `npm run build`
- Output: `dist`
- Node 20

Env (Production + Preview):

- `VITE_APP_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_TURNSTILE_SITE_KEY`
- (optional) `VITE_CONTACT_*`

**Rebuild** sau khi thêm env (Vite bake env lúc build).

**Kết quả:** URL `*.pages.dev`.  
**Lỗi 404 deep link:** đã có `public/_redirects` SPA fallback.

---

## 13. Custom domain

1. Domain trên Cloudflare DNS.
2. Pages → Custom domains → add `example.jp` + `www`.
3. Chọn canonical, redirect domain còn lại.
4. HTTPS auto.
5. Cập nhật Supabase Auth URLs, Turnstile hostnames, Resend DNS, `VITE_APP_URL`, sitemap/robots `YOUR_DOMAIN`.

**Không** hoàn tất domain nếu user chưa sở hữu/phê duyệt DNS.

---

## 14. Backup & restore

**Backup:**

```bash
supabase db dump -f backup.sql
# hoặc Dashboard → Database → Backups (paid plans)
```

**Restore:**

```bash
psql <connection> -f backup.sql
# hoặc point-in-time recovery trên gói trả phí
```

**Lỗi pause free tier:** project sleep sau idle → mở Dashboard wake-up; cân nhắc pro nếu production 24/7.

---

## 15. Cập nhật production

1. PR → CI green → merge `main`.
2. `supabase db push` cho migration mới.
3. `supabase functions deploy …`
4. Cloudflare Pages auto build (nếu connected) hoặc `wrangler pages deploy`.

**Rollback frontend:** Cloudflare Pages → Deployments → Retry previous.  
**Rollback DB:** migration reverse thủ công / restore backup (lên kế hoạch trước).

---

## 16. Logs

- Supabase → Edge Functions → Logs  
- Cloudflare Pages → Deployments → build log  
- Browser Network tab (không dán secret)

---

## 17. Khi nào nâng cấp trả phí

| Nhu cầu | Gợi ý |
|---------|--------|
| DB sleep / always-on | Supabase Pro |
| Email volume lớn | Resend paid |
| Custom domain enterprise SSL | thường free trên CF |
| Stripe online pay | sau khi legal OK |
| Maps tiles API | khi cần autocomplete |

**Không** tự nâng cấp / nhập thẻ trong automation này.

---

## 18. Checklist trước mở website thật

- [ ] Điền tên pháp nhân, địa chỉ, SĐT, email thật
- [ ] Nhập & xác minh giấy phép vận tải
- [ ] Tắt mọi claim “licensed” giả
- [ ] Rà soát terms/privacy (luật sư nếu cần)
- [ ] Tên dịch vụ BHP chính thức
- [ ] Turnstile + Resend production
- [ ] RLS smoke test 2 user
- [ ] Booking E2E + email
- [ ] Mobile UI + VI/JA
- [ ] Không secret trong git
- [ ] Backup plan
- [ ] Admin account không dùng password demo

---

## Secrets inventory

| Secret | Where |
|--------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | Edge / CI only |
| `TURNSTILE_SECRET_KEY` | Supabase secrets |
| `RESEND_API_KEY` | Supabase secrets |
| `RESEND_FROM_EMAIL` | Supabase secrets |
| `ADMIN_NOTIFICATION_EMAIL` | Supabase secrets |
| `CLOUDFLARE_API_TOKEN` | CI deploy only if used |
| `VITE_SUPABASE_ANON_KEY` | Frontend (public) |
| `VITE_TURNSTILE_SITE_KEY` | Frontend (public) |

---

## Chi phí hiện tại (ước tính free-tier)

- Cloudflare Pages: free  
- Supabase free: có giới hạn pause/size  
- Turnstile: free tier  
- Resend: free tier limited  
- Domain: **không mua** trong phạm vi project này  

Cập nhật chi phí khi user chọn gói trả phí.
