# Hệ Thống Escrow Payment - An Toàn & Bảo Mật

## 🎯 Tổng Quan

Hệ thống giữ tiền an toàn (escrow) cho nền tảng học trực tuyến, đảm bảo:
- ✅ **Học sinh**: Tiền được bảo vệ, chỉ trả khi học xong
- ✅ **Gia sư**: Nhận đúng tiền sau mỗi buổi học
- ✅ **Nền tảng**: Thu phí hoa hồng tự động
- ✅ **Bảo mật**: HMAC-SHA256 verification, audit logs đầy đủ
- ✅ **Shared hosting**: An toàn ngay cả trên môi trường chia sẻ

## 📊 Luồng Nghiệp Vụ Chi Tiết

### 1. Đăng Ký Lớp Học
```
POST /api/enrollments/create
{
  "tutorId": 1,
  "subjectId": 2,
  "gradeLevelId": 10,
  "totalSessions": 10,      // Số buổi học
  "pricePerSession": 200000, // 200k/buổi
  "startDate": "2025-11-01",
  "schedule": "[{\"day\": 2, \"time\": \"18:00-19:30\"}]"
}
```

**Kết quả**:
- Tạo `class_enrollments` (status = 'pending')
- `totalAmount` = 10 * 200,000 = 2,000,000 VNĐ
- Notification cho gia sư

### 2. Thanh Toán

```
POST /api/payment/create
{
  "enrollmentId": 123,
  "gateway": "vnpay" // hoặc "momo"
}
```

**Flow**:
1. Tạo `payments` record (status = 'pending')
2. Generate unique `transactionCode`
3. Tạo payment URL với HMAC signature
4. Redirect học sinh sang VNPay/Momo

**VNPay URL Example**:
```
https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?
  vnp_Amount=200000000&
  vnp_Command=pay&
  vnp_CreateDate=20251019140530&
  vnp_IpAddr=192.168.1.1&
  vnp_OrderInfo=Thanh+toan+lop+hoc+...&
  vnp_TxnRef=ENR123_1729342530&
  vnp_SecureHash=abc123...
```

### 3. Callback Từ Payment Gateway

```
GET /api/payment/vnpay/callback?
  vnp_TxnRef=ENR123_1729342530&
  vnp_Amount=200000000&
  vnp_ResponseCode=00&
  vnp_SecureHash=...
```

**QUAN TRỌNG - Bảo Mật**:
1. ✅ **Verify HMAC signature** (MUST DO)
   ```typescript
   const isValid = verifyVNPayCallback(callbackParams);
   if (!isValid) {
     // CẢNH BÁO: Có thể bị tấn công
     logSecurityAlert();
     return redirect('/payment/failed?error=invalid_signature');
   }
   ```

2. ✅ **Check response code**
   - '00' = Success
   - '24' = User cancelled
   - '51' = Insufficient balance
   - etc.

3. ✅ **Atomic transaction** (tránh duplicate)
   ```typescript
   await db.transaction(async (tx) => {
     // Update payment
     // Create escrow
     // Update enrollment
     // Send notifications
   });
   ```

**Sau callback thành công**:
- `payments.status` = 'holding' (tiền đang giữ)
- `payments.signatureVerified` = 1
- Tạo `escrow_payments`:
  - `totalAmount` = 2,000,000
  - `releasedAmount` = 0
  - `commissionRate` = 15%
  - `status` = 'holding'
- `class_enrollments.status` = 'active'
- Notification cho cả học sinh và gia sư

### 4. Ghi Nhận Buổi Học

Gia sư hoàn thành buổi học:

```
POST /api/sessions/[id]/complete
{
  "tutorNotes": "Học sinh tiến bộ tốt",
  "studentAttended": true
}
```

**Tự động chia tiền** (escrow release):

