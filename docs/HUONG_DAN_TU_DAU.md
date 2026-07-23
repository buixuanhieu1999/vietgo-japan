# VietGo Japan — Hướng dẫn từ đầu (chưa deploy)

Tài liệu này coi như **bạn bắt đầu từ máy có source code**, chưa có project cloud, chưa có key.  
Làm **tuần tự từng bước**. Không bỏ qua bước “đăng nhập”.

---

## 0. Bạn sẽ có những gì khi xong

| Thành phần | URL / chỗ lưu |
|------------|----------------|
| Website | `https://vietgo-japan.pages.dev` (hoặc tên project Pages bạn chọn) |
| Backend | Supabase project |
| Code | GitHub private repo |
| Admin | Email + mật khẩu bạn tự tạo |
| Form chống bot | Cloudflare Turnstile |
| Email (tuỳ chọn) | Resend |

**Chi phí pilot:** chủ yếu free-tier. Free **không** = SLA production 24/7 mãi mãi (Supabase free có thể pause sau ~7 ngày idle).

---

## 1. Cài phần mềm trên máy Windows

### 1.1. Node.js 20+

1. Mở https://nodejs.org  
2. Tải **LTS** → cài  
3. Mở PowerShell mới:

```powershell
node -v
npm -v
```

**Mong đợi:** `v20.x` trở lên, npm `10.x`.

**Lỗi:** `node` không nhận → đóng hết terminal, mở lại, hoặc restart máy.

### 1.2. Git

1. https://git-scm.com  
2. Cài mặc định  
3. `git --version`

### 1.3. GitHub CLI (`gh`)

```powershell
winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements
```

Đóng terminal → mở terminal mới:

```powershell
# Nếu vẫn không nhận gh:
& "C:\Program Files\GitHub CLI\gh.exe" --version
```

### 1.4. (Khuyến nghị) Thư mục project

```powershell
cd C:\Users\AD\japan
# hoặc clone repo nếu đã có trên GitHub
```

```powershell
npm install
```

**Mong đợi:** xong không lỗi đỏ nghiêm trọng.

---

## 2. Đăng nhập GitHub + đẩy code

### 2.1. Login GitHub

```powershell
gh auth login
```

Chọn lần lượt:

1. **GitHub.com**  
2. **HTTPS**  
3. **Login with a web browser**  
4. Copy code → Enter → dán trên trình duyệt → Authorize  

Kiểm tra:

```powershell
gh auth status
```

**Mong đợi:** thấy username GitHub, `Logged in`.

### 2.2. Tạo repo private + push (lần đầu)

```powershell
cd C:\Users\AD\japan
git status
# nếu chưa có remote:
gh repo create vietgo-japan --private --source=. --remote=origin --push
```

Nếu repo đã tồn tại:

```powershell
git remote add origin https://github.com/<USER>/vietgo-japan.git
git branch -M main
git push -u origin main
```

**Mong đợi:** mở được `https://github.com/<USER>/vietgo-japan` (private).

**Không commit file:** `.env`, `.env.local` (đã có trong `.gitignore`).

---

## 3. Supabase (database + auth + edge functions)

### 3.1. Tạo account + project

1. Mở https://supabase.com → **Start your project**  
2. Đăng nhập (GitHub/Google)  
3. **New project**  
   - Name: `vietgo-japan`  
   - Database password: **lưu mật khẩu này** (không mất)  
   - Region: gần Nhật (vd. Northeast Asia / Seoul / Tokyo nếu có)  
4. Đợi project **Healthy** (~2 phút)

### 3.2. Lấy API keys (anon + service_role)

1. Dashboard → **Project Settings** (bánh răng)  
2. **API**  
3. Copy và lưu tạm (Notepad, **không** gửi public chat nếu có thể):

| Key | Dùng ở đâu | Public? |
|-----|------------|---------|
| **Project URL** | `https://xxxxx.supabase.co` | Có (frontend) |
| **anon public** | Frontend `VITE_SUPABASE_ANON_KEY` | Có (có RLS) |
| **service_role** | Chỉ Edge Function / CLI server | **KHÔNG** đưa vào frontend / Git |

### 3.3. Login Supabase CLI + link project

```powershell
cd C:\Users\AD\japan
npx supabase login
```

→ Mở browser, **Authorize**.

Lấy **Project ref** (chuỗi ngắn trong URL dashboard):  
`https://supabase.com/dashboard/project/xwjjmhvmmfihnmlxzldu`  
→ ref = `xwjjmhvmmfihnmlxzldu`

```powershell
npx supabase link --project-ref <PROJECT_REF>
```

**Mong đợi:** `Finished supabase link.`

### 3.4. Chạy migration (tạo bảng + RLS + PostGIS…)

