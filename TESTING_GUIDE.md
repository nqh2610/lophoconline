# Hướng dẫn kiểm tra tính năng Gia sư

## Tổng quan

Đã hoàn thiện các tính năng:
1. ✅ Đăng ký làm gia sư
2. ✅ Hiển thị danh sách gia sư từ database
3. ✅ Hiển thị chi tiết gia sư từ database

## Chuẩn bị

### 1. Khởi động ứng dụng

```bash
npm run dev
```

Ứng dụng sẽ chạy tại: http://localhost:3000

### 2. Dữ liệu mẫu

Đã tạo 4 gia sư mẫu với thông tin đăng nhập:

| Tên đăng nhập | Họ tên | Môn dạy | Kinh nghiệm | Học phí/giờ |
|---------------|--------|---------|-------------|-------------|
| tutor_mai | Nguyễn Thị Mai | Toán, Vật Lý | 5 năm | 200,000đ |
| tutor_hung | Trần Văn Hùng | Tiếng Anh, IELTS | 7 năm | 250,000đ |
| tutor_tu | Lê Minh Tú | Toán, Tin học | 3 năm | 120,000đ |
| tutor_ha | Phạm Thu Hà | Hóa học, Sinh học | 4 năm | 180,000đ |

**Mật khẩu cho tất cả:** `password123`

## Quy trình test

### Test 1: Xem danh sách gia sư

1. Truy cập http://localhost:3000
2. Click vào nút "Tìm gia sư" hoặc truy cập http://localhost:3000/tutors
3. **Kiểm tra:**
   - Hiển thị 4 gia sư từ database
   - Mỗi card hiển thị: avatar, tên, môn dạy, rating, học phí
   - Badge "Đã xác thực" hiển thị đúng
   - Có thể sắp xếp theo: giá, rating, kinh nghiệm, đánh giá
   - Loading spinner hiển thị khi đang tải dữ liệu

### Test 2: Xem chi tiết gia sư

1. Từ trang danh sách, click vào bất kỳ gia sư nào
2. **Kiểm tra:**
   - Hiển thị đầy đủ thông tin: bio, học vấn, chứng chỉ
   - Phương pháp giảng dạy được hiển thị
   - Các môn dạy và cấp lớp
   - Rating và số lượng đánh giá
   - Thông tin liên hệ và nghề nghiệp
   - Loading state khi đang tải
   - Error state nếu không tìm thấy gia sư

### Test 3: Đăng ký làm gia sư mới

#### Bước 1: Tạo tài khoản (nếu chưa có)

1. Truy cập http://localhost:3000
2. Click "Đăng nhập" → "Đăng ký tài khoản"
3. Điền thông tin:
   - Username: `test_tutor`
   - Email: `test@example.com`
   - Password: `password123`
   - Role: Chọn "Tutor"
4. Click "Đăng ký"

#### Bước 2: Đăng ký làm gia sư

1. Sau khi đăng nhập, truy cập http://localhost:3000/tutor-registration
2. Điền form đăng ký qua 5 bước:

   **Bước 1 - Thông tin cá nhân:**
   - Họ tên: Nguyễn Văn Test
   - Email: test@example.com
   - Số điện thoại: 0123456789

   **Bước 2 - Trình độ học vấn:**
   - Trình độ: Đại học
   - Tên trường: Đại học ABC
   - Chuyên ngành: Toán học
   - Năm tốt nghiệp: 2020

   **Bước 3 - Kinh nghiệm & Môn học:**
   - Số năm kinh nghiệm: 2
   - Nghề nghiệp: Sinh viên
   - Môn học: Chọn ít nhất 1 môn (vd: Toán)
   - Cấp lớp: Chọn ít nhất 1 cấp (vd: THCS)

   **Bước 4 - Hồ sơ giảng dạy:**
   - Giới thiệu bản thân: Ít nhất 50 ký tự
   - Phương pháp giảng dạy: Ít nhất 20 ký tự

   **Bước 5 - Thời gian & Học phí:**
   - Ngày rảnh: Chọn ít nhất 1 ngày
   - Khung giờ: Chọn ít nhất 1 khung
   - Học phí/giờ: Nhập số tiền (vd: 150000)

3. Click "Hoàn tất đăng ký"

4. **Kiểm tra:**
   - Toast thông báo "Đăng ký thành công!"
   - Tự động chuyển đến trang `/tutor/dashboard`
   - Không có lỗi trong console

#### Bước 3: Xác nhận gia sư mới xuất hiện

1. Truy cập http://localhost:3000/tutors
2. **Chú ý:** Gia sư mới sẽ **KHÔNG hiển thị** vì:
   - `verificationStatus` mặc định là `pending`
   - Chỉ gia sư có status `verified` mới hiển thị

3. Để xem gia sư mới, cần cập nhật database:
   ```sql
   UPDATE tutors
   SET verification_status = 'verified'
   WHERE full_name = 'Nguyễn Văn Test';
   ```

4. Hoặc sử dụng Drizzle Studio:
   ```bash
   npm run db:studio
   ```
   - Truy cập http://localhost:4983
   - Mở bảng `tutors`
   - Tìm gia sư mới
   - Sửa `verificationStatus` thành `verified`
   - Click Save

5. Reload trang /tutors - gia sư mới sẽ xuất hiện

