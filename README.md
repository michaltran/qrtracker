# QR Tracker – Demo Giảng Dạy An Toàn Thông Tin

Hệ thống tạo QR code tracking: học viên quét → được redirect đến tài liệu thật → admin thấy IP, thiết bị, OS, trình duyệt realtime.

## Stack
- **Next.js 14** (App Router) — frontend + API routes
- **Neon DB** (PostgreSQL serverless) — lưu QR codes + scan logs
- **Vercel** — deploy, edge network
- **qrcode** — generate QR PNG

---

## 🚀 Deploy lên Vercel + Neon (15 phút)

### Bước 1 – Tạo Neon Database

1. Đăng ký tại https://neon.tech (miễn phí)
2. Tạo Project mới → chọn region **Singapore** (gần VN nhất)
3. Vào **Dashboard → Connection string** → copy chuỗi dạng:
   ```
   postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

### Bước 2 – Setup local

```bash
git clone <repo>
cd qr-tracker
npm install

# Tạo file env
cp .env.local.example .env.local
# Điền DATABASE_URL và ADMIN_TOKEN vào .env.local

# Khởi tạo database (chạy 1 lần)
node lib/init-db.js

# Chạy local
npm run dev
```

Mở http://localhost:3000/dashboard

### Bước 3 – Deploy lên Vercel

```bash
npm install -g vercel
vercel login
vercel

# Khi hỏi settings, nhấn Enter để dùng mặc định
```

Sau đó vào **Vercel Dashboard → Settings → Environment Variables** và thêm:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | chuỗi connection Neon |
| `ADMIN_TOKEN` | mật khẩu bạn tự đặt |
| `NEXT_PUBLIC_BASE_URL` | https://your-app.vercel.app |
| `NEXT_PUBLIC_ADMIN_TOKEN` | giống ADMIN_TOKEN |

Chạy lại deploy: `vercel --prod`

---

## 📖 Cách sử dụng trong lớp

### Tạo QR code cho tài liệu

1. Mở `/dashboard` → tab **Tạo QR**
2. Điền tên, URL tài liệu thật (PDF, Google Drive, YouTube...)
3. Nhấn **Tạo QR Code** → download ảnh PNG
4. In hoặc chiếu QR code lên màn hình

### Chiếu dashboard cho học viên

1. Mở `/dashboard` → tab **Nhật ký quét**
2. Chiếu màn hình — bảng tự cập nhật mỗi 3 giây
3. Mỗi khi học viên quét, một dòng mới xuất hiện với IP và thông tin thiết bị

---

## 🔍 Luồng hoạt động

```
Học viên quét QR
       │
       ▼
/q/{id}  (Next.js page)
       │ JS thu thập: screen resolution, timezone
       │
       ▼
POST /api/track
       │ Server thu thập: IP, User-Agent (OS, browser, device)
       │ → Lưu vào Neon DB
       │
       ▼
302 Redirect → URL tài liệu thật
       │
       ▼
Học viên thấy tài liệu bình thường ✅
Admin thấy log realtime ✅
```

---

## 📊 Dữ liệu thu thập được

| Dữ liệu | Nguồn | Độ chính xác |
|---------|-------|--------------|
| Địa chỉ IP | HTTP header | Chính xác |
| Hệ điều hành | User-Agent | Cao |
| Trình duyệt | User-Agent | Cao |
| Loại thiết bị | User-Agent | Trung bình |
| Độ phân giải màn hình | JavaScript | Chính xác |
| Múi giờ | JavaScript | Chính xác |
| Ngôn ngữ | Accept-Language header | Chính xác |
| Thời điểm quét | Server timestamp | Chính xác |

---

## 🔒 Bảo mật

- Dashboard bảo vệ bằng `ADMIN_TOKEN` — không public
- Không lưu nội dung trang web học viên đang xem
- Chỉ dùng cho mục đích giảng dạy với sự đồng ý của học viên
- Xoá log sau buổi học nếu cần: nút 🗑 trong tab QR Codes

---

## API Reference

```
GET  /api/track/{id}       # Redirect + log (từ QR code trực tiếp)
POST /api/track            # Log với dữ liệu JS + trả về redirect URL
GET  /api/admin?token=xxx  # Lấy tất cả logs, stats, qrcodes
POST /api/admin?token=xxx  # Tạo QR code mới
DELETE /api/admin?token=xxx&qr_id=xxx  # Xoá QR code
```
