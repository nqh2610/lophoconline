# 🐬 Hướng dẫn chạy LopHoc.Online với MySQL

## 📋 Yêu cầu hệ thống

- **Node.js** version 18 trở lên
- **MySQL** version 8.0 trở lên (hoặc MariaDB 10.5+)
- **npm** hoặc **yarn**

### Kiểm tra phiên bản:
```bash
node --version   # >= v18.0.0
npm --version    # >= 9.0.0
mysql --version  # >= 8.0
```

---

## 📥 Bước 1: Tải mã nguồn về máy

Giống như hướng dẫn PostgreSQL - chọn một trong 3 cách:
- Download ZIP từ Replit
- Git clone
- Copy thủ công

---

## 🔧 Bước 2: Chỉnh sửa cấu hình cho MySQL

### 2.1. Cập nhật dependencies

Mở file `package.json` và thay đổi:

**TÌM và XÓA dòng này:**
```json
"@neondatabase/serverless": "^0.10.4",
```

**THÊM dòng này vào chỗ dependencies:**
```json
"mysql2": "^3.11.0",
```

Sau đó chạy:
```bash
npm install
```

### 2.2. Cập nhật file `drizzle.config.ts`

Mở file `drizzle.config.ts` và thay toàn bộ nội dung bằng:

```typescript
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",  // THAY ĐỔI từ "postgresql" sang "mysql"
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
```

### 2.3. Cập nhật file `server/db.ts`

Mở file `server/db.ts` và thay toàn bộ nội dung bằng:

```typescript
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const connection = await mysql.createConnection(process.env.DATABASE_URL);
export const db = drizzle(connection, { schema, mode: 'default' });
```

### 2.4. Cập nhật file `shared/schema.ts`

Mở file `shared/schema.ts` và thay đổi phần imports và tables:

**THAY ĐỔI dòng import thứ 2:**

Từ:
```typescript
import { pgTable, text, varchar, integer, timestamp, serial } from "drizzle-orm/pg-core";
```

Sang:
```typescript
import { mysqlTable, text, varchar, int, timestamp, serial } from "drizzle-orm/mysql-core";
```

**THAY ĐỔI tất cả `pgTable` thành `mysqlTable`:**

Ví dụ:
```typescript
// Từ:
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Sang:
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().$default(() => crypto.randomUUID()),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
});

// HOẶC dùng auto-increment ID:
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
});
```

**THAY ĐỔI tất cả `integer` thành `int`:**
```typescript
// Từ:
dayOfWeek: integer("day_of_week").notNull(),

// Sang:
dayOfWeek: int("day_of_week").notNull(),
```

**THAY ĐỔI tất cả `text` không có length thành `varchar` hoặc `text`:**
```typescript
// Nếu dữ liệu ngắn (< 255 ký tự):
subject: varchar("subject", { length: 255 }).notNull(),

// Nếu dữ liệu dài:
notes: text("notes"),
```

---

## 🗄️ Bước 3: Setup MySQL Database

### 3.1. Tạo database mới trong MySQL

Mở **MySQL Command Line** hoặc **MySQL Workbench**, chạy:

```sql
CREATE DATABASE lophoc_online CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3.2. Tạo file `.env`

Tạo file `.env` trong thư mục gốc với nội dung:

```bash
# MySQL Database Connection
DATABASE_URL=mysql://username:password@localhost:3306/lophoc_online

# Session Secret
SESSION_SECRET=your-random-secret-key-at-least-32-characters-long

