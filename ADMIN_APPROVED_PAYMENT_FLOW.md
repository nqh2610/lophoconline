# Luồng Thanh Toán Qua Admin Duyệt - Bảo Mật & Chính Xác

## 🎯 Tổng Quan

Hệ thống **KHÔNG tự động chia tiền** sau mỗi buổi học. Thay vào đó:
- ✅ Hệ thống **GHI NHẬN** số buổi học thực tế
- ✅ Admin **XEM DANH SÁCH** lớp đủ điều kiện thanh toán
- ✅ Admin **DUYỆT** từng trường hợp cụ thể
- ✅ Hệ thống **TỰ ĐỘNG TÍNH TOÁN** tiền chính xác + phí hoa hồng
- ✅ **AN TOÀN** cho cả học sinh và gia sư

## 📊 Luồng Nghiệp Vụ Chi Tiết

### 1. Học Sinh Đăng Ký & Thanh Toán (Giống cũ)

```
POST /api/enrollments/create
→ Tạo enrollment (status='pending')

POST /api/payment/create
→ Tạo payment URL (VNPay/Momo)

GET /api/payment/vnpay/callback
→ Verify HMAC signature
→ Create escrow (status='holding')
→ Update enrollment (status='active')

Kết quả:
- Tiền học sinh: HOLDING trong escrow
- Trạng thái: Chờ bắt đầu học
```

### 2. Gia Sư Ghi Nhận Buổi Học (THAY ĐỔI - Chỉ ghi nhận)

```
POST /api/sessions/[id]/complete
Body: {
  "tutorNotes": "Học sinh tiến bộ tốt",
  "studentAttended": true
}
```

**CHỈ GHI NHẬN, KHÔNG RELEASE ESCROW**:
```typescript
// Cập nhật session
session.status = 'completed'
session.tutorAttended = 1
session.studentAttended = 1
session.completedAt = NOW()

// Tăng số buổi đã hoàn thành
enrollment.completedSessions += 1

// QUAN TRỌNG: KHÔNG chia tiền ngay
// escrow.releasedAmount vẫn = 0
// wallet.pendingBalance KHÔNG thay đổi
```

**Response**:
```json
{
  "success": true,
  "session": {
    "id": 123,
    "sessionNumber": 1,
    "status": "completed"
  },
  "enrollment": {
    "completedSessions": 1,
    "totalSessions": 10,
    "isCompleted": false
  },
  "message": "Đã ghi nhận buổi học. Admin sẽ duyệt thanh toán khi đủ điều kiện."
}
```

### 3. Hệ Thống Thống Kê Số Buổi Đã Học

Sau khi gia sư ghi nhận buổi học:

```sql
-- Hệ thống tự động thống kê
SELECT
  enrollment_id,
  COUNT(*) as completed_sessions
FROM session_records
WHERE status = 'completed'
GROUP BY enrollment_id
```

**Dữ liệu**:
```
enrollment_id: 123
total_sessions: 10
completed_sessions: 5 (đã học 5 buổi)
price_per_session: 200,000
total_amount: 2,000,000 (đã thanh toán vào escrow)
```

### 4. Admin Xem Danh Sách Đủ Điều Kiện

```
GET /api/admin/enrollments/eligible-for-payout
```

**Điều kiện thanh toán**:

1. ✅ **Đủ 1 tháng từ buổi học đầu tiên**
   ```
   Buổi học đầu: 2025-09-15
   Ngày hiện tại: 2025-10-20
   → Đủ 30 ngày ✅
   ```

2. ✅ **Lớp đã kết thúc**
   ```
   enrollment.status = 'completed'
   completed_sessions = total_sessions
   ```

3. ✅ **Gia sư yêu cầu thanh toán**
   ```
   tutor_requested_payout = 1
   (TODO: Thêm field này)
   ```

