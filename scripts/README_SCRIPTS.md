# 🛠️ Scripts Tự Động Chuyển Đổi Database

## 📋 Danh sách Scripts

| Script | Mô tả | Khi nào dùng |
|--------|-------|--------------|
| `switch-to-mysql.js` | Chuyển từ PostgreSQL sang MySQL | Khi muốn dùng MySQL |
| `switch-to-postgres.js` | Chuyển từ MySQL về PostgreSQL | Khi muốn quay lại PostgreSQL |

## 🚀 Cách sử dụng

### 1️⃣ Chuyển sang MySQL

```bash
node scripts/switch-to-mysql.js
```

**Script này sẽ tự động:**
- ✅ Backup các file PostgreSQL hiện tại (.postgres.backup.ts)
- ✅ Copy các file MySQL config vào vị trí đúng
- ✅ Cập nhật package.json (xóa @neondatabase/serverless, thêm mysql2)
- ✅ Hiển thị hướng dẫn các bước tiếp theo

**Sau khi chạy script, làm theo:**
```bash
# 1. Cài đặt packages
npm install

# 2. Tạo database MySQL
mysql -u root -p
CREATE DATABASE lophoc_online CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit

# 3. Tạo file .env với MySQL connection
echo "DATABASE_URL=mysql://root:your_password@localhost:3306/lophoc_online" > .env
echo "SESSION_SECRET=your-secret-key-here" >> .env
echo "NODE_ENV=development" >> .env

# 4. Tạo bảng
npm run db:push

# 5. Chạy app
npm run dev
```

### 2️⃣ Quay lại PostgreSQL

```bash
node scripts/switch-to-postgres.js
```

**Script này sẽ tự động:**
- ✅ Khôi phục các file PostgreSQL từ backup
- ✅ Cập nhật package.json (xóa mysql2, thêm @neondatabase/serverless)
- ✅ Hiển thị hướng dẫn các bước tiếp theo

**Sau khi chạy script, làm theo:**
```bash
# 1. Cài đặt packages
npm install

# 2. Cập nhật .env với PostgreSQL connection
echo "DATABASE_URL=postgresql://user:pass@localhost:5432/lophoc_online" > .env

# 3. Tạo bảng
npm run db:push

# 4. Chạy app
npm run dev
```

## 📝 File được backup

Khi chuyển sang MySQL, các file sau sẽ được backup:

| File gốc | File backup |
|----------|-------------|
| `drizzle.config.ts` | `drizzle.config.postgres.backup.ts` |
| `server/db.ts` | `server/db.postgres.backup.ts` |
| `shared/schema.ts` | `shared/schema.postgres.backup.ts` |

## ⚠️ Lưu ý quan trọng

1. **Backup dữ liệu:** Script chỉ thay đổi config, không di chuyển dữ liệu
2. **Môi trường development:** Nên test trên dev trước khi áp dụng production
3. **File .env:** Phải tự cập nhật connection string phù hợp
4. **Dependencies:** Nhớ chạy `npm install` sau khi script xong

## 🔍 Kiểm tra trước khi chạy

```bash
# Kiểm tra đang dùng database gì
cat server/db.ts | grep "from"

# Nếu thấy: from '@neondatabase/serverless' → Đang dùng PostgreSQL
# Nếu thấy: from 'mysql2/promise' → Đang dùng MySQL
```

## 🐛 Xử lý lỗi

### Lỗi: "Cannot find module"
```bash
# Cài lại dependencies
rm -rf node_modules package-lock.json
npm install
```

### Lỗi: "No backup files found"
Bạn chưa backup. Copy thủ công:
```bash
cp drizzle.config.ts drizzle.config.postgres.backup.ts
cp server/db.ts server/db.postgres.backup.ts
cp shared/schema.ts shared/schema.postgres.backup.ts
```

### Lỗi khi chạy script
```bash
# Đảm bảo đang ở thư mục root của project
pwd  # Phải là thư mục chứa package.json

# Chạy script với node
node scripts/switch-to-mysql.js
```

## 💡 Mẹo

**Test song song cả 2 database:**
```bash
# Tạo 2 branch
git checkout -b mysql-version
node scripts/switch-to-mysql.js
npm install

# Quay lại PostgreSQL
git checkout main
# PostgreSQL vẫn giữ nguyên
```

**Rollback nhanh:**
```bash
# Nếu có vấn đề với MySQL
node scripts/switch-to-postgres.js
npm install
npm run dev
```

---

**Chúc bạn chuyển đổi thành công!** 🎉
