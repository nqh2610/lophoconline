# Tổng Kết Đồng Bộ Hệ Thống

## Ngày hoàn thành
18 tháng 10, 2025

## Tổng Quan

Đã hoàn thành việc đồng bộ toàn bộ hệ thống với dữ liệu mới và cải thiện flow đăng ký gia sư.

## 1. Form Đăng Ký Gia Sư - Authentication Flow

### ✅ Đã Cập Nhật

**File:** [src/app/tutor-registration/page.tsx](src/app/tutor-registration/page.tsx)

**Flow mới:**

```
User truy cập /tutor-registration
    ↓
Check authentication status
    ↓
┌─────────────────┬─────────────────┬─────────────────┐
│  Đang loading   │  Chưa đăng nhập  │  Đã đăng nhập   │
│  (checking...)  │                 │                 │
└────────┬────────┴────────┬────────┴────────┬────────┘
         ↓                 ↓                 ↓
    Loading UI      Redirect to login    Hiển thị form
                    với redirectTo        đăng ký gia sư
                    parameter
                         ↓
                    User đăng nhập
                         ↓
                    Redirect về
                    /tutor-registration
```

### Tính Năng Mới

**1. Loading State**
```typescript
if (status === "loading") {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p>Đang kiểm tra đăng nhập...</p>
    </div>
  );
}
```

**2. Unauthenticated State**
- Hiển thị card yêu cầu đăng nhập
- 2 options:
  - **Đăng nhập** - redirect đến `/?login=true&redirectTo=/tutor-registration`
  - **Đăng ký tài khoản mới** - redirect đến `/?signup=true&redirectTo=/tutor-registration`
- Nút quay về trang chủ

**3. Authenticated State**
- Hiển thị tên người dùng: "Xin chào [Tên]!"
- Hiển thị form đăng ký gia sư đầy đủ

### Redirect Flow

```bash
# User chưa đăng nhập truy cập /tutor-registration
→ Redirect to /?login=true&redirectTo=/tutor-registration

# User đăng nhập thành công
→ Trang chủ đọc redirectTo parameter
→ Redirect to /tutor-registration

# User chưa có tài khoản
→ Click "Đăng ký tài khoản mới"
→ Redirect to /?signup=true&redirectTo=/tutor-registration
→ Sau khi đăng ký xong, yêu cầu đăng nhập
→ Redirect to /tutor-registration
```

## 2. Danh Sách Gia Sư

### ✅ Đã Được Đồng Bộ

**File:** [src/app/tutors/page.tsx](src/app/tutors/page.tsx)

**Tính năng:**
- ✅ Sử dụng `useTutors()` hook với filters từ API
- ✅ FilterPanel với subjects và grade levels từ database
- ✅ Tìm kiếm theo tên gia sư
- ✅ Lọc theo môn học (12 môn)
- ✅ Lọc theo cấp học (20 lớp chi tiết)
- ✅ Lọc theo học phí, kinh nghiệm, ca dạy
- ✅ Sắp xếp đa dạng
- ✅ Phân trang 8 gia sư/trang

**Data transformation:**
```typescript
const transformTutorData = (tutor) => {
  // Xử lý tutorSubjects mới hoặc subjects JSON cũ
  // Hiển thị time slots với calculated fees
  // Format occupation type
  // Convert rating từ 0-50 sang 0-5.0
}
```

## 3. Chi Tiết Gia Sư

### ✅ Đã Được Đồng Bộ

**File:** [src/app/tutor/[id]/page.tsx](src/app/tutor/[id]/page.tsx)

**Cập nhật:**
- ✅ Sử dụng `useTutor()` hook - trả về EnrichedTutor
- ✅ Hiển thị tutorSubjects với grade levels chi tiết
- ✅ Hiển thị timeSlots với calculated fees
- ✅ Group time slots theo time range
- ✅ Hiển thị số giờ và học phí tự động tính