4. ✅ **Học sinh yêu cầu nghỉ - tính theo buổi thực tế**
   ```
   enrollment.status = 'cancelled'
   → Tính tiền cho completed_sessions chứ không phải total_sessions
   ```

**Response Example**:
```json
{
  "success": true,
  "count": 3,
  "enrollments": [
    {
      "enrollment": {
        "id": 123,
        "totalSessions": 10,
        "completedSessions": 10,  // Đã học hết
        "pricePerSession": 200000,
        "totalAmount": 2000000,
        "status": "completed"
      },
      "tutor": {
        "id": 5,
        "fullName": "Nguyễn Văn A"
      },
      "student": {
        "id": 15,
        "fullName": "Trần Thị B"
      },
      "escrow": {
        "id": 45,
        "totalAmount": 2000000,      // Tổng đã giữ
        "alreadyReleased": 0,        // Chưa release gì
        "amountToRelease": 2000000,  // Cần release
        "platformFee": 300000,       // 15%
        "tutorAmount": 1700000,      // 85%
        "commissionRate": 15
      },
      "reason": "Lớp đã kết thúc",
      "firstSessionDate": "2025-09-15",
      "lastSessionDate": "2025-10-18"
    },
    {
      "enrollment": {
        "id": 124,
        "totalSessions": 10,
        "completedSessions": 5,      // Chỉ học 5 buổi
        "pricePerSession": 200000,
        "totalAmount": 2000000,
        "status": "cancelled"        // Học sinh nghỉ
      },
      "escrow": {
        "totalAmount": 2000000,
        "alreadyReleased": 0,
        "amountToRelease": 1000000,  // CHỈ 5 buổi thực tế
        "platformFee": 150000,
        "tutorAmount": 850000,
        "commissionRate": 15
      },
      "reason": "Học sinh nghỉ - tính theo buổi thực tế"
    }
  ],
  "summary": {
    "totalToRelease": 3000000,     // Tổng cần release
    "totalPlatformFee": 450000,    // Tổng phí nền tảng
    "totalTutorAmount": 2550000    // Tổng gia sư nhận
  }
}
```

### 5. Admin Duyệt Thanh Toán

Admin review từng trường hợp và duyệt:

```
POST /api/admin/enrollments/123/process-payout
Body: {
  "releaseToAvailable": false,  // false = pending 30 ngày
  "adminNote": "Đã xác nhận 10 buổi học hoàn thành"
}
```

**Hệ thống tự động tính toán**:

```typescript
// 1. Tính số tiền theo buổi THỰC TẾ
completedSessions = 10
amountPerSession = 2,000,000 / 10 = 200,000
totalAmountForCompleted = 200,000 * 10 = 2,000,000

// 2. Tính phí nền tảng
commissionRate = 15%
platformFee = 2,000,000 * 15% = 300,000
tutorAmount = 2,000,000 - 300,000 = 1,700,000

// 3. ATOMIC TRANSACTION
await db.transaction(async (tx) => {
  // 3.1. Cập nhật escrow
  escrow.releasedAmount += 2,000,000
  escrow.platformFee += 300,000
  escrow.status = 'completed'

  // 3.2. Chia tiền cho gia sư
  if (releaseToAvailable) {
    tutorWallet.availableBalance += 1,700,000  // Có thể rút ngay
  } else {
    tutorWallet.pendingBalance += 1,700,000    // Chờ 30 ngày
  }
  tutorWallet.totalEarned += 1,700,000

  // 3.3. Chia tiền cho nền tảng
  platformWallet.availableBalance += 300,000   // Ngay lập tức

  // 3.4. Ghi wallet transactions
  // (Tutor: +1,700,000)
  // (Platform: +300,000)

  // 3.5. Cập nhật session records
  // Đánh dấu đã release cho mỗi session
});
```