```powershell
npx supabase db push --yes
```

**Mong đợi:** các file trong `supabase/migrations/` apply xong, không ERROR.

**Lỗi thường gặp:**

| Lỗi | Xử lý |
|-----|--------|
| Not logged in | `npx supabase login` lại |
| `.env.local` parse error | Xóa/sửa file UTF-8 không BOM, hoặc tạm rename `.env.local` |
| Extension postgis | Free Supabase hỗ trợ; thử lại / check Database → Extensions |

### 3.5. Seed dữ liệu mẫu (tỉnh, sân bay, FAQ…)

Cách A — SQL Editor (dễ nhất):

1. Dashboard → **SQL** → New query  
2. Mở file local `supabase/seed.sql` → copy toàn bộ → Run  

Cách B — CLI (nếu `db query` hoạt động):

```powershell
npx supabase db query --linked --yes --file supabase/seed.sql
```

**Mong đợi:** 47 tỉnh, 7 sân bay, FAQ, trang pháp lý placeholder.

### 3.6. Deploy Edge Functions

```powershell
npx supabase functions deploy create-booking --no-verify-jwt
npx supabase functions deploy submit-contact --no-verify-jwt
npx supabase functions deploy submit-support --no-verify-jwt
npx supabase functions deploy lookup-booking --no-verify-jwt
npx supabase functions deploy geoapify-proxy --no-verify-jwt
```

`--no-verify-jwt`: cho phép **khách chưa login** gọi form (vẫn có Turnstile + validation).  
Identity khi đã login lấy từ JWT, **không** tin `user_id` client.

### 3.7. Auth URL (bắt buộc trước khi đăng nhập web)

Dashboard → **Authentication** → **URL Configuration**:

- **Site URL:** `https://vietgo-japan.pages.dev`  
  (local thêm sau: `http://localhost:5173`)  
- **Redirect URLs** (mỗi dòng một URL):

```text
https://vietgo-japan.pages.dev/**
http://localhost:5173/**
```

**Email confirm:** pilot có thể tắt *Confirm email* (Auth → Providers → Email) để dễ test; production nên bật lại.

---

## 4. Cloudflare (Pages + Turnstile)

### 4.1. Đăng nhập Cloudflare

1. https://dash.cloudflare.com → Sign up / Log in  
2. Không bắt buộc mua domain lúc đầu  

### 4.2. Login Wrangler (CLI deploy)

```powershell
npx wrangler login
```

Browser authorize → kiểm tra:

```powershell
npx wrangler whoami
```

### 4.3. Cloudflare Turnstile (chống bot form)

1. Dashboard → tìm **Turnstile**  
   Link nhanh: https://dash.cloudflare.com/?to=/:account/turnstile  
2. **Add widget**  
3. **Widget name:** `VietGo Japan`  
4. **Hostname Management** — thêm **không** có `https://`:

```text
vietgo-japan.pages.dev
localhost
127.0.0.1
```

5. Mode: **Managed**  
6. Create → copy:

| Key | Biến môi trường |
|-----|-----------------|
| **Site Key** (`0x4...`) | `VITE_TURNSTILE_SITE_KEY` (frontend) |
| **Secret Key** (`0x4...`) | `TURNSTILE_SECRET_KEY` (Supabase secrets only) |

**Lỗi “Không thể kết nối tới trang web” trên widget:**  
→ Hostname thiếu / sai domain (đang mở preview `xxx.vietgo-japan.pages.dev` thay vì production).

### 4.4. Gắn secret Turnstile vào Supabase

```powershell
npx supabase secrets set TURNSTILE_SECRET_KEY=<SECRET_KEY_THAT>
npx supabase secrets set TURNSTILE_SKIP_IN_DEV=false
npx supabase secrets set APP_URL=https://vietgo-japan.pages.dev
```

Tuỳ chọn email admin:

```powershell
npx supabase secrets set ADMIN_NOTIFICATION_EMAIL=ban@email.com
```

---

## 5. Resend (email xác nhận booking) — khuyến nghị

1. https://resend.com → Sign up  
2. **API Keys** → Create → copy `re_...`  
3. **Domains** → Add domain (cần domain riêng + DNS)  
   - Pilot: có thể dùng domain test của Resend (giới hạn)  

```powershell
npx supabase secrets set RESEND_API_KEY=re_xxxxx
npx supabase secrets set RESEND_FROM_EMAIL="VietGo Japan <noreply@yourdomain.com>"
```

**Không có Resend:** booking vẫn lưu DB; email có thể chỉ log console / fail êm.

---

## 6. Geoapify (bản đồ geocode) — tuỳ chọn

1. https://www.geoapify.com → đăng ký  
2. Tạo API key free  
3.

