# 📋 Danh sách file hỗ trợ MySQL

## 📚 File hướng dẫn

| File | Mô tả | Khi nào dùng |
|------|-------|--------------|
| **[HUONG_DAN_MYSQL.md](./HUONG_DAN_MYSQL.md)** | Hướng dẫn đầy đủ và chi tiết | Đọc kỹ từng bước, khắc phục sự cố |
| **[CHUYEN_DOI_MYSQL_NHANH.md](./CHUYEN_DOI_MYSQL_NHANH.md)** | Hướng dẫn nhanh 5 bước | Đã biết cách làm, cần checklist |
| **[DANH_SACH_FILE_MYSQL.md](./DANH_SACH_FILE_MYSQL.md)** | File này - Tổng quan các file | Tìm hiểu có file gì |

## 🔧 File cấu hình mẫu (MySQL)

| File mẫu MySQL | File gốc cần thay thế | Mục đích |
|----------------|----------------------|----------|
| `drizzle.config.mysql.ts` | `drizzle.config.ts` | Cấu hình Drizzle ORM cho MySQL |
| `server/db.mysql.ts` | `server/db.ts` | Kết nối MySQL database |
| `shared/schema.mysql.ts` | `shared/schema.ts` | Schema tables cho MySQL |
| `.env.mysql.example` | `.env` | Template biến môi trường MySQL |

## 📝 File gốc (PostgreSQL - đang dùng)

| File | Mô tả |
|------|-------|
| `drizzle.config.ts` | Cấu hình Drizzle cho PostgreSQL |
| `server/db.ts` | Kết nối PostgreSQL |
| `shared/schema.ts` | Schema cho PostgreSQL |
| `.env.example` | Template cho PostgreSQL |

## ⚡ Cách chuyển đổi nhanh

### Cách 1: Copy-Paste (Đơn giản)

**Bước 1:** Backup các file gốc
```bash
cp drizzle.config.ts drizzle.config.ts.backup
cp server/db.ts server/db.ts.backup
cp shared/schema.ts shared/schema.ts.backup
```

**Bước 2:** Copy nội dung file MySQL vào file gốc
```bash
# Trên Linux/Mac:
cp drizzle.config.mysql.ts drizzle.config.ts
cp server/db.mysql.ts server/db.ts
cp shared/schema.mysql.ts shared/schema.ts
cp .env.mysql.example .env

# Trên Windows (PowerShell):
Copy-Item drizzle.config.mysql.ts drizzle.config.ts
Copy-Item server/db.mysql.ts server/db.ts
Copy-Item shared/schema.mysql.ts shared/schema.ts
Copy-Item .env.mysql.example .env
```

**Bước 3:** Sửa file `.env` với thông tin MySQL của bạn

**Bước 4:** Cài đặt và chạy
```bash
# Sửa package.json: xóa @neondatabase/serverless, thêm mysql2
npm install
npm run db:push
npm run dev
```

### Cách 2: Thủ công (Hiểu rõ hơn)

Xem hướng dẫn chi tiết tại: **[CHUYEN_DOI_MYSQL_NHANH.md](./CHUYEN_DOI_MYSQL_NHANH.md)**

## 🔍 So sánh thay đổi chính

### 1. Package Dependencies
```diff
# package.json
- "@neondatabase/serverless": "^0.10.4",
+ "mysql2": "^3.11.0",
```

### 2. Drizzle Config
```diff
# drizzle.config.ts
- dialect: "postgresql",
+ dialect: "mysql",
```

### 3. Database Connection
```diff
# server/db.ts
- import { Pool, neonConfig } from '@neondatabase/serverless';
- import { drizzle } from 'drizzle-orm/neon-serverless';
+ import { drizzle } from 'drizzle-orm/mysql2';
+ import mysql from 'mysql2/promise';
```

### 4. Schema Tables
```diff
# shared/schema.ts
- import { pgTable, text, varchar, integer, serial } from "drizzle-orm/pg-core";
+ import { mysqlTable, text, varchar, int, serial } from "drizzle-orm/mysql-core";

- export const users = pgTable("users", {
+ export const users = mysqlTable("users", {
```

### 5. Environment Variables
```diff
# .env
- DATABASE_URL=postgresql://user:pass@localhost:5432/lophoc_online
+ DATABASE_URL=mysql://root:pass@localhost:3306/lophoc_online
```

## ✅ Checklist hoàn thành

- [ ] Đọc hướng dẫn: HUONG_DAN_MYSQL.md hoặc CHUYEN_DOI_MYSQL_NHANH.md
- [ ] Backup các file gốc (PostgreSQL)
- [ ] Cài đặt MySQL trên máy (nếu chưa có)
- [ ] Sửa package.json (xóa @neondatabase/serverless, thêm mysql2)
- [ ] Chạy `npm install`
- [ ] Copy 3 file config từ `.mysql.ts` vào file gốc
- [ ] Tạo database trong MySQL
- [ ] Tạo file .env với MySQL connection string
- [ ] Chạy `npm run db:push`
- [ ] Chạy `npm run dev`
- [ ] Test ứng dụng tại http://localhost:5000

## 🚨 Lưu ý quan trọng

1. **Backup trước khi thay đổi!** Các file gốc đang dùng PostgreSQL
2. **File `.mysql.ts` chỉ là mẫu** - Phải copy vào file gốc
3. **Không commit `.env`** - File này chứa mật khẩu
4. **MySQL phải đang chạy** - Kiểm tra: `mysql -u root -p`

## 💡 Mẹo

- Nếu chỉ test MySQL, giữ nguyên file PostgreSQL và làm việc trên branch khác
- Dùng `.backup` extension để dễ rollback về PostgreSQL
- Kiểm tra MySQL version: `mysql --version` (nên >= 8.0)

## 📞 Khắc phục sự cố

Xem phần **"Khắc phục sự cố"** trong:
- [HUONG_DAN_MYSQL.md](./HUONG_DAN_MYSQL.md#-khắc-phục-sự-cố)

Các lỗi phổ biến:
- Authentication protocol → Xem hướng dẫn
- Access denied → Kiểm tra username/password
- Unknown database → Tạo database trước

---

**Chúc bạn chuyển đổi thành công!** 🎉