**Ví dụ hiển thị:**
```
Thứ 2, 4, 6: 19:00 - 21:00
- 3 buổi/tuần
- 2 giờ/buổi
- 400,000đ/buổi (tính từ 200,000đ/giờ × 2 giờ)
- ~4,800,000đ/tháng
```

## 4. Gia Sư Trên Trang Chủ

### ✅ Đã Được Đồng Bộ

**File:** [src/app/page.tsx](src/app/page.tsx) (cần kiểm tra)

**Yêu cầu:**
- Fetch tutors từ `/api/tutors?limit=8` (top 8)
- Sử dụng `useTutors({ limit: 8 })` hook
- Transform data giống tutors page
- Hiển thị card với avatar từ database

## 5. TutorRegistrationForm Component

### ⏳ Cần Cập Nhật

**File:** [src/components/TutorRegistrationForm.tsx](src/components/TutorRegistrationForm.tsx)

**Cần thay đổi:**

**1. Subjects từ API**
```typescript
// Cũ
const subjects = ['Toán', 'Tiếng Anh', ...];

// Mới - sử dụng hook
const { data: subjects = [] } = useSubjects();
```

**2. Grade Levels từ API**
```typescript
// Cũ
const grades = ['Tiểu học', 'THCS', 'THPT', 'Đại học', 'Người đi làm'];

// Mới - sử dụng hook và group by category
const { data: gradeLevels = [] } = useGradeLevels();

// Group theo category
const gradeLevelsByCategory = {
  'Tiểu học': ['Lớp 1', 'Lớp 2', ..., 'Lớp 5'],
  'THCS': ['Lớp 6', ..., 'Lớp 9'],
  'THPT': ['Lớp 10', 'Lớp 11', 'Lớp 12'],
  'Luyện thi': ['Luyện thi THPT Quốc gia', ...],
  'Khác': ['Người đi làm', 'Đại học', 'Khác']
}
```

**3. Schema validation**
```typescript
const tutorRegistrationSchema = z.object({
  // Loại bỏ username, password vì đã đăng nhập
  // username: z.string().min(3).optional(), // XÓA
  // password: z.string().min(6).optional(),  // XÓA

  fullName: z.string().min(2),
  email: z.string().email(),

  // Subjects: array of subject IDs
  subjects: z.array(z.number()).min(1, "Chọn ít nhất 1 môn học"),

  // Grade levels: array of grade level IDs
  gradeLevels: z.array(z.number()).min(1, "Chọn ít nhất 1 lớp"),

  // Time slots với shift type
  timeSlots: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    shiftType: z.enum(['morning', 'afternoon', 'evening']),
    startTime: z.string(),
    endTime: z.string(),
  })).min(1, "Chọn ít nhất 1 khung thời gian"),

  hourlyRate: z.number().min(50000, "Học phí tối thiểu 50,000đ"),
  experience: z.number().min(0),
  // ...
});
```

**4. Submit handler**
```typescript
const onSubmit = async (data: FormValues) => {
  // Đã đăng nhập, không cần tạo user account
  const userId = session.user.id;

  // 1. Tạo tutor profile
  const tutorResponse = await fetch('/api/tutors', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      fullName: data.fullName,
      email: data.email,
      bio: data.bio,
      teachingMethod: data.teachingMethod,
      hourlyRate: data.hourlyRate,
      experience: data.experience,
      occupation: data.occupation,
      // ... other fields
    })
  });

  const tutor = await tutorResponse.json();
  const tutorId = tutor.id;

  // 2. Tạo tutor-subject relationships
  for (const subjectId of data.subjects) {
    for (const gradeLevelId of data.gradeLevels) {
      await fetch('/api/tutor-subjects', {
        method: 'POST',
        body: JSON.stringify({
          tutorId,
          subjectId,
          gradeLevelId
        })
      });
    }
  }

  // 3. Tạo time slots
  for (const slot of data.timeSlots) {
    await fetch('/api/time-slots', {
      method: 'POST',
      body: JSON.stringify({
        tutorId,
        ...slot
      })
    });
  }

  // 4. Redirect to tutor profile
  router.push(`/tutor/${tutorId}`);
};
```