```powershell
npx supabase secrets set GEOAPIFY_API_KEY=your_key
```

Website vẫn chạy MapLibre + OpenFreeMap **không** bắt buộc key này.

---

## 7. File môi trường local (`.env.local`)

Trong `C:\Users\AD\japan` tạo file **`.env.local`** (UTF-8, không BOM):

```env
VITE_APP_NAME=VietGo Japan
VITE_APP_URL=http://localhost:5173
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<ANON_KEY>
VITE_TURNSTILE_SITE_KEY=<SITE_KEY>
VITE_CONTACT_PHONE=
VITE_CONTACT_EMAIL=
VITE_CONTACT_LINE_ID=
VITE_CONTACT_ADDRESS=
```

**Không** ghi `SERVICE_ROLE` vào file này.

Chạy local:

```powershell
npm run dev
```

Mở http://localhost:5173

---

## 8. Deploy frontend Cloudflare Pages

### 8.1. Build với biến production

PowerShell (thay giá trị thật):

```powershell
cd C:\Users\AD\japan

$env:VITE_APP_NAME = "VietGo Japan"
$env:VITE_APP_URL = "https://vietgo-japan.pages.dev"
$env:VITE_SUPABASE_URL = "https://<PROJECT_REF>.supabase.co"
$env:VITE_SUPABASE_ANON_KEY = "<ANON_KEY>"
$env:VITE_TURNSTILE_SITE_KEY = "<SITE_KEY>"

npm run build
```

**Mong đợi:** thư mục `dist/` tạo xong.

### 8.2. Tạo project Pages + deploy

```powershell
npx wrangler pages project create vietgo-japan --production-branch main
npx wrangler pages deploy dist --project-name vietgo-japan --branch main
```

**Mong đợi:** URL dạng `https://vietgo-japan.pages.dev`

### 8.3. (Tuỳ chọn) Kết nối GitHub auto-deploy

Cloudflare Dashboard → **Workers & Pages** → vietgo-japan → Settings:

- Build command: `npm run build`  
- Output: `dist`  
- Env variables (Production):

```text
VITE_APP_NAME=VietGo Japan
VITE_APP_URL=https://vietgo-japan.pages.dev
VITE_SUPABASE_URL=https://....supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_TURNSTILE_SITE_KEY=0x4...
```

**Mỗi lần đổi env Vite phải rebuild** (key bake lúc build).

---

## 9. Tạo tài khoản Admin

### 9.1. Đăng ký trên web

1. Mở `https://vietgo-japan.pages.dev/dang-ky`  
2. Email + mật khẩu **bạn tự chọn** (≥ 8 ký tự)  
3. Đăng ký thành công  

**Hoặc** Dashboard Supabase → Authentication → Users → Add user.

### 9.2. Promote super_admin (SQL Editor)

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'
FROM public.profiles
WHERE email = 'email-ban-vua-dang-ky@example.com'
ON CONFLICT (user_id, role) DO UPDATE SET revoked_at = NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM public.profiles
WHERE email = 'email-ban-vua-dang-ky@example.com'
ON CONFLICT (user_id, role) DO UPDATE SET revoked_at = NULL;
```

### 9.3. Đăng nhập admin

- https://vietgo-japan.pages.dev/dang-nhap  
- Vào https://vietgo-japan.pages.dev/quan-tri  

**Không** dùng password demo cứng trong repo production.

---

## 10. Checklist trước khi phục vụ khách

### 10.1. Kỹ thuật (bắt buộc)

- [ ] `npm run lint` / `typecheck` / `test` / `build` local OK  
- [ ] Migration + seed đã chạy  
- [ ] 4–5 Edge Functions deployed  
- [ ] Turnstile site + secret đúng, hostname `vietgo-japan.pages.dev`  
- [ ] Form `/dat-xe` hiện widget, **Ctrl+F5**, gửi được → có mã booking  
- [ ] Tra cứu booking (token hoặc mã + email/SĐT)  
- [ ] Customer không xem booking người khác (RLS)  
- [ ] Service role **không** nằm trong bundle frontend  
- [ ] Chỉ gửi khách URL: `https://vietgo-japan.pages.dev/` (không link preview `xxxxx.vietgo-japan.pages.dev`)

### 10.2. Pháp lý / nội dung (bắt buộc trước “kinh doanh thật”)

- [ ] Tên pháp nhân, địa chỉ Nagoya, SĐT, email, LINE thật  
- [ ] Giấy phép vận tải nhập + **verified** trước khi public claim “được cấp phép”  
- [ ] Rà soát Terms / Privacy / hủy / hoàn tiền (bản JP nếu cần)  
- [ ] Không tuyên bố tư vấn pháp lý cho hỗ trợ hồ sơ  
- [ ] Tên dịch vụ BHP chính thức  