```typescript
// Tính toán
amountPerSession = 2,000,000 / 10 = 200,000 VNĐ
platformFee = 200,000 * 15% = 30,000 VNĐ
tutorAmount = 200,000 - 30,000 = 170,000 VNĐ

// ATOMIC TRANSACTION
await db.transaction(async (tx) => {
  // 1. Cập nhật escrow
  escrow.releasedAmount += 200,000
  escrow.platformFee += 30,000

  // 2. Cập nhật wallet gia sư
  tutorWallet.pendingBalance += 170,000
  tutorWallet.totalEarned += 170,000

  // 3. Cập nhật wallet nền tảng
  platformWallet.availableBalance += 30,000
  platformWallet.totalEarned += 30,000

  // 4. Ghi wallet_transactions (2 records)
  // 5. Cập nhật session_records.releasedAmount
  // 6. Cập nhật enrollment.completedSessions
});
```

**Kết quả**:
- Gia sư: `pendingBalance` +170k (chờ 30 ngày)
- Nền tảng: `availableBalance` +30k (có thể dùng ngay)
- Session: `status` = 'completed', `releasedAmount` = 200k
- Enrollment: `completedSessions` = 1/10
- Audit log ghi đầy đủ

### 5. Thống Kê

**Học sinh xem**:
```
GET /api/students/[id]/statistics
{
  "totalEnrollments": 3,
  "totalSpent": 5400000,
  "completedSessions": 27,
  "upcomingLessons": 3
}
```

**Gia sư xem**:
```
GET /api/tutors/[id]/wallet
{
  "pendingBalance": 1700000,   // Chờ duyệt
  "availableBalance": 850000,  // Có thể rút ngay
  "withdrawnBalance": 3400000, // Đã rút
  "totalEarned": 5950000,      // Tổng từ trước đến nay
  "lastPayoutDate": "2025-10-15"
}
```

**Admin xem**:
```
GET /api/admin/statistics
{
  "totalRevenue": 50000000,
  "platformFee": 7500000,     // 15% commission
  "activeEnrollments": 45,
  "pendingPayouts": 15,
  "totalSessions": 320
}
```

### 6. Admin Duyệt Thanh Toán

**Sau 30 ngày** (hoặc khi enrollment hoàn thành):

```
POST /api/admin/payouts/approve
{
  "tutorId": 5,
  "amount": 1700000
}
```

**Flow**:
```typescript
// Chuyển từ pending → available
tutorWallet.pendingBalance -= 1700000
tutorWallet.availableBalance += 1700000

// Ghi wallet_transaction
type: 'payout'
description: 'Chuyển từ pending sang available'

// Audit log
action: 'payout_approved'
performedBy: adminId
```

### 7. Rút Tiền

Gia sư tạo yêu cầu rút:

```
POST /api/payouts/request
{
  "amount": 500000,
  "bankName": "Vietcombank",
  "bankAccount": "1234567890",
  "bankAccountName": "NGUYEN VAN A"
}
```

**Admin duyệt**:
```
POST /api/admin/payouts/[id]/complete
{
  "transactionProof": "https://cdn.../chung-tu.jpg"
}
```

**Kết quả**:
```typescript
tutorWallet.availableBalance -= 500000
tutorWallet.withdrawnBalance += 500000

payoutRequest.status = 'completed'
payoutRequest.completedAt = NOW()
```

### 8. Hoàn Tiền

Khi lớp bị hủy:

```
POST /api/enrollments/[id]/refund
{
  "reason": "Gia sư không phù hợp"
}
```

**Tính toán hoàn tiền**:
```typescript
totalAmount = 2,000,000       // Tổng đã đóng
releasedAmount = 400,000      // Đã học 2 buổi
refundAmount = 1,600,000      // Hoàn lại phần chưa học

// Update DB
escrow.status = 'refunded'
payment.status = 'refunded'
enrollment.status = 'cancelled'

// Hoàn tiền qua gateway (nếu cần)
// Hoặc giữ lại credit để học với gia sư khác
```

## 🔒 Bảo Mật Chi Tiết

### 1. HMAC Signature Verification

