# 📹 Video Call System - Hướng dẫn sử dụng

## Tổng quan

Hệ thống Video Call sử dụng **Jitsi Meet** để cung cấp tính năng học trực tuyến với đầy đủ tính năng:
- ✅ Tạo link tự động và random, không trùng lặp
- ✅ Bảo mật JWT authentication
- ✅ Kiểm tra thanh toán trước khi vào lớp
- ✅ Tracking join/leave time cho tutor và student
- ✅ Auto-expiry links
- ✅ Chỉ truy cập qua hệ thống (không copy link)

---

## 🎯 Các tính năng chính

### 1. **Tự động tạo Video Call Session**
- Khi lesson được confirmed → tự động tạo video call session
- Khi enrollment được active → tự động tạo video call cho mỗi session_record
- Mỗi session có unique room name và access token

### 2. **Bảo mật đa lớp**
- **JWT Authentication**: Jitsi sử dụng JWT để xác thực người dùng
- **Access Token**: Mỗi session có unique access token (SHA-256 hash)
- **IP Tracking**: Ghi nhận IP addresses của người truy cập
- **Payment Check**: Student phải thanh toán trước khi vào lớp
- **Time Window**: Chỉ cho phép vào 15 phút trước giờ học đến hết giờ học
- **One-time Join**: Mỗi user chỉ được join một lần (không copy link cho người khác)

### 3. **Tracking & Monitoring**
Hệ thống ghi nhận:
- `tutorJoinedAt`: Thời điểm gia sư vào lớp
- `studentJoinedAt`: Thời điểm học sinh vào lớp
- `tutorLeftAt`: Thời điểm gia sư rời lớp
- `studentLeftAt`: Thời điểm học sinh rời lớp
- `sessionEndedAt`: Thời điểm kết thúc buổi học (khi cả 2 đã rời)
- `ipAddresses`: JSON array chứa các IP đã truy cập

### 4. **Auto-expiry**
- Sessions tự động expire sau `scheduledEndTime + 1 hour`
- Expired sessions không thể join được nữa
- Cron job tự động cleanup expired sessions

---

## 🔧 Cấu hình

### Environment Variables

Thêm vào file `.env`:

```bash
# Jitsi Meet Configuration
JITSI_DOMAIN=meet.jit.si
NEXT_PUBLIC_JITSI_DOMAIN=meet.jit.si
JITSI_APP_ID=lophoc-online
JITSI_APP_SECRET=your-random-secret-key-here

# Cron Secret (for scheduled tasks)
CRON_SECRET=your-cron-secret-key
```

**Lưu ý**:
- `JITSI_DOMAIN`: Domain của Jitsi server (mặc định: `meet.jit.si` - free public server)
- `JITSI_APP_SECRET`: Secret key để generate JWT (dùng `openssl rand -hex 32` để tạo)
- Để production, nên self-host Jitsi hoặc dùng paid service (8x8, JaaS)

---

## 📊 Database Schema

### Table: `video_call_sessions`

