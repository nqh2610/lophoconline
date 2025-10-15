# ✅ Hướng dẫn MySQL - Hoàn chỉnh 100%

## 🎯 Tổng quan

Mã nguồn **LopHoc.Online** đã được chuẩn bị đầy đủ để tương thích với **MySQL**. Bạn có thể chọn:
- **Option 1:** PostgreSQL (mặc định)
- **Option 2:** MySQL (với đầy đủ file và scripts hỗ trợ)

## 📚 Tài liệu hỗ trợ MySQL

### 📖 Hướng dẫn chi tiết (3 file)

| File | Mô tả | Dùng khi nào |
|------|-------|--------------|
| **[HUONG_DAN_MYSQL.md](./HUONG_DAN_MYSQL.md)** | Hướng dẫn đầy đủ, từng bước chi tiết | Lần đầu setup MySQL |
| **[CHUYEN_DOI_MYSQL_NHANH.md](./CHUYEN_DOI_MYSQL_NHANH.md)** | Hướng dẫn nhanh 5 bước + checklist | Đã biết cách, cần nhanh |
| **[DANH_SACH_FILE_MYSQL.md](./DANH_SACH_FILE_MYSQL.md)** | Tổng quan tất cả file và so sánh | Tìm hiểu cấu trúc |

### 🔧 File cấu hình MySQL (4 file)

| File mẫu MySQL | Thay thế file gốc | Mục đích |
|----------------|-------------------|----------|
| `drizzle.config.mysql.ts` | `drizzle.config.ts` | Cấu hình Drizzle ORM |
| `server/db.mysql.ts` | `server/db.ts` | Kết nối MySQL |
| `shared/schema.mysql.ts` | `shared/schema.ts` | Schema tables |
| `.env.mysql.example` | `.env` | Template biến môi trường |

### 🤖 Scripts tự động (2 file)

| Script | Mô tả |
|--------|-------|
| `scripts/switch-to-mysql.js` | Tự động chuyển sang MySQL |
| `scripts/switch-to-postgres.js` | Tự động quay lại PostgreSQL |
| `scripts/README_SCRIPTS.md` | Hướng dẫn sử dụng scripts |

## 🚀 3 Cách chuyển sang MySQL

### 🤖 Cách 1: Dùng Script Tự Động (KHUYÊN DÙNG)

```bash
# 1. Chạy script chuyển đổi
node scripts/switch-to-mysql.js

# 2. Cài packages
npm install

# 3. Tạo database
mysql -u root -p
CREATE DATABASE lophoc_online CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit

# 4. Tạo .env
cp .env.mysql.example .env
# Sửa thông tin MySQL trong .env

# 5. Tạo bảng và chạy
npm run db:push
npm run dev
```

### ⚡ Cách 2: Copy thủ công nhanh

```bash
# 1. Backup file gốc
cp drizzle.config.ts drizzle.config.postgres.backup.ts
cp server/db.ts server/db.postgres.backup.ts
cp shared/schema.ts shared/schema.postgres.backup.ts

# 2. Copy file MySQL
cp drizzle.config.mysql.ts drizzle.config.ts
cp server/db.mysql.ts server/db.ts
cp shared/schema.mysql.ts shared/schema.ts

# 3. Cập nhật package.json
# Xóa: "@neondatabase/serverless": "^0.10.4"
# Thêm: "mysql2": "^3.11.0"

# 4. Cài và chạy
npm install
# Tạo database + .env
npm run db:push
npm run dev
```

### 📖 Cách 3: Làm theo hướng dẫn chi tiết

Xem file: **[HUONG_DAN_MYSQL.md](./HUONG_DAN_MYSQL.md)**

## 📋 Checklist đầy đủ

### Trước khi bắt đầu:
- [ ] Đã cài MySQL >= 8.0
- [ ] Đã download mã nguồn về máy
- [ ] Đã backup file gốc (nếu cần)

