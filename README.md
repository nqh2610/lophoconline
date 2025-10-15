# 🎓 LopHoc.Online - Nền tảng kết nối gia sư

Ứng dụng web kết nối gia sư với học viên, xây dựng với **React.js + Express.js + MySQL**

## 🚀 Chạy trên máy local (4 bước)

### Bước 1: Cài đặt packages

```bash
npm install
```

### Bước 2: Tạo database MySQL

```sql
CREATE DATABASE lophoc_online CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Bước 3: Tạo file .env

Tạo file `.env`:

```bash
DATABASE_URL=mysql://root:mat_khau@localhost:3306/lophoc_online
SESSION_SECRET=randomsecretkey12345678901234567890abc
NODE_ENV=development
```

⚠️ **Thay `root` và `mat_khau` bằng MySQL của bạn**

### Bước 4: Khởi chạy Express server

```bash
npm run db:push      # Tạo bảng trong database
npm run dev          # Chạy Express backend + React frontend
```

Server sẽ chạy tại: **http://localhost:5000** 🎉

---

## 🐛 Khắc phục lỗi thường gặp

### ❌ "Client does not support authentication protocol"

```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'mat_khau';
FLUSH PRIVILEGES;
```

### ❌ "Access denied"

- Kiểm tra username/password trong `.env`
- Test: `mysql -u root -p`

### ❌ "Unknown database"

```sql
CREATE DATABASE lophoc_online CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### ❌ "Port 5000 already in use"

```bash
# Windows: netstat -ano | findstr :5000
# macOS/Linux: lsof -i :5000
```

---

## 📁 Cấu trúc project

```
├── client/          # React frontend
├── server/          # Express backend  
├── shared/          # Database schema
├── setup-mysql.js   # Script cấu hình MySQL
└── .env            # Biến môi trường (tự tạo)
```

## ✨ Tính năng

✅ Rich Text Editor cho hồ sơ gia sư  
✅ Tìm kiếm & lọc gia sư  
✅ Đặt lịch học với gói subscription  
✅ Thanh toán QR code (VietQR)  
✅ Quản lý lịch học  
✅ Hệ thống đánh giá  

## 🔧 Lệnh hữu ích

```bash
npm run dev        # Chạy Express server + React (development)
npm run build      # Build production
npm run start      # Chạy production server
npm run db:push    # Đồng bộ database schema
```

## 🛠️ Stack công nghệ

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Shadcn/ui
- **Backend:** Express.js, TypeScript
- **Database:** MySQL 8.0, Drizzle ORM
- **Editor:** TipTap

---

**Phát triển với ❤️ cho giáo dục Việt Nam** 🇻🇳