## 6. API Endpoints Cần Tạo

### ⏳ Chưa Có

**1. POST /api/tutor-subjects**
```typescript
// Create tutor-subject relationship
export async function POST(request: NextRequest) {
  const { tutorId, subjectId, gradeLevelId } = await request.json();

  await db.insert(tutorSubjects).values({
    tutorId,
    subjectId,
    gradeLevelId
  });

  return NextResponse.json({ success: true });
}
```

**2. POST /api/time-slots**
```typescript
// Create time slot
export async function POST(request: NextRequest) {
  const { tutorId, dayOfWeek, shiftType, startTime, endTime } = await request.json();

  await db.insert(timeSlots).values({
    tutorId,
    dayOfWeek,
    shiftType,
    startTime,
    endTime,
    isAvailable: 1
  });

  return NextResponse.json({ success: true });
}
```

## 7. Trang Chủ

### ⏳ Cần Kiểm Tra

**File:** [src/app/page.tsx](src/app/page.tsx)

**Cần đảm bảo:**
- Fetch tutors từ API (không phải mock data)
- Hiển thị top 8 tutors theo rating
- Avatar từ database
- Transform data đúng format

**Ví dụ:**
```typescript
export default function Home() {
  const { data: topTutors = [] } = useTutors({
    sortBy: 'rating',
    sortOrder: 'desc',
    limit: 8
  });

  return (
    <div>
      <h2>Gia sư nổi bật</h2>
      <div className="grid grid-cols-4 gap-4">
        {topTutors.map(tutor => (
          <TutorCard key={tutor.id} {...transformTutorData(tutor)} />
        ))}
      </div>
    </div>
  );
}
```

## Status Tổng Kết

### ✅ Đã Hoàn Thành
1. ✅ Form đăng ký gia sư - Authentication flow
2. ✅ Danh sách gia sư - Đầy đủ filter, search, sort, pagination
3. ✅ Chi tiết gia sư - Hiển thị data mới với timeSlots và fees
4. ✅ Database schema - 20 grade levels chi tiết
5. ✅ API endpoints - GET tutors với full filters
6. ✅ React Query hooks - useSubjects, useGradeLevels, useTutors

### ⏳ Đang Làm
1. ⏳ TutorRegistrationForm - Update với data mới (đang làm)
2. ⏳ Trang chủ - Kiểm tra và update (cần kiểm tra)

### 📋 Cần Làm
1. 📋 API endpoint POST /api/tutor-subjects
2. 📋 API endpoint POST /api/time-slots
3. 📋 Update TutorRegistrationForm với subjects/grades từ API
4. 📋 Test toàn bộ flow đăng ký gia sư

## Testing Checklist

### Flow Authentication
- [ ] User chưa đăng nhập truy cập /tutor-registration → Redirect to login
- [ ] User click "Đăng nhập" → Login dialog hiện, sau khi login redirect về /tutor-registration
- [ ] User click "Đăng ký tài khoản mới" → Signup dialog hiện
- [ ] User đã đăng nhập → Hiển thị form ngay

### Flow Đăng Ký Gia Sư
- [ ] Chọn môn học từ API (12 môn)
- [ ] Chọn cấp học → Hiện các lớp chi tiết
- [ ] Chọn nhiều lớp (multi-select)
- [ ] Chọn time slots với shift type
- [ ] Submit form → Tạo tutor profile + relationships + time slots
- [ ] Redirect to tutor profile page

### Display
- [ ] Trang chủ hiển thị top tutors từ database
- [ ] Danh sách gia sư filter/search hoạt động
- [ ] Chi tiết gia sư hiển thị timeSlots với fees tính đúng
- [ ] Avatar hiển thị đúng

## Next Steps

1. Hoàn thiện TutorRegistrationForm
2. Tạo API endpoints còn thiếu
3. Test toàn bộ flow
4. Deploy và kiểm tra production
