# 🚀 Hướng dẫn chạy LopHoc.Online trên máy local

## 📋 Yêu cầu hệ thống

Trước khi bắt đầu, hãy đảm bảo máy của bạn đã cài đặt:

- **Node.js** version 18 trở lên ([tải tại đây](https://nodejs.org/))
- **PostgreSQL** version 14 trở lên ([tải tại đây](https://www.postgresql.org/download/))
- **npm** hoặc **yarn** (đi kèm với Node.js)

### Kiểm tra phiên bản đã cài:
```bash
node --version   # Nên >= v18.0.0
npm --version    # Nên >= 9.0.0
psql --version   # Nên >= 14.0
```

---

## 📥 Bước 1: Tải mã nguồn về máy

### **Cách 1: Download từ Replit (Đơn giản nhất)**

1. Vào project trên Replit
2. Click vào **Files** (biểu tượng folder ở sidebar trái)
3. Click vào **3 chấm (...)** ở góc trên bên phải
4. Chọn **Download as ZIP**
5. Giải nén file ZIP vừa tải về

### **Cách 2: Sử dụng Git (Nếu đã setup Git repository)**

```bash
git clone <URL_repository_của_bạn>
cd lophoc-online
```

### **Cách 3: Copy thủ công từ Replit**

- Tạo folder mới trên máy local
- Copy toàn bộ files từ Replit vào folder đó

---

## ⚙️ Bước 2: Cài đặt dependencies

Mở **Terminal** / **Command Prompt** tại thư mục project và chạy:

```bash
npm install
```

⏳ Quá trình này sẽ mất 1-2 phút để tải tất cả packages cần thiết.

---

## 🗄️ Bước 3: Setup PostgreSQL Database

### 3.1. Tạo database mới

Mở **psql** (PostgreSQL command line) hoặc **pgAdmin**, sau đó chạy:

```sql
CREATE DATABASE lophoc_online;
```

### 3.2. Tạo file `.env` trong thư mục gốc

Tạo file `.env` với nội dung sau:

```bash
# Database Connection
DATABASE_URL=postgresql://username:password@localhost:5432/lophoc_online

# Thông tin PostgreSQL (thay đổi theo cấu hình của bạn)
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_postgres_password
PGDATABASE=lophoc_online

# Session Secret (tạo một chuỗi ngẫu nhiên)
SESSION_SECRET=your-secret-key-here-change-this-to-random-string

# Node Environment
NODE_ENV=development
```

**⚠️ Lưu ý quan trọng:**
- Thay `username` và `password` bằng thông tin PostgreSQL của bạn
- Thay `your_postgres_password` bằng mật khẩu PostgreSQL của bạn
- Thay `your-secret-key-here` bằng một chuỗi ngẫu nhiên (ít nhất 32 ký tự)

### 3.3. Tạo bảng trong database

Chạy lệnh sau để tạo schema:

```bash
npm run db:push
```

Lệnh này sẽ tạo tất cả các bảng cần thiết trong database.

---

## 🎯 Bước 4: Chạy ứng dụng

### Chế độ Development (Phát triển)

```bash
npm run dev
```

Ứng dụng sẽ chạy tại: **http://localhost:5000**

### Chế độ Production (Sản xuất)

```bash
# Build ứng dụng
npm run build

# Chạy production server
npm start
```

---

## 🌐 Bước 5: Truy cập ứng dụng

Mở trình duyệt và truy cập:

```
http://localhost:5000
```

🎉 **Chúc mừng!** Ứng dụng đã chạy thành công trên máy local của bạn!

---

## 📁 Cấu trúc thư mục

```
lophoc-online/
├── client/                 # Frontend React + TypeScript
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   └── lib/           # Utilities
│   └── index.html
├── server/                # Backend Express + TypeScript
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Data storage
│   └── index.ts           # Entry point
├── shared/                # Shared types & schemas
│   └── schema.ts
├── package.json
└── .env                   # Environment variables (tạo thủ công)
```

---

## 🔧 Các lệnh hữu ích

```bash
# Chạy development server
npm run dev

# Build production
npm run build

# Chạy production server
npm start

# Type checking
npm run check

# Sync database schema
npm run db:push
```

---

## 🐛 Khắc phục sự cố

### ❌ Lỗi: "Cannot connect to database"

**Giải pháp:**
1. Kiểm tra PostgreSQL đã chạy chưa:
   ```bash
   # Windows
   services.msc → tìm "PostgreSQL" → Start
   
   # macOS/Linux
   sudo service postgresql start
   ```

2. Kiểm tra thông tin kết nối trong file `.env`
3. Thử kết nối thủ công:
   ```bash
   psql -U postgres -d lophoc_online
   ```

### ❌ Lỗi: "Port 5000 already in use"

**Giải pháp:**
1. Tìm process đang dùng port 5000:
   ```bash
   # Windows
   netstat -ano | findstr :5000
   
   # macOS/Linux
   lsof -i :5000
   ```

2. Hoặc đổi port trong `server/index.ts`:
   ```typescript
   const PORT = process.env.PORT || 3000; // Đổi 5000 → 3000
   ```

### ❌ Lỗi: "Module not found"

**Giải pháp:**
```bash
# Xóa node_modules và cài lại
rm -rf node_modules package-lock.json
npm install
```

### ❌ Lỗi database migration

**Giải pháp:**
```bash
# Force push schema
npm run db:push -- --force
```

---

## 🔐 Bảo mật

**⚠️ Quan trọng:**
- **KHÔNG** commit file `.env` lên Git
- File `.gitignore` đã được cấu hình để bỏ qua `.env`
- Sử dụng mật khẩu mạnh cho PostgreSQL
- Thay đổi `SESSION_SECRET` thành chuỗi ngẫu nhiên

---

## 📞 Hỗ trợ

Nếu gặp vấn đề:

1. Kiểm tra lại từng bước trong hướng dẫn
2. Xem phần "Khắc phục sự cố" ở trên
3. Kiểm tra console/terminal có báo lỗi gì không
4. Đảm bảo tất cả yêu cầu hệ thống đã được cài đặt đúng

---

## 🚀 Tính năng chính của LopHoc.Online

✅ Đăng ký/đăng nhập (JWT, Google, Facebook)  
✅ Tìm kiếm gia sư với bộ lọc thông minh  
✅ Rich Text Editor cho hồ sơ gia sư  
✅ Đặt lịch học định kỳ với gói subscription  
✅ Thanh toán QR code (VietQR)  
✅ Quản lý lịch học cho gia sư và học viên  
✅ Hệ thống đánh giá và phản hồi  

**Chúc bạn phát triển thành công! 🎓**