```sql
CREATE TABLE video_call_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  enrollment_id INT,              -- FK to class_enrollments
  lesson_id INT,                  -- FK to lessons
  session_record_id INT,          -- FK to session_records
  tutor_id INT NOT NULL,          -- FK to users
  student_id INT NOT NULL,        -- FK to users
  room_name VARCHAR(100) UNIQUE,  -- Unique Jitsi room name
  access_token VARCHAR(500) UNIQUE, -- Unique access token
  tutor_token VARCHAR(500),       -- JWT for tutor (moderator)
  student_token VARCHAR(500),     -- JWT for student (participant)
  scheduled_start_time TIMESTAMP, -- When class starts
  scheduled_end_time TIMESTAMP,   -- When class ends
  tutor_joined_at TIMESTAMP,      -- When tutor joined
  student_joined_at TIMESTAMP,    -- When student joined
  tutor_left_at TIMESTAMP,        -- When tutor left
  student_left_at TIMESTAMP,      -- When student left
  session_ended_at TIMESTAMP,     -- When session ended
  status VARCHAR(20) DEFAULT 'pending', -- pending, active, completed, expired, cancelled
  payment_status VARCHAR(20) DEFAULT 'unpaid', -- unpaid, paid, partially_paid
  can_student_join INT DEFAULT 1, -- 1=can join, 0=blocked
  can_tutor_join INT DEFAULT 1,   -- 1=can join, 0=blocked
  expires_at TIMESTAMP NOT NULL,  -- Token expiration
  used_count INT DEFAULT 0,       -- Number of joins
  ip_addresses TEXT,              -- JSON array of IPs
  recording_url VARCHAR(500),     -- Recording URL (optional)
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 🔀 API Endpoints

### 1. **Create Video Call Session**
```
POST /api/video-call/create
```

**Request Body:**
```json
{
  "lessonId": 123          // For individual lessons
  // OR
  "enrollmentId": 456,     // For enrollment
  "sessionRecordId": 789   // Optional: specific session
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": 1,
  "roomName": "lophoc_abc123_xyz789",
  "accessToken": "sha256hash...",
  "scheduledStartTime": "2025-10-20T14:00:00Z",
  "scheduledEndTime": "2025-10-20T16:00:00Z",
  "expiresAt": "2025-10-20T17:00:00Z",
  "paymentStatus": "paid",
  "canStudentJoin": true
}
```

**Security Checks:**
- ✅ User must be authenticated
- ✅ User must be tutor or student of the lesson/enrollment
- ✅ Payment must be completed (for students)
- ✅ Cannot create duplicate sessions

---

### 2. **Join Video Call**
```
POST /api/video-call/join
```

**Request Body:**
```json
{
  "accessToken": "sha256hash..."
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": 1,
  "jitsiUrl": "https://meet.jit.si/room_name?jwt=...",
  "roomName": "lophoc_abc123_xyz789",
  "role": "student",
  "moderator": false,
  "joinedAt": "2025-10-20T14:05:00Z",
  "scheduledEndTime": "2025-10-20T16:00:00Z"
}
```

**Security Checks:**
- ✅ User must be authenticated
- ✅ Access token must be valid
- ✅ User must be tutor or student of this session
- ✅ Session must not be expired
- ✅ Student must have paid (canStudentJoin = 1)
- ✅ Current time must be within join window (15 min before start → end time)
- ✅ Track IP address

**Error Codes:**
- `401`: Unauthorized (not logged in)
- `402`: Payment Required (student hasn't paid)
- `403`: Access Denied (not authorized, wrong user, etc)
- `404`: Session Not Found (invalid access token)
- `410`: Session Expired or Ended
- `425`: Too Early (can't join yet)

---

### 3. **Leave Video Call**
```
POST /api/video-call/leave
```

**Request Body:**
```json
{
  "sessionId": 1
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": 1,
  "leftAt": "2025-10-20T15:55:00Z",
  "role": "student",
  "durationMinutes": 55,
  "sessionCompleted": true,
  "sessionEndedAt": "2025-10-20T15:55:00Z"
}
```

**Actions:**
- Records leave time (`tutorLeftAt` or `studentLeftAt`)
- If both have left → mark session as `completed`
- Update `session_records` with attendance
- Update `lessons` status if applicable

---

### 4. **Get Upcoming Sessions**
```
GET /api/video-call/upcoming?role=student&status=pending&limit=20
```

**Response:**
```json
{
  "success": true,
  "total": 5,
  "sessions": [...],
  "categories": {
    "active": 1,
    "upcoming": 3,
    "joinableSoon": 1
  },
  "activeSessions": [...],
  "upcomingSessions": [...],
  "joinableSoon": [...]
}
```

---

## 🤖 Automated Tasks (Cron Jobs)

### 1. **Auto-create Video Calls**
```
GET /api/cron/create-video-calls
Authorization: Bearer {CRON_SECRET}
```

**Frequency**: Every hour

**Actions**:
- Finds all confirmed lessons without video call sessions
- Finds all scheduled session_records without video calls
- Automatically creates video call sessions

**Vercel Cron Config** (`vercel.json`):
```json
{
  "crons": [{
    "path": "/api/cron/create-video-calls",
    "schedule": "0 * * * *"
  }]
}
```

---

### 2. **Cleanup Expired Sessions**
```
GET /api/cron/cleanup-expired-sessions
Authorization: Bearer {CRON_SECRET}
```

**Frequency**: Every 6 hours

**Actions**:
- Marks expired sessions (`expiresAt < now`)
- Marks sessions as completed if both participants left
- Optional: Archive old sessions (30+ days)

**Vercel Cron Config**:
```json
{
  "crons": [{
    "path": "/api/cron/cleanup-expired-sessions",
    "schedule": "0 */6 * * *"
  }]
}
```

---

## 🎨 UI Components

### 1. **UpcomingVideoCallsCard**
```tsx
import { UpcomingVideoCallsCard } from '@/components/UpcomingVideoCallCard';

// In dashboard:
<UpcomingVideoCallsCard />
```

**Features**:
- Shows active, joinable soon, and upcoming sessions
- Join button với validation
- Payment warning nếu chưa thanh toán
- Real-time countdown
- Auto-refresh

---

### 2. **JitsiMeeting Component**
```tsx
import { JitsiMeeting } from '@/components/JitsiMeeting';

<JitsiMeeting
  roomName="lophoc_abc123"
  jwt="eyJhbGciOiJIUzI1NiIs..."
  userName="John Doe"
  moderator={false}
  onJoin={() => console.log('Joined')}
  onLeave={() => console.log('Left')}
  onError={(err) => console.error(err)}