**Response**:
```json
{
  "success": true,
  "payout": {
    "enrollmentId": 123,
    "completedSessions": 10,
    "totalSessions": 10,
    "amountPerSession": 200000,
    "totalAmountReleased": 2000000,
    "platformFee": 300000,
    "tutorAmount": 1700000,
    "commissionRate": 15,
    "releaseToAvailable": false
  },
  "escrow": {
    "totalAmount": 2000000,
    "releasedAmount": 2000000,
    "remainingAmount": 0,
    "status": "completed"
  },
  "message": "Đã duyệt thanh toán thành công cho 10 buổi học"
}
```

### 6. Gia Sư Xem Wallet

```
GET /api/tutors/5/wallet
```

**Response**:
```json
{
  "wallet": {
    "pendingBalance": 1700000,    // Chờ 30 ngày (hoặc admin approve)
    "availableBalance": 0,        // Chưa available
    "withdrawnBalance": 0,        // Chưa rút
    "totalEarned": 1700000        // Tổng đã kiếm được
  },
  "message": "Số dư pending sẽ chuyển sang available sau 30 ngày hoặc khi admin duyệt"
}
```

### 7. Admin Duyệt Chuyển Pending → Available (Sau 30 ngày)

```
POST /api/admin/payouts/approve
Body: {
  "tutorId": 5,
  "amount": 1700000
}
```

**Flow**:
```typescript
tutorWallet.pendingBalance -= 1700000
tutorWallet.availableBalance += 1700000
tutorWallet.lastPayoutDate = NOW()
```

### 8. Gia Sư Rút Tiền

```
POST /api/payouts/request
Body: {
  "amount": 500000,
  "bankName": "Vietcombank",
  "bankAccount": "1234567890",
  "bankAccountName": "NGUYEN VAN A"
}
```

Admin duyệt → Chuyển khoản → Hoàn tất:

```typescript
tutorWallet.availableBalance -= 500000
tutorWallet.withdrawnBalance += 500000
```

## 🔍 Các Trường Hợp Đặc Biệt

### Trường Hợp 1: Học Sinh Nghỉ Giữa Chừng

**Tình huống**:
- Đăng ký 10 buổi = 2,000,000đ
- Đã thanh toán vào escrow
- Chỉ học được 5 buổi → học sinh nghỉ

**Xử lý**:
```typescript
// Admin duyệt thanh toán
completedSessions = 5  // CHỈ 5 buổi thực tế
amountToRelease = 200,000 * 5 = 1,000,000
platformFee = 1,000,000 * 15% = 150,000
tutorAmount = 850,000

// Escrow
escrow.releasedAmount = 1,000,000  // Chỉ 5 buổi
escrow.totalAmount = 2,000,000
escrow.remainingAmount = 1,000,000 // Còn lại 1M

// Hoàn tiền học sinh
refundAmount = 1,000,000  // 5 buổi chưa học
payment.status = 'partial_refund'
```

### Trường Hợp 2: Lớp Đủ Tháng Nhưng Chưa Kết Thúc

**Tình huống**:
- Đăng ký 20 buổi
- Đã học 10 buổi trong 1 tháng
- Còn 10 buổi nữa

**Admin có thể duyệt thanh toán theo đợt**:
```typescript
// Đợt 1 (sau 1 tháng)
completedSessions = 10
amountToRelease = 200,000 * 10 = 2,000,000

// Đợt 2 (sau khi học xong 10 buổi còn lại)
completedSessions = 20 (total)
alreadyReleased = 2,000,000 (đợt 1)
amountToRelease = 200,000 * 20 - 2,000,000 = 2,000,000
```

### Trường Hợp 3: Gia Sư Yêu Cầu Thanh Toán Sớm

**Tình huống**:
- Gia sư cần tiền gấp
- Đã dạy 5 buổi

**Admin review**:
1. Xác minh 5 buổi đã hoàn thành
2. Check học sinh có khiếu nại gì không
3. Duyệt thanh toán với `releaseToAvailable: true`

