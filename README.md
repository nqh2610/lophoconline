# 🎓 LopHoc.Online - Nền tảng kết nối gia sư với học viên

Ứng dụng web kết nối gia sư với học viên, được xây dựng với **React.js + Express.js + MySQL**

## 📋 Yêu cầu hệ thống

- **Node.js** >= 18.0
- **MySQL** >= 8.0
- **npm** hoặc **yarn**

## 🚀 Cài đặt và chạy trên máy local

### Bước 1: Tải mã nguồn về máy

Download ZIP từ Replit hoặc clone repository

### Bước 2: Sửa 2 file cấu hình

#### 2.1. Sửa file `package.json`

Mở file `package.json`, tìm và **XÓA** dòng sau:
```json
"@neondatabase/serverless": "^0.10.4",
```

Sau đó **THÊM** dòng này vào đúng chỗ đó (trong phần "dependencies"):
```json
"mysql2": "^3.11.0",
```

Lưu file lại.

#### 2.2. Sửa file `drizzle.config.ts`

Mở file `drizzle.config.ts`, tìm dòng:
```typescript
dialect: "postgresql",
```

**THAY** bằng:
```typescript
dialect: "mysql",
```

### Bước 3: Cài đặt packages

```bash
npm install
```

### Bước 4: Tạo database MySQL

Mở **MySQL Command Line** hoặc **MySQL Workbench**, chạy:

```sql
CREATE DATABASE lophoc_online CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Bước 5: Tạo file .env

Tạo file `.env` trong thư mục gốc với nội dung:

```bash
DATABASE_URL=mysql://root:mat_khau_cua_ban@localhost:3306/lophoc_online
SESSION_SECRET=abc123xyz789randomsecret12345678901234567890
NODE_ENV=development
```

⚠️ **Thay đổi:**
- `root` → username MySQL của bạn (thường là `root`)
- `mat_khau_cua_ban` → mật khẩu MySQL của bạn
- `abc123xyz...` → chuỗi bí mật bất kỳ (ít nhất 32 ký tự)

### Bước 6: Tạo bảng trong database

```bash
npm run db:push
```

Nếu gặp lỗi, chạy:
```bash
npm run db:push -- --force
```

### Bước 7: Chạy ứng dụng

```bash
npm run dev
```

### Bước 8: Mở trình duyệt

Truy cập: **http://localhost:5000**

🎉 **Xong!** Ứng dụng đã chạy thành công!

---

## 🛠️ Công nghệ sử dụng

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Shadcn/ui
- **Backend:** Express.js + TypeScript
- **Database:** MySQL 8.0
- **ORM:** Drizzle ORM
- **Rich Text:** TipTap Editor

## 📁 Cấu trúc project

```
lophoc-online/
├── client/          # Frontend React
│   └── src/
│       ├── components/
│       ├── pages/
│       └── lib/
├── server/          # Backend Express
│   ├── db.ts       # MySQL connection
│   ├── routes.ts   # API routes
│   └── index.ts
├── shared/          # Shared types
│   └── schema.ts   # Database schema (MySQL)
├── package.json
├── drizzle.config.ts
└── .env            # Biến môi trường (tự tạo)
```

## ✨ Tính năng chính

✅ Đăng ký/đăng nhập gia sư và học viên  
✅ Tìm kiếm gia sư với bộ lọc thông minh  
✅ Rich Text Editor cho hồ sơ gia sư  
✅ Đặt lịch học với gói subscription (1-12 tháng)  
✅ Chọn nhiều môn học trong 1 lần đặt  
✅ Thanh toán QR code (VietQR)  
✅ Quản lý lịch học cho gia sư và học viên  
✅ Hệ thống đánh giá và phản hồi  

## 🔧 Lệnh hữu ích

```bash
npm run dev        # Chạy development server
npm run build      # Build production
npm start          # Chạy production server
npm run check      # TypeScript type checking
npm run db:push    # Sync database schema
```

## 🐛 Khắc phục sự cố

### ❌ Lỗi: "Client does not support authentication protocol"

**Giải pháp:**
```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'mat_khau_cua_ban';
FLUSH PRIVILEGES;
```

### ❌ Lỗi: "Access denied for user"

**Giải pháp:**
- Kiểm tra username/password trong file `.env`
- Test kết nối: `mysql -u root -p`

### ❌ Lỗi: "Unknown database 'lophoc_online'"

**Giải pháp:**
```sql
CREATE DATABASE lophoc_online CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### ❌ Lỗi: "Port 5000 already in use"

**Giải pháp:**
```bash
# Tìm process đang dùng port 5000
# Windows
netstat -ano | findstr :5000

# macOS/Linux
lsof -i :5000

# Hoặc đổi port trong server/index.ts
```

## 📝 Checklist hoàn thành

- [ ] Download mã nguồn về máy
- [ ] Sửa `package.json` (xóa @neondatabase/serverless, thêm mysql2)
- [ ] Sửa `drizzle.config.ts` (dialect: "mysql")
- [ ] Chạy `npm install`
- [ ] Tạo database `lophoc_online` trong MySQL
- [ ] Tạo file `.env` với thông tin MySQL
- [ ] Chạy `npm run db:push`
- [ ] Chạy `npm run dev`
- [ ] Mở http://localhost:5000 và test

## 🔐 Bảo mật

⚠️ **Quan trọng:**
- KHÔNG commit file `.env` lên Git
- Đổi `SESSION_SECRET` thành chuỗi ngẫu nhiên
- Sử dụng mật khẩu mạnh cho MySQL

## 📞 Liên hệ

- **Email:** support@lophoc.online
- **Website:** https://lophoc.online

---

<div align="center">

**Được phát triển với ❤️ cho cộng đồng giáo dục Việt Nam**

**React.js + Express.js + MySQL** 🚀

</div>