/>
```

**Features**:
- Full Jitsi integration
- Moderator controls (recording, screen share, etc)
- Participant controls (mic, camera, chat)
- Custom branding (LopHoc.Online)
- Mobile responsive

---

### 3. **Video Call Room Page**
```
/video-call/[accessToken]
```

Trang này:
- Validates access token
- Checks payment status
- Loads Jitsi meeting
- Tracks join/leave events
- Shows session info

---

## 🔒 Security Best Practices

### 1. **Token Security**
- ❌ **KHÔNG** hard-code JWT secret
- ✅ Dùng environment variables
- ✅ Rotate secrets định kỳ
- ✅ Use strong random secrets (64+ characters)

### 2. **Payment Verification**
```typescript
// ALWAYS check payment before allowing student to join
if (isStudent && session.paymentStatus !== 'paid') {
  return error('Payment required');
}
```

### 3. **Time Window Validation**
```typescript
// Only allow join 15 min before → end time
const joinWindowStart = scheduledStart - 15 minutes;
const joinWindowEnd = scheduledEnd;
if (now < joinWindowStart || now > joinWindowEnd) {
  return error('Cannot join at this time');
}
```

### 4. **IP Tracking**
```typescript
// Track all IPs that access the session
const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
session.ipAddresses.push(clientIp);
```

---

## 📈 Performance Optimization

### 1. **Database Indexing**
```sql
-- Already created by Drizzle schema
CREATE INDEX idx_access_token ON video_call_sessions(access_token);
CREATE INDEX idx_room_name ON video_call_sessions(room_name);
CREATE INDEX idx_status ON video_call_sessions(status);
CREATE INDEX idx_scheduled_start ON video_call_sessions(scheduled_start_time);
```

### 2. **Query Optimization**
- Use `limit()` on all queries
- Select only needed columns
- Use joins instead of N+1 queries
- Cache upcoming sessions client-side (React Query)

### 3. **Caching Strategy**
```typescript
// Client-side caching với React Query
const { data } = useQuery({
  queryKey: ['upcoming-sessions'],
  queryFn: fetchUpcomingSessions,
  staleTime: 60 * 1000, // 1 minute
  refetchInterval: 120 * 1000, // Auto-refresh every 2 minutes
});
```

---

## 🧪 Testing Guide

### 1. **Test Flow: Create → Join → Leave**

**Step 1: Create Session**
```bash
curl -X POST http://localhost:3000/api/video-call/create \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{"lessonId": 1}'
```

**Step 2: Join Session**
```bash
curl -X POST http://localhost:3000/api/video-call/join \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{"accessToken": "sha256hash..."}'
```

**Step 3: Leave Session**
```bash
curl -X POST http://localhost:3000/api/video-call/leave \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{"sessionId": 1}'
```

### 2. **Test Payment Blocking**
1. Tạo session với unpaid enrollment
2. Student try to join → should get 402 error
3. Update payment status to 'paid'
4. Student can now join

### 3. **Test Time Window**
1. Create session scheduled for tomorrow
2. Try to join now → should get 425 error (too early)
3. Wait until 15 min before start time
4. Can join now

### 4. **Test Duplicate Prevention**
1. Student joins session → gets link
2. Student copies link và send to friend
3. Friend tries to access → should fail (not authorized)

---

## 🚀 Deployment

### 1. **Vercel Deployment**

**vercel.json**:
```json
{
  "crons": [
    {
      "path": "/api/cron/create-video-calls",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/cleanup-expired-sessions",
      "schedule": "0 */6 * * *"
    }
  ],
  "env": {
    "JITSI_DOMAIN": "meet.jit.si",
    "JITSI_APP_ID": "lophoc-online",
    "JITSI_APP_SECRET": "@jitsi-secret",
    "CRON_SECRET": "@cron-secret"
  }
}
```

### 2. **Environment Secrets**
```bash
# Add to Vercel
vercel secrets add jitsi-secret "your-random-64-char-secret"
vercel secrets add cron-secret "your-random-32-char-secret"
```

### 3. **Self-hosting Jitsi (Recommended for Production)**

Benefits:
- Full control
- Custom branding
- No rate limits
- Better performance
- Recording storage

[Guide: How to self-host Jitsi Meet](https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-quickstart)

---

## 📝 Troubleshooting

### Issue: "Failed to load Jitsi script"
**Solution**: Check internet connection, Jitsi domain is accessible

### Issue: "Invalid JWT token"
**Solution**: Check `JITSI_APP_SECRET` matches between your app and Jitsi server

### Issue: "Payment required" error
**Solution**: Check payment status in `video_call_sessions.paymentStatus`

### Issue: Sessions not auto-created
**Solution**:
- Check cron job is running
- Verify `CRON_SECRET` is correct
- Check logs for errors

### Issue: Cannot join session
**Solution**:
- Check time window (15 min before start)
- Verify payment status
- Check session hasn't expired
- Ensure user is tutor or student

---

## 📞 Support

Nếu cần hỗ trợ:
1. Check logs trong browser console (F12)
2. Check server logs (terminal)
3. Review API responses (Network tab)
4. Verify database records (`video_call_sessions` table)

---

**Version**: 1.0.0
**Last Updated**: 2025-10-20
**Author**: Claude AI Assistant