### Chuyển đổi:
- [ ] Chạy script hoặc copy file thủ công
- [ ] Sửa package.json (xóa @neondatabase/serverless, thêm mysql2)
- [ ] Chạy `npm install`
- [ ] Tạo database `lophoc_online` trong MySQL
- [ ] Tạo file `.env` với MySQL connection string
- [ ] Chạy `npm run db:push`
- [ ] Chạy `npm run dev`

### Kiểm tra:
- [ ] App chạy tại http://localhost:5000
- [ ] Database có 3 bảng: users, tutor_availability, lessons
- [ ] Không có lỗi trong console/terminal

## 🔍 So sánh thay đổi chính

### 1. Dependencies
```diff
# package.json
- "@neondatabase/serverless": "^0.10.4",
+ "mysql2": "^3.11.0",
```

### 2. Config
```diff
# drizzle.config.ts
- dialect: "postgresql",
+ dialect: "mysql",
```

### 3. Database Connection
```diff
# server/db.ts
- import { Pool } from '@neondatabase/serverless';
- import { drizzle } from 'drizzle-orm/neon-serverless';
+ import mysql from 'mysql2/promise';
+ import { drizzle } from 'drizzle-orm/mysql2';
```

### 4. Schema
```diff
# shared/schema.ts
- import { pgTable, text, integer } from "drizzle-orm/pg-core";
+ import { mysqlTable, varchar, int } from "drizzle-orm/mysql-core";

- export const users = pgTable("users", {
+ export const users = mysqlTable("users", {
```

### 5. Environment
```diff
# .env
- DATABASE_URL=postgresql://user:pass@localhost:5432/lophoc_online
+ DATABASE_URL=mysql://root:pass@localhost:3306/lophoc_online
```

## 💡 Lợi ích MySQL

✅ Dễ cài đặt trên Windows  
✅ Quen thuộc với nhiều developer  
✅ Performance tốt cho read-heavy apps  
✅ Hỗ trợ rộng rãi trên hosting  
✅ Công cụ quản lý GUI nhiều (MySQL Workbench, phpMyAdmin)

## 🔄 Quay lại PostgreSQL

Nếu muốn quay lại PostgreSQL:

```bash
# Cách 1: Dùng script
node scripts/switch-to-postgres.js
npm install
npm run db:push
npm run dev

# Cách 2: Restore từ backup
cp drizzle.config.postgres.backup.ts drizzle.config.ts
cp server/db.postgres.backup.ts server/db.ts
cp shared/schema.postgres.backup.ts shared/schema.ts
# Sửa package.json, cài lại npm install
```

## 🐛 Khắc phục sự cố nhanh

### Lỗi Authentication
```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

### Lỗi Connection
- Kiểm tra MySQL đang chạy: `mysql -u root -p`
- Kiểm tra DATABASE_URL trong .env

### Lỗi db:push
```bash
npm run db:push -- --force
```

## 📞 Hỗ trợ thêm

- 📖 [HUONG_DAN_MYSQL.md](./HUONG_DAN_MYSQL.md) - Chi tiết đầy đủ
- ⚡ [CHUYEN_DOI_MYSQL_NHANH.md](./CHUYEN_DOI_MYSQL_NHANH.md) - Nhanh gọn
- 📋 [DANH_SACH_FILE_MYSQL.md](./DANH_SACH_FILE_MYSQL.md) - Tổng quan
- 🤖 [scripts/README_SCRIPTS.md](./scripts/README_SCRIPTS.md) - Script usage

## ✨ Tóm tắt

**Đã chuẩn bị:**
- ✅ 3 file hướng dẫn chi tiết
- ✅ 4 file cấu hình MySQL hoàn chỉnh
- ✅ 2 scripts tự động chuyển đổi
- ✅ Template .env cho MySQL
- ✅ Hướng dẫn khắc phục sự cố
- ✅ Checklist đầy đủ

**Bạn chỉ cần:**
1. Chọn 1 trong 3 cách setup
2. Làm theo hướng dẫn
3. Chạy app thành công! 🎉

---

**Chúc bạn thành công với MySQL!** 🐬🚀