### 10.3. Vận hành

- [ ] `scripts/backup-db.ps1` chạy thử dump  
- [ ] Biết cách wake Supabase nếu free pause  
- [ ] Admin đổi mật khẩu mạnh  
- [ ] `ADMIN_NOTIFICATION_EMAIL` nhận mail booking mới (nếu có Resend)

---

## 11. Bảng secret — nhớ vị trí

| Secret | Nơi cấu hình | Có vào Git? |
|--------|--------------|-------------|
| `VITE_SUPABASE_ANON_KEY` | Pages env / `.env.local` | Không (file local) |
| `VITE_TURNSTILE_SITE_KEY` | Pages env / `.env.local` | Không |
| `SUPABASE_SERVICE_ROLE_KEY` | Chỉ server Supabase | **Không** |
| `TURNSTILE_SECRET_KEY` | `supabase secrets set` | **Không** |
| `RESEND_API_KEY` | `supabase secrets set` | **Không** |
| `GEOAPIFY_API_KEY` | `supabase secrets set` | **Không** |
| `ADMIN_NOTIFICATION_EMAIL` | `supabase secrets set` | Không (email, không secret mạnh) |

Lệnh xem secrets đã set (không hiện full value):

```powershell
npx supabase secrets list
```

---

## 12. Lệnh “một màn hình” sau khi đã có key

Thay `<...>` bằng giá trị thật:

```powershell
cd C:\Users\AD\japan

# Secrets server
npx supabase secrets set TURNSTILE_SECRET_KEY=<TURNSTILE_SECRET>
npx supabase secrets set TURNSTILE_SKIP_IN_DEV=false
npx supabase secrets set APP_URL=https://vietgo-japan.pages.dev
npx supabase secrets set ADMIN_NOTIFICATION_EMAIL=<EMAIL>
# npx supabase secrets set RESEND_API_KEY=re_...
# npx supabase secrets set RESEND_FROM_EMAIL="VietGo <noreply@domain>"

# DB + functions (nếu chưa)
npx supabase db push --yes
npx supabase functions deploy create-booking --no-verify-jwt
npx supabase functions deploy submit-contact --no-verify-jwt
npx supabase functions deploy submit-support --no-verify-jwt
npx supabase functions deploy lookup-booking --no-verify-jwt

# Frontend
$env:VITE_APP_NAME="VietGo Japan"
$env:VITE_APP_URL="https://vietgo-japan.pages.dev"
$env:VITE_SUPABASE_URL="https://<REF>.supabase.co"
$env:VITE_SUPABASE_ANON_KEY="<ANON>"
$env:VITE_TURNSTILE_SITE_KEY="<SITE_KEY>"
npm run build
npx wrangler pages deploy dist --project-name vietgo-japan --branch main
```

---

## 13. Link quan trọng sau go-live

| Mục đích | URL |
|----------|-----|
| Trang chủ (gửi khách) | https://vietgo-japan.pages.dev/ |
| Đặt xe | /dat-xe |
| Tra cứu | /tra-cuu-booking |
| FAQ | /faq |
| Đăng nhập | /dang-nhap |
| Admin | /quan-tri |
| Supabase | https://supabase.com/dashboard/project/<REF> |
| Turnstile | Cloudflare → Turnstile |
| GitHub | https://github.com/<USER>/vietgo-japan |

---

## 14. Thứ tự ưu tiên nếu chỉ có 1 buổi

1. Supabase project + keys + `db push` + seed  
2. Turnstile site+secret + hostname  
3. Edge functions + secrets  
4. Build + Pages deploy  
5. Auth URL  
6. Tạo admin SQL  
7. Test đặt xe end-to-end  
8. (Sau) Resend, SĐT/LINE thật, giấy phép  

---

## 15. Liên quan tài liệu khác trong repo

| File | Nội dung |
|------|----------|
| `README_DEPLOY.md` | Deploy chi tiết + rollback |
| `docs/GO_LIVE_CHECKLIST.md` | Checklist ngắn |
| `docs/TURNSTILE.md` | Turnstile |
| `docs/MAP_AND_AI.md` | Bản đồ / AI |
| `docs/SECURITY_P0_RESPONSE.md` | Bảo mật đã harden |
| `docs/SECURITY_AND_RLS.md` | RLS |

---

**Cam kết trung thực:** Code + migration đã có sẵn trong repo. Guide này là **cách bật hệ thống sạch từ zero**.  
Trạng thái máy bạn **có thể đã deploy một phần** — nếu đã có project, chỉ làm các bước còn thiếu (Turnstile hostname, Auth URL, admin, Resend, thông tin pháp nhân).