**VNPay (HMAC-SHA512)**:
```typescript
// Tạo signature khi gọi API
const signData = `amount=${amount}&orderId=${orderId}&...`;
const signature = crypto
  .createHmac('sha512', SECRET_KEY)
  .update(signData)
  .digest('hex');

// Verify callback
const receivedSignature = params['vnp_SecureHash'];
const calculatedSignature = crypto
  .createHmac('sha512', SECRET_KEY)
  .update(signDataFromCallback)
  .digest('hex');

if (receivedSignature !== calculatedSignature) {
  throw new Error('Invalid signature - Possible attack!');
}
```

**Momo (HMAC-SHA256)**:
```typescript
const rawSignature =
  `accessKey=${accessKey}&amount=${amount}&orderId=${orderId}&...`;
const signature = crypto
  .createHmac('sha256', SECRET_KEY)
  .update(rawSignature)
  .digest('hex');
```

### 2. Audit Logs

**Ghi log mọi hành động quan trọng**:
```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT,           -- NULL = system
  action VARCHAR(50),    -- payment_created, escrow_released, etc.
  entity_type VARCHAR(50),
  entity_id INT,
  changes TEXT,          -- JSON chi tiết
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP
);
```

**Ví dụ**:
```json
{
  "userId": 123,
  "action": "escrow_released",
  "entityType": "session",
  "entityId": 456,
  "changes": {
    "sessionNumber": 5,
    "tutorAmount": 170000,
    "platformFee": 30000
  },
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "createdAt": "2025-10-19T14:30:00Z"
}
```

### 3. SQL Injection Prevention

✅ **ĐÚNG** (sử dụng Drizzle ORM):
```typescript
await db.select()
  .from(payments)
  .where(eq(payments.id, paymentId));
```

❌ **SAI** (raw SQL):
```typescript
await db.execute(`SELECT * FROM payments WHERE id = ${paymentId}`);
```

### 4. XSS Prevention

✅ **ĐÚNG** (encode output):
```typescript
const message = escapeHtml(userInput);
await createNotification({ message });
```

### 5. Environment Variables

**KHÔNG BAO GIỜ commit vào Git**:
```bash
# .env (gitignored)
VNPAY_TMN_CODE=YOUR_TMN_CODE
VNPAY_HASH_SECRET=YOUR_SECRET_KEY
MOMO_PARTNER_CODE=YOUR_PARTNER_CODE
MOMO_SECRET_KEY=YOUR_SECRET_KEY
COMMISSION_RATE=15
DATABASE_URL=mysql://...
CRON_SECRET=random_string_for_cron_auth
```

### 6. Rate Limiting

```typescript
// middleware.ts
import { rateLimit } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';

  const { success } = await rateLimit(ip, {
    limit: 10,        // 10 requests
    window: 60000,    // per minute
  });

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }
}
```

### 7. CSRF Protection

Next.js tự động bảo vệ với:
- SameSite cookies
- Origin checking
- CORS headers

## 💾 Database Schema

### class_enrollments (đăng ký lớp)
```sql
id, student_id, tutor_id, subject_id, grade_level_id,
total_sessions, completed_sessions, price_per_session,
total_amount, status, start_date, end_date, schedule, notes
```

### payments (thanh toán)
```sql
id, enrollment_id, student_id, amount, method, gateway,
status, transaction_code, gateway_transaction_id,
gateway_response, signature, signature_verified,
ip_address, paid_at, created_at
```

### escrow_payments (giữ tiền)
```sql
id, payment_id, enrollment_id, total_amount, released_amount,
platform_fee, commission_rate, status, last_release_date,
completed_at
```

### session_records (buổi học)
```sql
id, enrollment_id, lesson_id, session_number, date, start_time,
end_time, status, tutor_attended, student_attended,
tutor_notes, completed_at, released_amount
```

### wallets (ví tiền)
```sql
id, owner_id, owner_type, available_balance, pending_balance,
withdrawn_balance, total_earned, last_payout_date
```

### wallet_transactions (lịch sử ví)
```sql
id, wallet_id, type, amount, balance_before, balance_after,
related_id, related_type, description, performed_by, created_at
```

