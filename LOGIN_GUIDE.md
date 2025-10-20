# Hướng dẫn đăng nhập hệ thống LopHoc.Online

## 🔐 Tài khoản Test

Hệ thống đã được thiết lập sẵn 3 tài khoản test cho các vai trò khác nhau:

### 1. **Admin** (Quản trị viên)
```
Username: admin
Password: 123456
Dashboard: /admin
```

**Quyền hạn:**
- ✅ Quản lý người dùng (tạo, sửa, xóa, khóa/mở khóa)
- ✅ Quản lý học viên
- ✅ Quản lý gia sư (duyệt, từ chối)
- ✅ Quản lý giao dịch
- ✅ Quản lý tài chính
- ✅ Xem thống kê tổng quan

### 2. **Student** (Học viên)
```
Username: student1
Password: 123456
Dashboard: /student
```

**Chức năng:**
- ✅ Tìm kiếm gia sư
- ✅ Đăng ký lớp học
- ✅ Xem lịch học
- ✅ Thanh toán học phí
- ✅ Đánh giá gia sư
- ✅ Quản lý hồ sơ cá nhân

### 3. **Tutor** (Gia sư)
```
Username: tutor1
Password: 123456
Dashboard: /tutor
```

**Chức năng:**
- ✅ Quản lý lịch dạy
- ✅ Quản lý học viên
- ✅ Xem thu nhập
- ✅ Xem đánh giá
- ✅ Cập nhật thông tin cá nhân
- ✅ Thiết lập lịch rảnh

---

## 📝 Cách đăng nhập

### Bước 1: Truy cập trang chủ
Mở trình duyệt và truy cập: `http://localhost:3000`

### Bước 2: Click nút "Đăng nhập"
Tìm và click vào nút **Đăng nhập** ở góc trên bên phải

### Bước 3: Nhập thông tin
- **Tên đăng nhập**: Nhập một trong các username (admin, student1, tutor1)
- **Mật khẩu**: Nhập `123456`

### Bước 4: Click "Đăng nhập"
Hệ thống sẽ tự động redirect bạn đến dashboard phù hợp với vai trò:
- **Admin** → `/admin`
- **Student** → `/student`
- **Tutor** → `/tutor`

---

## 🎯 Dashboard Links

### Admin Dashboard (`/admin`)
| Tính năng | Link | Mô tả |
|-----------|------|-------|
| Dashboard | `/admin` | Tổng quan hệ thống |
| Người dùng | `/admin/users` | Quản lý tất cả người dùng |
| Học viên | `/admin/students` | Quản lý học viên |
| Gia sư | `/admin/tutors` | Quản lý và duyệt gia sư |
| Giao dịch | `/admin/transactions` | Lịch sử giao dịch |
| Tài chính | `/admin/financial` | Quản lý tài chính, escrow |

### Student Dashboard (`/student`)
| Tính năng | Link | Mô tả |
|-----------|------|-------|
| Dashboard | `/student` | Trang chủ học viên |
| Tìm gia sư | `/tutors` | Tìm kiếm và lọc gia sư |
| Lớp học | `/student/classes` | Quản lý lớp học |
| Thanh toán | `/student/payments` | Lịch sử thanh toán |
| Hồ sơ | `/student/profile` | Cập nhật thông tin |
| Thông báo | `/student/notifications` | Xem thông báo |

### Tutor Dashboard (`/tutor`)
| Tính năng | Link | Mô tả |
|-----------|------|-------|
| Dashboard | `/tutor` | Trang chủ gia sư |
| Lịch dạy | `/tutor/availability` | Thiết lập lịch rảnh |
| Học viên | `/tutor/students` | Danh sách học viên |
| Buổi học | `/tutor/lessons` | Quản lý buổi học |
| Thu nhập | `/tutor/earnings` | Xem thu nhập |
| Đánh giá | `/tutor/reviews` | Xem đánh giá |
| Cài đặt | `/tutor/settings` | Cập nhật hồ sơ |

---

## 🔒 Bảo mật

### Middleware Protection
Hệ thống sử dụng NextAuth middleware để bảo vệ các route:
- **Admin routes** (`/admin/*`): Chỉ admin mới truy cập được
- **Tutor routes** (`/tutor/*`): Chỉ tutor mới truy cập được
- **Student routes** (`/student/*`): Chỉ student mới truy cập được

Nếu cố gắng truy cập route không có quyền, hệ thống sẽ tự động redirect về trang chủ.

### Session Management
- **Strategy**: JWT-based
- **Max Age**: 30 ngày
- **Refresh**: Automatic
- **Logout**: `signOut({ callbackUrl: "/" })`

### Password Security
- **Hashing**: bcrypt (10 rounds)
- **Storage**: Không lưu plain text password
- **Validation**: Check isActive trước khi login

---

## 🧪 Testing Scenarios

### Test Admin Functions
1. Login với `admin/123456`
2. Truy cập `/admin/users`
3. Thử các chức năng:
   - Tạo user mới
   - Chỉnh sửa user
   - Khóa/Mở khóa tài khoản
   - Xóa user
   - Tìm kiếm và lọc

### Test Student Functions
1. Login với `student1/123456`
2. Truy cập `/student`
3. Thử các chức năng:
   - Xem dashboard
   - Tìm gia sư tại `/tutors`
   - Xem lịch học

### Test Tutor Functions
1. Login với `tutor1/123456`
2. Truy cập `/tutor`
3. Thử các chức năng:
   - Xem dashboard
   - Quản lý lịch dạy
   - Xem thu nhập

---

## 🐛 Troubleshooting

### Lỗi: "Tài khoản đã bị khóa"
**Nguyên nhân**: User có `is_active = 0` trong database

**Giải pháp**:
```sql
UPDATE users SET is_active = 1 WHERE username = 'admin';
```

### Lỗi: "Unauthorized - Admin access required"
**Nguyên nhân**: User không phải admin nhưng cố truy cập admin routes

**Giải pháp**: Login với tài khoản admin

### Lỗi: Login không redirect
**Nguyên nhân**: Session không được tạo đúng

**Giải pháp**:
1. Check NEXTAUTH_SECRET trong .env
2. Clear browser cache
3. Restart dev server

---

## 📚 API Endpoints

### Authentication
- `POST /api/auth/signin` - Login (NextAuth)
- `POST /api/auth/signout` - Logout
- `GET /api/auth/session` - Get current session

### Admin API
- `GET /api/admin/users` - List users (pagination, search, filter)
- `POST /api/admin/users` - Create user
- `GET /api/admin/users/[id]` - Get user detail
- `PUT /api/admin/users/[id]` - Update user
- `DELETE /api/admin/users/[id]` - Delete user
- `PATCH /api/admin/users/[id]/status` - Toggle user status

---

## 🔄 Reset Test Accounts

Nếu cần reset lại tài khoản test, chạy script:

```bash
node setup-test-accounts.js
```

Script sẽ:
- Tạo/cập nhật 3 tài khoản test
- Set password về `123456`
- Đảm bảo `is_active = 1`
- Tạo profile tương ứng (student, tutor)

---

## 📞 Support

Nếu gặp vấn đề, kiểm tra:
1. Database connection (MySQL running)
2. Environment variables (.env file)
3. Next.js dev server (port 3000)
4. Browser console (F12) để xem errors
