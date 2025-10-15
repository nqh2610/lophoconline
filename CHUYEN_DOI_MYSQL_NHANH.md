# ⚡ Chuyển đổi sang MySQL - Hướng dẫn nhanh

## 🎯 TÓM TẮT 5 BƯỚC

### ✅ Bước 1: Cập nhật package.json

Mở `package.json`, tìm và **XÓA**:
```json
"@neondatabase/serverless": "^0.10.4",
```

**THÊM** vào chỗ dependencies:
```json
"mysql2": "^3.11.0",
```

Sau đó chạy:
```bash
npm install
```

---

### ✅ Bước 2: Thay thế 3 file cấu hình

#### 2.1. File `drizzle.config.ts`
Copy nội dung từ `drizzle.config.mysql.ts` và paste vào `drizzle.config.ts`

#### 2.2. File `server/db.ts`
Copy nội dung từ `server/db.mysql.ts` và paste vào `server/db.ts`

#### 2.3. File `shared/schema.ts`
Copy nội dung từ `shared/schema.mysql.ts` và paste vào `shared/schema.ts`

---

### ✅ Bước 3: Tạo database MySQL

Mở MySQL Command Line và chạy:
```sql
CREATE DATABASE lophoc_online CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

### ✅ Bước 4: Cấu hình file .env

Tạo file `.env` với nội dung:
```bash
DATABASE_URL=mysql://root:your_password@localhost:3306/lophoc_online
SESSION_SECRET=your-random-secret-32-chars-minimum
NODE_ENV=development
```

**Thay đổi:**
- `root` → username MySQL của bạn
- `your_password` → password MySQL của bạn

---

### ✅ Bước 5: Tạo bảng và chạy app

```bash
# Tạo bảng
npm run db:push

# Chạy ứng dụng
npm run dev
```

Mở trình duyệt: **http://localhost:5000** 🎉

---

## 📋 Checklist nhanh

- [ ] Xóa `@neondatabase/serverless`, thêm `mysql2` trong package.json
- [ ] Chạy `npm install`
- [ ] Copy nội dung 3 file `.mysql.ts` vào 3 file chính
- [ ] Tạo database `lophoc_online` trong MySQL
- [ ] Tạo file `.env` với MySQL connection string
- [ ] Chạy `npm run db:push`
- [ ] Chạy `npm run dev`
- [ ] Truy cập http://localhost:5000

---

## 🚨 Nếu gặp lỗi

### Lỗi authentication protocol:
```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

### Lỗi khi db:push:
```bash
npm run db:push -- --force
```

### Lỗi connection:
- Kiểm tra MySQL đang chạy: `mysql -u root -p`
- Kiểm tra DATABASE_URL trong .env

---

## 📁 Các file đã tạo sẵn cho bạn

| File gốc (PostgreSQL) | File mẫu (MySQL) | Mô tả |
|----------------------|------------------|-------|
| `drizzle.config.ts` | `drizzle.config.mysql.ts` | Cấu hình Drizzle |
| `server/db.ts` | `server/db.mysql.ts` | Kết nối database |
| `shared/schema.ts` | `shared/schema.mysql.ts` | Schema tables |
| `.env.example` | `.env.mysql.example` | Template biến môi trường |

**Lưu ý:** File mẫu có đuôi `.mysql.ts` - copy nội dung vào file chính!

---

## 🎓 Tài liệu chi tiết

Xem hướng dẫn đầy đủ tại: **[HUONG_DAN_MYSQL.md](./HUONG_DAN_MYSQL.md)**

---

**Chúc bạn chuyển đổi thành công!** 🚀
