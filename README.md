# 🎓 LopHoc.Online - Nền tảng kết nối gia sư trực tuyến

<div align="center">

**Giải pháp tìm gia sư và quản lý lịch học trực tuyến toàn diện cho thị trường Việt Nam**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)

</div>

---

## 📖 Giới thiệu

**LopHoc.Online** là nền tảng marketplace kết nối gia sư với học viên, được thiết kế đặc biệt cho thị trường giáo dục Việt Nam. Hệ thống cung cấp đầy đủ tính năng từ tìm kiếm gia sư, đặt lịch học, thanh toán đến quản lý và đánh giá.

## ✨ Tính năng chính

### 🔐 Xác thực người dùng
- Đăng nhập bằng **JWT Token**
- Đăng nhập bằng **Google OAuth**
- Đăng nhập bằng **Facebook OAuth**
- Tính năng **quên mật khẩu** và đặt lại

### 👨‍🏫 Dành cho Gia sư
- **Rich Text Editor** để tạo hồ sơ giảng dạy chuyên nghiệp
  - Định dạng văn bản: Bold, Italic, Headings
  - Tạo danh sách có số và không số
  - Undo/Redo
- Tải lên ảnh đại diện và chứng chỉ
- Thiết lập lịch dạy định kỳ (T2,4,6 / T3,5,7 / Cuối tuần)
- Quản lý học viên và lịch dạy
- Theo dõi doanh thu và thống kê

### 👨‍🎓 Dành cho Học viên
- Tìm kiếm gia sư với bộ lọc thông minh:
  - Môn học và cấp độ
  - Khoảng giá
  - Đánh giá và kinh nghiệm
  - Thời gian rảnh
- **Chọn nhiều môn học** trong một lần đặt lịch
- Chọn **gói subscription** linh hoạt (1-12 tháng)
  - Giảm giá theo thời gian: 5% → 20%
- Thanh toán QR code qua **VietQR**
- Xem lịch học trên calendar
- Đánh giá và phản hồi sau buổi học

### 💼 Quản trị hệ thống
- Dashboard quản lý tổng quan
- Quản lý gia sư (duyệt, kích hoạt, chặn)
- Quản lý học viên
- Theo dõi giao dịch

## 🛠️ Công nghệ sử dụng

### Frontend
- **React 18** + **TypeScript**
- **Vite** - Build tool nhanh chóng
- **Wouter** - Lightweight routing
- **TanStack Query** - Server state management
- **Shadcn/ui** + **Radix UI** - Component library
- **Tailwind CSS** - Utility-first CSS
- **TipTap Editor** - Rich text editing

### Backend
- **Express.js** - REST API server
- **TypeScript** - Type safety
- **PostgreSQL hoặc MySQL** - Database
- **Drizzle ORM** - Type-safe ORM
- **Express Session** - Session management

### Thanh toán & Tích hợp
- **VietQR API** - Thanh toán QR code
- **Jitsi Meet** - Video call (placeholder)

## 🚀 Hướng dẫn chạy trên máy local

### 📋 Chọn database của bạn:

#### Option 1: PostgreSQL (mặc định)
📚 **[Hướng dẫn chi tiết PostgreSQL →](./HUONG_DAN_CHAY_LOCAL.md)**

```bash
# 1. Clone/Download code về máy
# 2. npm install
# 3. Tạo database: createdb lophoc_online
# 4. Tạo file .env từ .env.example
# 5. npm run db:push
# 6. npm run dev
```

#### Option 2: MySQL (nếu bạn chỉ có MySQL)
🐬 **[Hướng dẫn chi tiết MySQL →](./HUONG_DAN_MYSQL.md)**  
⚡ **[Hướng dẫn nhanh chuyển sang MySQL →](./CHUYEN_DOI_MYSQL_NHANH.md)**

```bash
# 1. Clone/Download code về máy
# 2. Sửa 3 file config (xem hướng dẫn)
# 3. npm install (với mysql2)
# 4. Tạo database: CREATE DATABASE lophoc_online;
# 5. Tạo file .env với MySQL connection
# 6. npm run db:push
# 7. npm run dev
```

### Mở trình duyệt tại: **http://localhost:5000** 🎉

## 📁 Cấu trúc project

```
lophoc-online/
├── client/                 # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/    # UI Components
│   │   ├── pages/         # Page Components  
│   │   ├── lib/           # Utilities
│   │   └── App.tsx
├── server/                # Backend (Express + TypeScript)
│   ├── routes.ts          # API Routes
│   ├── storage.ts         # Data Layer
│   └── index.ts           # Server Entry
├── shared/                # Shared Types
│   └── schema.ts          # Database Schema
├── HUONG_DAN_CHAY_LOCAL.md  # 📖 Hướng dẫn chi tiết
└── .env.example           # Template biến môi trường
```

## 🔧 Các lệnh hữu ích

```bash
npm run dev        # Chạy development server
npm run build      # Build production
npm start          # Chạy production server
npm run check      # TypeScript type checking
npm run db:push    # Sync database schema
```

## 🎨 Giao diện

- **Responsive design** - Tối ưu cho desktop & mobile
- **Dark/Light mode** - Chế độ sáng/tối
- **Vietnamese UI** - Giao diện hoàn toàn tiếng Việt
- **Modern aesthetics** - Thiết kế hiện đại, chuyên nghiệp

## 🔐 Bảo mật

✅ JWT Token authentication  
✅ Password hashing  
✅ Session management  
✅ Environment variables cho secrets  
✅ SQL injection prevention (Drizzle ORM)  
✅ XSS protection  

## 📊 Database Schema

Xem chi tiết schema tại: `shared/schema.ts`

Các bảng chính:
- `users` - Người dùng
- `tutors` - Gia sư
- `students` - Học viên
- `lessons` - Buổi học
- `bookings` - Đặt lịch
- `reviews` - Đánh giá
- `transactions` - Giao dịch

## 🤝 Đóng góp

Mọi đóng góp đều được hoan nghênh! Vui lòng:

1. Fork repository
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📝 License

MIT License - xem file [LICENSE](LICENSE) để biết thêm chi tiết

## 📞 Liên hệ & Hỗ trợ

- **Email**: support@lophoc.online
- **Website**: https://lophoc.online
- **Địa chỉ**: Hà Nội, Việt Nam

---

<div align="center">

**Được phát triển với ❤️ cho cộng đồng giáo dục Việt Nam**

⭐ Nếu project này hữu ích, đừng quên cho chúng tôi một star!

</div>
