# 🎓 LopHoc.Online - Nền tảng kết nối gia sư trực tuyến

## 📋 Mục lục

- [Giới thiệu](#giới-thiệu)
- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cài đặt](#cài-đặt)
- [Cấu hình](#cấu-hình)
- [Chạy ứng dụng](#chạy-ứng-dụng)
- [Tài khoản test](#tài-khoản-test)
- [Chức năng đã thực hiện](#chức-năng-đã-thực-hiện)
- [Stack công nghệ](#stack-công-nghệ)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [API Endpoints](#api-endpoints)
- [Khắc phục lỗi](#khắc-phục-lỗi)

---

## 🌟 Giới thiệu

**LopHoc.Online** là nền tảng kết nối gia sư và học sinh trực tuyến, cung cấp giải pháp toàn diện cho việc tìm kiếm, đặt lịch và quản lý lớp học trực tuyến.

### Tính năng chính:
- ✅ Tìm kiếm và lọc gia sư theo môn học, cấp lớp, giá
- ✅ Đặt lịch học với gia sư
- ✅ Hệ thống xác nhận/từ chối lịch học
- ✅ Tự động từ chối sau 24h nếu gia sư không phản hồi
- ✅ Quản lý thanh toán và hoàn tiền
- ✅ Hệ thống đánh giá và phản hồi
- ✅ Dashboard cho admin, gia sư, học sinh
- ✅ Thông báo real-time

---

## 📋 Yêu cầu hệ thống

- **Node.js:** 18+ và npm
- **MySQL:** 8.0+
- **RAM:** Tối thiểu 4GB
- **Trình duyệt:** Chrome, Firefox, Safari (phiên bản mới nhất)

---

## 🚀 Cài đặt

### Bước 1: Clone repository

```bash
git clone <repository-url>
cd LopHocTrucTuyen
```

### Bước 2: Cài đặt dependencies

```bash
npm install
```

### Bước 3: Tạo database MySQL

Mở MySQL và chạy lệnh:

```sql
CREATE DATABASE lophoc_online CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## ⚙️ Cấu hình

### Tạo file `.env.local`

Tạo file `.env.local` trong thư mục gốc với nội dung:

```bash
# Database
DATABASE_URL=mysql://root:mat_khau@localhost:3306/lophoc_online

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key-here

# Node Environment
NODE_ENV=development

# Cron Secret (cho auto-reject system)
CRON_SECRET=your-cron-secret-here
```

**Lưu ý:**
- Thay `root` và `mat_khau` bằng thông tin MySQL của bạn
- Tạo `NEXTAUTH_SECRET`: `openssl rand -base64 32`
- Tạo `CRON_SECRET`: `openssl rand -base64 32`

### Đồng bộ schema với database

```bash
npm run db:push
```

### Seed dữ liệu mẫu

```bash
npm run seed
```

**⚠️ Lưu ý:** Script sẽ **XÓA toàn bộ dữ liệu cũ** trước khi seed dữ liệu mới!

Lệnh này sẽ tạo:
- 12 môn học (Toán, Tiếng Anh, Vật Lý, Hóa học, Sinh học, Ngữ Văn, Lịch Sử, Địa Lý, Tin học, IELTS, TOEFL, SAT)
- 20 cấp lớp (Lớp 1-12, các khóa luyện thi, Đại học, Người đi làm)
- 10 gia sư với hồ sơ đầy đủ (bio, education, certifications, achievements)
- Mối quan hệ môn học - cấp lớp cho từng gia sư
- Lịch trống (time slots) cho từng gia sư

---

## 🎯 Chạy ứng dụng

### Development mode

```bash
npm run dev
```

Mở trình duyệt: **http://localhost:3000**

### Production build

```bash
npm run build
npm start
```

### Các lệnh hữu ích

```bash
npm run dev          # Chạy development server
npm run build        # Build production
npm run start        # Chạy production server
npm run lint         # Kiểm tra code
npm run db:push      # Đồng bộ schema
npm run db:studio    # Mở Drizzle Studio
npm run seed         # Seed dữ liệu mẫu (XÓA dữ liệu cũ)
```

---

## 🔐 Tài khoản test

Sau khi chạy `npm run seed`, hệ thống tạo 3 tài khoản test với 3 vai trò khác nhau:

### 🎯 3 Tài khoản Test Chính

**Password cho tất cả:** `123456`

#### 1️⃣ Admin (Quản trị viên)
```
Username: admin
Email: admin@test.com
Password: 123456
Dashboard: /admin
```

**Quyền hạn:**
- Quản lý tất cả người dùng (CRUD)
- Duyệt/từ chối gia sư mới
- Quản lý giao dịch và thanh toán
- Xem thống kê hệ thống
- Quản lý lessons và bookings

#### 2️⃣ Student (Học sinh)
```
Username: student
Email: student@test.com
Password: 123456
Dashboard: /student/dashboard
```

**Chức năng:**
- Tìm kiếm và đặt lịch với gia sư
- Xem lịch học (pending, confirmed, completed)
- Thanh toán học phí
- Đánh giá gia sư
- Quản lý hồ sơ cá nhân

#### 3️⃣ Tutor (Gia sư)
```
Username: tutor
Email: tutor@test.com
Password: 123456
Dashboard: /tutor/dashboard
```

**Chức năng:**
- Xác nhận/từ chối yêu cầu đặt lịch
- Quản lý lịch dạy và lịch rảnh
- Xem danh sách học viên
- Xem thu nhập và thống kê
- Xem đánh giá từ học sinh
- Cập nhật thông tin và hồ sơ

---

### 👥 Các Gia sư Khác (Dữ liệu mẫu)

**Password:** `password123`

| Username | Họ tên | Môn dạy | Giá/giờ |
|----------|--------|---------|---------|
| tutor_mai | Nguyễn Thị Mai | Toán, Vật Lý | 200,000đ |
| tutor_hung | Trần Văn Hùng | Tiếng Anh, IELTS, TOEFL | 250,000đ |
| tutor_tu | Lê Minh Tú | Toán, Vật Lý, Tin học | 120,000đ |
| tutor_ha | Phạm Thu Hà | Hóa học, Sinh học | 180,000đ |
| tutor_thanh | Đỗ Văn Thành | Lịch Sử, Địa Lý | 150,000đ |
| tutor_lan | Hoàng Thị Lan | Ngữ Văn | 190,000đ |
| tutor_duc | Bùi Minh Đức | Tiếng Anh, SAT, TOEFL | 300,000đ |
| tutor_huong | Ngô Thị Hương | Tiếng Anh, IELTS | 220,000đ |
| tutor_nam | Vũ Hoàng Nam | Toán, Tin học | 200,000đ |
| tutor_anh | Nguyễn Minh Anh | Hóa học, Sinh học | 140,000đ |

**Email:** `{username}@example.com` (ví dụ: tutor_mai@example.com)

---

## ✨ Chức năng đã thực hiện

### 🎓 Dành cho Học sinh

#### Tìm kiếm và đặt lịch
- [x] Tìm kiếm gia sư theo môn học, cấp lớp
- [x] Lọc theo giá, rating, kinh nghiệm
- [x] Xem hồ sơ chi tiết gia sư
- [x] Đặt lịch học (trial hoặc regular)
- [x] Xem lịch rảnh của gia sư
- [x] Chọn gói học (số buổi/tháng)

#### Quản lý lớp học
- [x] Xem danh sách lớp học (pending/confirmed/completed)
- [x] Lọc lớp học theo trạng thái
- [x] Nhận thông báo khi gia sư xác nhận/từ chối
- [x] Xem lý do từ chối (nếu có)
- [x] Join lớp học (khi có meeting link)

#### Thanh toán
- [x] Thanh toán qua VNPay, Momo
- [x] Hệ thống escrow (giữ tiền an toàn)
- [x] Tự động hoàn tiền khi bị từ chối
- [x] Xem lịch sử giao dịch

#### Đánh giá
- [x] Đánh giá gia sư sau khi hoàn thành
- [x] Viết nhận xét chi tiết
- [x] Rating từ 1-5 sao

### 👨‍🏫 Dành cho Gia sư

#### Quản lý yêu cầu
- [x] Xem danh sách yêu cầu đặt lịch
- [x] Hiển thị thời gian chờ (urgency indicator)
- [x] Xác nhận yêu cầu (1 click)
- [x] Từ chối yêu cầu với lý do
- [x] Tự động từ chối sau 24h nếu không phản hồi

#### Quản lý lịch dạy
- [x] Thiết lập lịch rảnh (time slots)
- [x] Xem lịch dạy theo tuần/tháng
- [x] Quản lý lịch định kỳ
- [x] Cập nhật availability

#### Thu nhập
- [x] Xem tổng thu nhập
- [x] Thống kê theo tháng
- [x] Yêu cầu rút tiền
- [x] Wallet system với pending/available balance

#### Thống kê
- [x] Response rate (tỷ lệ phản hồi)
- [x] Completion rate (tỷ lệ hoàn thành)
- [x] Average rating
- [x] Số lượng học sinh

### 👑 Dành cho Admin

#### Quản lý người dùng
- [x] CRUD users (Create, Read, Update, Delete)
- [x] Khóa/mở khóa tài khoản
- [x] Tìm kiếm và lọc users
- [x] Phân trang

#### Quản lý gia sư
- [x] Duyệt/từ chối gia sư mới
- [x] Xem hồ sơ và chứng chỉ
- [x] Quản lý verification status
- [x] Xem thống kê của từng gia sư

#### Quản lý giao dịch
- [x] Xem lịch sử giao dịch
- [x] Quản lý escrow payments
- [x] Duyệt yêu cầu rút tiền
- [x] Xử lý hoàn tiền

#### Thống kê hệ thống
- [x] Tổng quan (users, lessons, revenue)
- [x] Audit logs
- [x] Auto-reject statistics

### 🔔 Hệ thống thông báo

- [x] In-app notifications
- [x] Notification dropdown
- [x] Mark as read/unread
- [x] Notification types:
  - Booking confirmation
  - Lesson reminder
  - Payment success
  - Review request
  - System announcements

### 💳 Hệ thống thanh toán

#### Payment Gateways
- [x] VNPay integration
- [x] Momo integration
- [x] Bank transfer support

#### Escrow System
- [x] Giữ tiền an toàn khi đặt lịch
- [x] Release tiền cho gia sư sau mỗi buổi học
- [x] Tự động hoàn tiền khi cancelled
- [x] Commission deduction (15%)

#### Wallets
- [x] Platform wallet
- [x] Tutor wallets
- [x] Transaction history
- [x] Payout requests

### 🔒 Bảo mật

- [x] NextAuth.js authentication
- [x] JWT-based sessions
- [x] Role-based access control (RBAC)
- [x] Middleware protection
- [x] Password hashing (bcrypt)
- [x] CSRF protection

### 📊 Database

- [x] 22 bảng đầy đủ quan hệ
- [x] Foreign key constraints
- [x] Indexes optimization
- [x] Audit logging
- [x] Soft delete support

---

## 🛠️ Stack công nghệ

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **UI Library:** React 18
- **Styling:** Tailwind CSS 3
- **Components:** Shadcn/ui
- **Icons:** Lucide React
- **State:** TanStack Query (React Query)

### Backend
- **API:** Next.js API Routes
- **Authentication:** NextAuth.js v4
- **Database:** MySQL 8.0
- **ORM:** Drizzle ORM
- **Validation:** Zod

### DevOps
- **Deployment:** Vercel
- **Cron Jobs:** Vercel Cron
- **Monitoring:** Console logs (future: Sentry)

---

## 📁 Cấu trúc dự án

```
LopHocTrucTuyen/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── admin/        # Admin APIs
│   │   │   ├── auth/         # Authentication
│   │   │   ├── lessons/      # Lesson management
│   │   │   ├── students/     # Student APIs
│   │   │   ├── tutors/       # Tutor APIs
│   │   │   └── cron/         # Cron jobs
│   │   ├── admin/            # Admin pages
│   │   ├── student/          # Student pages
│   │   ├── tutor/            # Tutor pages
│   │   ├── tutors/           # Public tutor listing
│   │   └── page.tsx          # Homepage
│   ├── components/            # React components
│   │   ├── FilterPanel.tsx
│   │   ├── Navbar.tsx
│   │   ├── PendingLessonRequests.tsx
│   │   ├── StudentLessonsList.tsx
│   │   └── ...
│   ├── lib/                   # Libraries
│   │   ├── db.ts             # Database config
│   │   ├── storage.ts        # Data access layer
│   │   └── auth.ts           # Auth config
│   └── schema/                # Drizzle schemas
├── scripts/                   # Utility scripts
│   └── seed-complete.ts      # Database seeding
├── .env.local                 # Environment variables
├── drizzle.config.ts         # Drizzle config
├── vercel.json               # Vercel config
└── package.json
```

---

## 🔌 API Endpoints

### Authentication

```
POST   /api/auth/signin         # Đăng nhập
POST   /api/auth/signout        # Đăng xuất
GET    /api/auth/session        # Lấy session
```

### Tutors

```
GET    /api/tutors              # Danh sách gia sư (với filter)
GET    /api/tutors/[id]         # Chi tiết gia sư
GET    /api/tutors/[id]/pending-lessons  # Yêu cầu đặt lịch
GET    /api/tutors/me           # Profile gia sư hiện tại
```

### Lessons

```
POST   /api/lessons             # Tạo lịch học mới
GET    /api/lessons/[id]        # Chi tiết lịch học
POST   /api/lessons/[id]/confirm   # Xác nhận
POST   /api/lessons/[id]/reject    # Từ chối
POST   /api/lessons/[id]/complete  # Đánh dấu hoàn thành
```

### Students

```
GET    /api/students/me         # Profile học sinh hiện tại
GET    /api/students/[id]/lessons # Lịch học của học sinh
```

### Admin

```
GET    /api/admin/users         # Danh sách users
POST   /api/admin/users         # Tạo user
PUT    /api/admin/users/[id]    # Cập nhật user
DELETE /api/admin/users/[id]    # Xóa user
PATCH  /api/admin/users/[id]/status  # Khóa/mở khóa
```

### Cron Jobs

```
POST   /api/cron/auto-reject-lessons  # Auto-reject sau 24h
```

---

## 🐛 Khắc phục lỗi

### ❌ "Client does not support authentication protocol"

Chạy trong MySQL:

```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'mat_khau';
FLUSH PRIVILEGES;
```

### ❌ "Access denied for user"

- Kiểm tra username/password trong `.env.local`
- Test kết nối: `mysql -u root -p`

### ❌ "Unknown database 'lophoc_online'"

```sql
CREATE DATABASE lophoc_online CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### ❌ "Port 3000 already in use"

**Windows:**
```bash
netstat -ano | findstr :3000
# Kill process bằng Task Manager
```

**macOS/Linux:**
```bash
lsof -i :3000
kill -9 <PID>
```

### ❌ "Cannot find module '@/...' "

```bash
rm -rf node_modules package-lock.json
npm install
```

### ❌ Đăng nhập không hoạt động

1. Kiểm tra `NEXTAUTH_SECRET` trong `.env.local`
2. Clear browser cache và cookies
3. Restart dev server
4. Kiểm tra user có `is_active = 1` trong database

### ❌ Seed data lỗi

```bash
# Reset lại database
npm run db:push
npm run seed:complete
```

---

## 📞 Hỗ trợ

Nếu gặp vấn đề, kiểm tra:

1. **Database connection:** MySQL có đang chạy?
2. **Environment variables:** File `.env.local` có đúng?
3. **Dev server:** Port 3000 có bị chiếm?
4. **Browser console:** F12 để xem errors
5. **Server logs:** Check terminal có lỗi gì không

---

## 📚 Tài liệu bổ sung

Các file documentation trong dự án:
- `AUTO_REJECT_SETUP.md` - Hướng dẫn cấu hình auto-reject
- `DATABASE_SEEDING.md` - Chi tiết về seed data
- `WEEK1_IMPLEMENTATION_SUMMARY.md` - Tổng kết triển khai

---

## 🚀 Roadmap

### Đã hoàn thành (Week 1)
- ✅ Hệ thống đăng ký/đăng nhập
- ✅ Tìm kiếm và lọc gia sư
- ✅ Đặt lịch học
- ✅ Xác nhận/từ chối lịch học
- ✅ Auto-reject sau 24h
- ✅ Payment & escrow system
- ✅ In-app notifications
- ✅ Admin dashboard

### Sắp tới (Week 2-4)
- [ ] Email notifications
- [ ] Video call integration (Jitsi/Agora)
- [ ] Advanced search filters
- [ ] Calendar view
- [ ] Mobile responsive improvements
- [ ] Performance optimization

### Tương lai (Week 5-8)
- [ ] Real-time chat
- [ ] Mobile app (React Native)
- [ ] AI tutor matching
- [ ] Advanced analytics
- [ ] Multiple language support

---

## 📄 License

All rights reserved - LopHoc.Online Team

---

**Phát triển với ❤️ cho giáo dục Việt Nam** 🇻🇳