## Kiểm tra API trực tiếp

### GET /api/tutors - Lấy danh sách gia sư

```bash
curl http://localhost:3000/api/tutors
```

**Params hỗ trợ:**
- `subject`: Lọc theo môn học (vd: `?subject=Toán`)
- `minRate`, `maxRate`: Lọc theo học phí
- `experience`: Lọc theo kinh nghiệm tối thiểu
- `sortBy`: rating | price | experience | reviews
- `sortOrder`: asc | desc
- `limit`, `offset`: Phân trang

Ví dụ:
```bash
# Lọc gia sư dạy Toán, sắp xếp theo rating
curl "http://localhost:3000/api/tutors?subject=Toán&sortBy=rating&sortOrder=desc"

# Gia sư học phí dưới 200k
curl "http://localhost:3000/api/tutors?maxRate=200000"
```

### GET /api/tutors/[id] - Lấy chi tiết gia sư

```bash
curl http://localhost:3000/api/tutors/1
```

### POST /api/tutors - Tạo hồ sơ gia sư mới

Cần authentication (đăng nhập trước).

```bash
curl -X POST http://localhost:3000/api/tutors \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "fullName": "Test Tutor",
    "bio": "Test bio content...",
    "teachingMethod": "Test teaching method...",
    "education": "[{\"degree\":\"Đại học\",\"school\":\"Test University\",\"year\":\"2020\"}]",
    "subjects": "[{\"subject\":\"Toán\",\"grades\":[\"lớp 10\"]}]",
    "experience": 2,
    "hourlyRate": 150000,
    "occupation": "Sinh viên"
  }'
```

## Database Schema

### Bảng `tutors`

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| id | INT | Primary key, auto increment |
| userId | INT | Foreign key tới bảng users |
| fullName | VARCHAR(255) | Họ tên gia sư |
| avatar | TEXT | URL ảnh đại diện |
| bio | TEXT | Giới thiệu bản thân |
| teachingMethod | TEXT | Phương pháp giảng dạy |
| education | TEXT | JSON: Thông tin học vấn |
| certifications | TEXT | JSON: Chứng chỉ |
| achievements | TEXT | JSON: Thành tựu |
| subjects | TEXT | JSON: Môn dạy và cấp lớp |
| languages | VARCHAR(255) | Ngôn ngữ |
| experience | INT | Số năm kinh nghiệm |
| hourlyRate | INT | Học phí/giờ (VND) |
| rating | INT | Điểm đánh giá (0-50, = 0-5.0 * 10) |
| totalReviews | INT | Tổng số đánh giá |
| totalStudents | INT | Tổng số học sinh |
| videoIntro | TEXT | URL video giới thiệu |
| occupation | VARCHAR(255) | Nghề nghiệp |
| verificationStatus | VARCHAR(50) | pending/verified/rejected |
| isActive | INT | 1=active, 0=inactive |
| createdAt | TIMESTAMP | Ngày tạo |
| updatedAt | TIMESTAMP | Ngày cập nhật |

## Các vấn đề thường gặp

### Không hiển thị gia sư

- Kiểm tra `verificationStatus = 'verified'`
- Kiểm tra `isActive = 1`
- Kiểm tra console browser có lỗi API không

### Lỗi khi đăng ký

- Kiểm tra đã đăng nhập chưa
- Kiểm tra `userId` có tồn tại trong bảng `users` không
- Kiểm tra format JSON của `subjects`, `education` có đúng không

### Lỗi database connection

- Kiểm tra MySQL server đang chạy
- Kiểm tra `.env` có `DATABASE_URL` chính xác không
- Kiểm tra database `lophoc_online` đã được tạo chưa

## Tính năng sẽ bổ sung trong tương lai

- [ ] Upload ảnh đại diện và chứng chỉ
- [ ] Quản lý lịch dạy từ bảng `tutor_availability`
- [ ] Hệ thống đánh giá (bảng `reviews`)
- [ ] Tìm kiếm nâng cao với filter
- [ ] Hệ thống thanh toán
- [ ] Chat trực tiếp giữa học sinh và gia sư
- [ ] Video call cho buổi học online

## Ghi chú kỹ thuật

### API Structure
- **GET /api/tutors**: Public, không cần auth
- **GET /api/tutors/[id]**: Public, không cần auth
- **POST /api/tutors**: Cần auth, chỉ user đã đăng nhập
- **PUT /api/tutors/[id]**: Cần auth, chỉ owner của profile

### Data Flow
1. User đăng ký tài khoản → tạo record trong `users`
2. User điền form đăng ký gia sư → gọi POST `/api/tutors` → tạo record trong `tutors`
3. Admin duyệt → update `verificationStatus` → gia sư xuất hiện trên trang /tutors
4. Student xem danh sách → GET `/api/tutors` → hiển thị danh sách
5. Student xem chi tiết → GET `/api/tutors/[id]` → hiển thị chi tiết

### Transform Functions
- `transformTutorData()` trong `/tutors/page.tsx`: Chuyển từ DB format sang TutorCard props
- Trong `/tutor/[id]/page.tsx`: Chuyển từ DB format sang TutorDetailData

---

**Phiên bản:** 1.0.0
**Ngày cập nhật:** 2025-10-18
**Người tạo:** Claude Code Assistant
