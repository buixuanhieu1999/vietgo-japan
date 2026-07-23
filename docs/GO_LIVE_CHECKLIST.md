# Checklist gửi website cho khách hàng

Site: **https://vietgo-japan.pages.dev/**

## 1. Turnstile (bắt buộc — lỗi “Không thể kết nối tới trang web”)

1. Mở [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Chọn widget đã tạo
3. **Hostname Management** phải có **đúng**:
   - `vietgo-japan.pages.dev`  ← quan trọng nhất
   - `localhost` (dev)
   - `127.0.0.1` (tuỳ chọn)
4. **Không** ghi `https://` hoặc đường dẫn `/dat-xe`
5. Lưu → đợi 1–2 phút
6. Mở Chrome (không Facebook/LINE in-app) → https://vietgo-japan.pages.dev/dat-xe → Ctrl+F5

Nếu vẫn lỗi: hostname widget ≠ domain đang mở (vd. mở preview `xxxx.vietgo-japan.pages.dev` thì phải thêm hostname đó hoặc chỉ dùng URL production).

## 2. Supabase Auth URL

Dashboard → Authentication → URL configuration:

- Site URL: `https://vietgo-japan.pages.dev`
- Redirect URLs:
  - `https://vietgo-japan.pages.dev/**`
  - `http://localhost:5173/**`

## 3. Nội dung doanh nghiệp (trước khi “mở thật”)

Trong Admin hoặc env, cập nhật placeholder:

- Tên pháp nhân, địa chỉ Nagoya, SĐT, email, LINE
- Giấy phép vận tải (chỉ public khi đã verified)
- Rà soát trang pháp lý

## 4. Email (tuỳ chọn nhưng nên có)

- Resend domain + `RESEND_API_KEY` + `RESEND_FROM_EMAIL`
- `ADMIN_NOTIFICATION_EMAIL`

Không có email vẫn đặt xe được; khách không nhận mail xác nhận.

## 5. Smoke test trước khi gửi link

- [ ] Trang chủ mở được (VI / JA)
- [ ] Form đặt xe + Turnstile OK + gửi thành công → có mã booking
- [ ] Tra cứu booking bằng mã + email/SĐT
- [ ] Liên hệ gửi được
- [ ] Hỗ trợ hồ sơ gửi được
- [ ] Đăng nhập admin → `/quan-tri`
- [ ] Mobile: menu + nút gọi (nếu đã cấu hình SĐT)

## 6. Link gửi khách

Chỉ gửi:

**https://vietgo-japan.pages.dev/**

Không gửi link preview dạng `https://xxxxx.vietgo-japan.pages.dev` trừ khi đã thêm hostname đó vào Turnstile.

## 7. Admin

- URL: https://vietgo-japan.pages.dev/dang-nhap
- Email admin đã tạo: `admin@vietgojapan.local` (đổi mật khẩu / tạo email thật khi ổn định)
- Panel: https://vietgo-japan.pages.dev/quan-tri

## 8. Giới hạn free-tier

- Supabase free: có thể **pause sau ~7 ngày idle** → mở Dashboard để wake
- Nên nâng Pro khi có khách thật 24/7