# Node Environment
NODE_ENV=development
```

**⚠️ Thay đổi:**
- `username` → tên user MySQL của bạn (thường là `root`)
- `password` → mật khẩu MySQL của bạn
- `your-random-secret-key-...` → chuỗi ngẫu nhiên

**Ví dụ cụ thể:**
```bash
DATABASE_URL=mysql://root:mypassword@localhost:3306/lophoc_online
SESSION_SECRET=abc123xyz789randomsecretkey12345678
NODE_ENV=development
```

### 3.3. Tạo bảng trong database

```bash
npm run db:push
```

Nếu gặp lỗi, thử:
```bash
npm run db:push -- --force
```

---

## 🚀 Bước 4: Chạy ứng dụng

```bash
npm run dev
```

Mở trình duyệt tại: **http://localhost:5000** 🎉

---

## 📝 So sánh MySQL vs PostgreSQL

| Tính năng | PostgreSQL | MySQL |
|-----------|------------|-------|
| UUID tự động | `gen_random_uuid()` | `UUID()` hoặc Node crypto |
| Auto-increment | `serial` | `serial` hoặc `AUTO_INCREMENT` |
| Text fields | `text` | `text` hoặc `varchar(length)` |
| Integer | `integer` | `int` |
| Performance | Tốt cho complex queries | Tốt cho read-heavy |

---

## 🔧 File schema.ts hoàn chỉnh cho MySQL

Đây là ví dụ hoàn chỉnh cho `shared/schema.ts`:

```typescript
import { sql } from "drizzle-orm";
import { mysqlTable, text, varchar, int, serial } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Tutor availability
export const tutorAvailability = mysqlTable("tutor_availability", {
  id: serial("id").primaryKey(),
  tutorId: varchar("tutor_id", { length: 100 }).notNull(),
  dayOfWeek: int("day_of_week").notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }).notNull(),
  isActive: int("is_active").notNull().default(1),
});

export const insertTutorAvailabilitySchema = createInsertSchema(tutorAvailability).omit({
  id: true,
});

export type InsertTutorAvailability = z.infer<typeof insertTutorAvailabilitySchema>;
export type TutorAvailability = typeof tutorAvailability.$inferSelect;

// Lessons
export const lessons = mysqlTable("lessons", {
  id: serial("id").primaryKey(),
  tutorId: varchar("tutor_id", { length: 100 }).notNull(),
  studentId: varchar("student_id", { length: 100 }).notNull(),
  subject: varchar("subject", { length: 100 }).notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  price: int("price").notNull(),
  notes: text("notes"),
});

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
});

export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessons.$inferSelect;
```

---

## 🐛 Khắc phục sự cố

### ❌ Lỗi: "Client does not support authentication protocol"

**Giải pháp:** Cập nhật authentication method trong MySQL:

```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

### ❌ Lỗi: "Access denied for user"

**Giải pháp:**
1. Kiểm tra username/password trong `.env`
2. Thử kết nối thủ công:
   ```bash
   mysql -u root -p
   # Nhập password
   ```

### ❌ Lỗi: "Unknown database 'lophoc_online'"

**Giải pháp:**
```sql
CREATE DATABASE lophoc_online;
```

### ❌ Lỗi khi `npm run db:push`

**Giải pháp:**
```bash
# Force push
npm run db:push -- --force

# Hoặc xóa migrations và thử lại
rm -rf migrations
npm run db:push
```

---

## 📊 Kiểm tra database đã tạo chưa

Kết nối MySQL và chạy:

```sql
USE lophoc_online;
SHOW TABLES;
```

Bạn sẽ thấy các bảng:
- `users`
- `tutor_availability`
- `lessons`

---

## ✅ Checklist hoàn thành

- [ ] Tải mã nguồn về máy
- [ ] Cài đặt `mysql2` package
- [ ] Sửa `drizzle.config.ts` (dialect: "mysql")
- [ ] Sửa `server/db.ts` (dùng mysql2)
- [ ] Sửa `shared/schema.ts` (mysqlTable, int, varchar)
- [ ] Tạo database trong MySQL
- [ ] Tạo file `.env` với MySQL connection
- [ ] Chạy `npm run db:push`
- [ ] Chạy `npm run dev`
- [ ] Mở http://localhost:5000

---

## 🎯 Kết luận

Bạn đã chuyển đổi thành công từ PostgreSQL sang MySQL! 

**Lợi ích của MySQL:**
✅ Dễ cài đặt trên Windows  
✅ Quen thuộc với nhiều developer  
✅ Performance tốt cho read-heavy apps  
✅ Hỗ trợ rộng rãi trên hosting  

**Chúc bạn coding vui vẻ!** 🚀