### payout_requests (yêu cầu rút tiền)
```sql
id, tutor_id, wallet_id, amount, bank_name, bank_account,
bank_account_name, status, request_note, admin_note,
reviewed_by, reviewed_at, completed_at, transaction_proof
```

### audit_logs (nhật ký hệ thống)
```sql
id, user_id, action, entity_type, entity_id, changes,
ip_address, user_agent, created_at
```

## ⚡ Tối Ưu Hiệu Suất

### 1. Batch Queries (Tránh N+1)

❌ **SAI**:
```typescript
const sessions = await getSessions();
for (const session of sessions) {
  const student = await getStudentById(session.studentId);
  const tutor = await getTutorById(session.tutorId);
}
// 1 + 2N queries!
```

✅ **ĐÚNG**:
```typescript
const sessions = await getSessions();
const studentIds = [...new Set(sessions.map(s => s.studentId))];
const tutorIds = [...new Set(sessions.map(s => s.tutorId))];

const [students, tutors] = await Promise.all([
  getStudentsByIds(studentIds),    // 1 query
  getTutorsByIds(tutorIds),        // 1 query
]);

// Total: 3 queries instead of 21!
```

### 2. Caching

**Redis (Production)**:
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function getSubjects() {
  const cached = await redis.get('subjects:all');
  if (cached) return JSON.parse(cached);

  const subjects = await db.select().from(subjects);
  await redis.setex('subjects:all', 3600, JSON.stringify(subjects));

  return subjects;
}
```

**In-memory (Development)**:
```typescript
const cache = new Map();

export async function withCache(key, ttl, fetchFn) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  const data = await fetchFn();
  cache.set(key, { data, timestamp: Date.now() });

  return data;
}
```

### 3. Database Indexing

```sql
-- Indexes cho performance
CREATE INDEX idx_payments_enrollment ON payments(enrollment_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_transaction_code ON payments(transaction_code);
CREATE INDEX idx_sessions_enrollment ON session_records(enrollment_id);
CREATE INDEX idx_wallets_owner ON wallets(owner_id, owner_type);
CREATE INDEX idx_wallet_txns_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
```

### 4. Connection Pooling

```typescript
// drizzle config
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 15,      // Đủ cho shared hosting
  waitForConnections: true,
  queueLimit: 0,
  maxIdle: 5,
  idleTimeout: 60000,
  enableKeepAlive: true,
});
```

## 🚀 Deployment Checklist

### Environment Variables
- [ ] `VNPAY_TMN_CODE`
- [ ] `VNPAY_HASH_SECRET`
- [ ] `MOMO_PARTNER_CODE`
- [ ] `MOMO_SECRET_KEY`
- [ ] `COMMISSION_RATE` (default: 15)
- [ ] `DATABASE_URL`
- [ ] `NEXTAUTH_SECRET`
- [ ] `CRON_SECRET`

### Database
- [ ] Run migrations
- [ ] Create indexes
- [ ] Set up backup (daily)
- [ ] Configure read replica (optional)

### Payment Gateways
- [ ] Register VNPay merchant account
- [ ] Register Momo business account
- [ ] Configure callback URLs
- [ ] Test sandbox first
- [ ] Switch to production

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Set up uptime monitoring
- [ ] Create alerts for failed payments
- [ ] Monitor escrow balance daily

### Security
- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Regular security audits
- [ ] Backup audit logs

## 📚 API Documentation

Xem chi tiết tại: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## 🧪 Testing

```bash
# Test payment creation
curl -X POST http://localhost:3000/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{"enrollmentId": 1, "gateway": "vnpay"}'

# Test session completion
curl -X POST http://localhost:3000/api/sessions/1/complete \
  -H "Content-Type: application/json" \
  -d '{"tutorNotes": "Good session", "studentAttended": true}'
```

## 📞 Support

Nếu có vấn đề:
1. Check audit logs
2. Check database transaction history
3. Verify signature in callback
4. Contact admin for manual intervention

---

**Generated with Claude Code** 🤖
**Date**: 2025-10-19
**Version**: 1.0.0