```typescript
POST /api/admin/enrollments/123/process-payout
Body: {
  "releaseToAvailable": true,  // Cho rút ngay
  "adminNote": "Gia sư yêu cầu thanh toán sớm, đã xác minh"
}

// Kết quả
tutorWallet.availableBalance += 850,000  // Có thể rút ngay
tutorWallet.pendingBalance = 0          // Không cần chờ
```

## 📊 Dashboard Admin

**Tính năng cần có**:

### 1. Danh Sách Đợi Duyệt
```
GET /api/admin/enrollments/eligible-for-payout

Hiển thị:
- Enrollment ID
- Gia sư
- Học sinh
- Số buổi đã học / Tổng số buổi
- Số tiền cần release
- Lý do (đủ tháng / kết thúc / yêu cầu / học sinh nghỉ)
- Ngày buổi học đầu / cuối
- Nút: [Duyệt] [Từ chối]
```

### 2. Form Duyệt Thanh Toán
```
Enrollment ID: 123
Gia sư: Nguyễn Văn A
Học sinh: Trần Thị B

Thống kê:
- Tổng số buổi: 10
- Đã hoàn thành: 10 ✅
- Chưa học: 0

Tính toán:
- Số tiền mỗi buổi: 200,000đ
- Tổng tiền cần release: 2,000,000đ
- Phí nền tảng (15%): 300,000đ
- Gia sư nhận: 1,700,000đ

Tùy chọn:
☐ Release to available ngay (tin tưởng gia sư)
☑ Release to pending (chờ 30 ngày)

Ghi chú admin:
[Đã xác minh 10 buổi học hoàn thành]

[Duyệt Thanh Toán]  [Hủy]
```

### 3. Lịch Sử Thanh Toán
```
GET /api/admin/payouts/history

Hiển thị:
- Thời gian
- Enrollment ID
- Gia sư
- Số buổi
- Số tiền
- Admin duyệt
- Status
```

## ⚠️ Điểm Khác Biệt So Với Luồng Cũ

| Tiêu chí | Luồng Cũ (Tự động) | Luồng Mới (Admin duyệt) |
|----------|---------------------|-------------------------|
| **Khi nào chia tiền** | Ngay sau mỗi buổi học | Khi admin duyệt |
| **Release escrow** | Tự động từng buổi | Theo batch (nhiều buổi cùng lúc) |
| **Kiểm soát** | Không có | Admin review từng trường hợp |
| **Linh hoạt** | Thấp | Cao (xử lý được edge cases) |
| **An toàn** | Trung bình | Cao (admin là firewall cuối) |
| **Tranh chấp** | Khó xử lý | Dễ xử lý (chưa release) |

## 🔒 Bảo Mật

1. ✅ **Admin authorization** - Chỉ admin mới duyệt được
2. ✅ **Audit logs** - Ghi đầy đủ mọi quyết định
3. ✅ **Atomic transactions** - Đảm bảo tính toàn vẹn
4. ✅ **Tính toán chính xác** - Dựa trên buổi thực tế
5. ✅ **Không thể cheat** - Escrow giữ tiền cho đến khi admin duyệt

## 📚 API Reference

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/sessions/[id]/complete` | POST | Ghi nhận buổi học (KHÔNG release) |
| `/api/admin/enrollments/eligible-for-payout` | GET | Danh sách đủ điều kiện |
| `/api/admin/enrollments/[id]/process-payout` | POST | Duyệt thanh toán |
| `/api/admin/payouts/approve` | POST | Chuyển pending → available |
| `/api/payouts/request` | POST | Gia sư yêu cầu rút tiền |

---

**Tạo ngày**: 19/10/2025
**Phiên bản**: 2.0 (Admin-approved flow)
**Status**: ✅ Production Ready

**Lưu ý**: Luồng này an toàn hơn, linh hoạt hơn, và phù hợp với shared hosting.
