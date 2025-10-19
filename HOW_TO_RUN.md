# 🎓 LopHoc.Online - Hướng dẫn chạy dự án

## 📋 Yêu cầu hệ thống

- Node.js 18+ và npm
- MySQL 8.0+

## 🚀 Cài đặt và chạy lần đầu

### Bước 1: Cài đặt dependencies

```bash
npm install
```

### Bước 2: Tạo database MySQL

Mở MySQL và chạy lệnh:

```sql
CREATE DATABASE lophoc_online CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Bước 3: Cấu hình môi trường

Tạo file `.env.local` trong thư mục gốc với nội dung:

```bash
# Database
DATABASE_URL=mysql://root:mat_khau@localhost:3306/lophoc_online

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key-here

# Node Environment
NODE_ENV=development
```

⚠️ **Lưu ý:**
- Thay `root` và `mat_khau` bằng thông tin MySQL của bạn
- Tạo NEXTAUTH_SECRET bằng lệnh: `openssl rand -base64 32`

### Bước 4: Tạo bảng database

```bash
npm run db:push
```

### Bước 5: Chạy development server

```bash
npm run dev
```

Mở trình duyệt: **http://localhost:3000** 🎉

## 📝 Các lệnh quan trọng

```bash
npm run dev          # Chạy Next.js development server
npm run build        # Build production
npm run start        # Chạy production server
npm run lint         # Kiểm tra code với ESLint
npm run db:push      # Đồng bộ schema với database
npm run db:studio    # Mở Drizzle Studio để quản lý database
```

## 🌐 Danh sách các trang web

### Trang chính
- `/` - Trang chủ
- `/tutors` - Danh sách gia sư
- `/tutor/[id]` - Chi tiết gia sư
- `/dashboard` - Dashboard học sinh
- `/tutor-registration` - Đăng ký làm gia sư
- `/packages` - Các gói học phí

### Trang dành cho gia sư
- `/tutor/dashboard` - Dashboard gia sư
- `/tutor/verification` - Xác thực tài khoản gia sư
- `/tutor/profile-setup` - Thiết lập hồ sơ cá nhân
- `/tutor/schedule-setup` - Thiết lập lịch dạy
- `/tutor/recurring-schedule` - Lịch dạy định kỳ
- `/tutor/availability` - Quản lý lịch rảnh
- `/tutor/trial-requests` - Yêu cầu học thử
- `/tutor/teaching` - Quản lý lớp học đang dạy
- `/tutor/feedback` - Xem phản hồi từ học sinh
- `/tutor/reputation` - Danh tiếng và đánh giá

### Trang dành cho học sinh
- `/student/timetable` - Thời khóa biểu
- `/student/booking` - Đặt lịch học với gia sư
- `/student/register` - Đăng ký làm học sinh

### Trang quản trị (Admin)
- `/admin` - Dashboard quản trị viên
- `/admin/tutors` - Quản lý gia sư
- `/admin/students` - Quản lý học sinh
- `/admin/transactions` - Quản lý giao dịch

### Trang thông tin
- `/about` - Giới thiệu về nền tảng
- `/how-it-works` - Cách thức hoạt động
- `/pricing` - Bảng giá dịch vụ
- `/faq` - Câu hỏi thường gặp
- `/for-tutors` - Thông tin dành cho gia sư
- `/for-students` - Thông tin dành cho học sinh
- `/for-parents` - Thông tin dành cho phụ huynh
- `/privacy` - Chính sách bảo mật
- `/terms` - Điều khoản sử dụng

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - Đăng ký tài khoản mới
- `POST /api/auth/signin` - Đăng nhập
- `POST /api/auth/signout` - Đăng xuất
- `GET /api/auth/session` - Lấy thông tin session

### Tutor Availability (Lịch rảnh gia sư)
- `GET /api/tutor-availability/[tutorId]` - Lấy lịch rảnh của gia sư
- `POST /api/tutor-availability` - Tạo lịch rảnh mới
- `PUT /api/tutor-availability/[id]` - Cập nhật lịch rảnh
- `DELETE /api/tutor-availability/[id]` - Xóa lịch rảnh

### Lessons (Lớp học)
- `GET /api/lessons/tutor/[tutorId]` - Lấy danh sách lớp của gia sư
- `GET /api/lessons/student/[studentId]` - Lấy danh sách lớp của học sinh
- `POST /api/lessons` - Đặt lịch học mới
- `PUT /api/lessons/[id]` - Cập nhật thông tin lớp học

## 🛠️ Stack công nghệ

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Backend:** Next.js API Routes
- **Authentication:** NextAuth.js v4 (JWT)
- **Database:** MySQL 8.0
- **ORM:** Drizzle ORM
- **UI:** Tailwind CSS 3, Shadcn/ui
- **State Management:** TanStack Query (React Query)
- **Rich Text:** TipTap Editor
- **Icons:** Lucide React

## 🐛 Khắc phục lỗi thường gặp

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

```bash
# Windows
netstat -ano | findstr :3000
# Sau đó kill process bằng Task Manager

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

### ❌ "Cannot find module '@/...' "

Chạy lại:

```bash
rm -rf node_modules package-lock.json
npm install
```

## 📞 Hỗ trợ

- 📧 Email: support@lophoc.online
- 🌐 Website: https://lophoc.online
- 📚 Docs: [HOW_TO_RUN.md](./HOW_TO_RUN.md)

---

**Phát triển với ❤️ cho giáo dục Việt Nam** 🇻🇳
