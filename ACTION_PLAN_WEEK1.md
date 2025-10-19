# Action Plan - Week 1: Lesson Confirmation Flow

## 🎯 Mục Tiêu
Xây dựng workflow hoàn chỉnh để gia sư có thể confirm/reject booking requests từ học sinh.

---

## 📋 Checklist

### Day 1-2: API Endpoints

#### ✅ Task 1.1: Update Lesson Schema
```typescript
// Already have these fields:
- tutorConfirmed: int (0/1)
- studentConfirmed: int (0/1)
- cancelledBy: int (userId)
- cancellationReason: text

// Need to verify they work properly
```

#### ✅ Task 1.2: Create Confirmation API
**File:** `src/app/api/lessons/[id]/confirm/route.ts`

```typescript
// PATCH /api/lessons/:id/confirm
// Tutor confirms a booking request

Request Body:
{
  "meetingLink": "https://zoom.us/j/123456789", // Optional
  "notes": "Looking forward to the lesson!" // Optional
}

Response:
{
  "lesson": {...},
  "message": "Đã xác nhận buổi học"
}

Business Logic:
1. Verify user is the tutor
2. Check lesson status is 'pending'
3. Update tutorConfirmed = 1
4. Update status = 'confirmed'
5. Create notification for student
6. Send email to student
7. Lock the time slot
```

**Code:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lessonId = parseInt(params.id);
    const lesson = await storage.getLessonById(lessonId);

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Verify user is the tutor
    const tutor = await storage.getTutorById(parseInt(lesson.tutorId));
    if (!tutor || tutor.userId !== session.user.id) {
      return NextResponse.json({ error: 'Only tutor can confirm' }, { status: 403 });
    }

    // Check lesson can be confirmed
    if (lesson.status !== 'pending') {
      return NextResponse.json({ error: 'Lesson already confirmed or cancelled' }, { status: 400 });
    }

    const body = await request.json();
    const { meetingLink, notes } = body;

    // Update lesson
    const updatedLesson = await storage.updateLesson(lessonId, {
      tutorConfirmed: 1,
      status: 'confirmed',
      meetingLink: meetingLink || null,
      notes: notes || lesson.notes
    });

    // Create notification for student
    await storage.createNotification({
      userId: parseInt(lesson.studentId),
      type: 'confirmation',
      title: 'Gia sư đã xác nhận buổi học',
      message: `${tutor.fullName} đã xác nhận buổi học ${lesson.subject} vào ${lesson.date} lúc ${lesson.startTime}`,
      link: `/dashboard?tab=upcoming`,
      isRead: 0
    });

    // TODO: Send email notification

    return NextResponse.json({
      lesson: updatedLesson,
      message: 'Đã xác nhận buổi học thành công'
    }, { status: 200 });

  } catch (error) {
    console.error('Error confirming lesson:', error);
    return NextResponse.json({ error: 'Failed to confirm lesson' }, { status: 500 });
  }
}
```

---

#### ✅ Task 1.3: Create Rejection API
**File:** `src/app/api/lessons/[id]/reject/route.ts`

```typescript
// PATCH /api/lessons/:id/reject
// Tutor rejects a booking request

Request Body:
{
  "reason": "Trùng lịch dạy khác" // Required
}

Response:
{
  "lesson": {...},
  "refund": {...},
  "message": "Đã từ chối buổi học"
}

Business Logic:
1. Verify user is the tutor
2. Check lesson status is 'pending'
3. Update status = 'cancelled'
4. Update cancelledBy = tutorId
5. Update cancellationReason = reason
6. Process refund (if payment made)
7. Update transaction status
8. Create notification for student
9. Send email to student
10. Release time slot
```

**Code:**
```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lessonId = parseInt(params.id);
    const lesson = await storage.getLessonById(lessonId);

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Verify user is the tutor
    const tutor = await storage.getTutorById(parseInt(lesson.tutorId));
    if (!tutor || tutor.userId !== session.user.id) {
      return NextResponse.json({ error: 'Only tutor can reject' }, { status: 403 });
    }

    // Check lesson can be rejected
    if (lesson.status !== 'pending') {
      return NextResponse.json({ error: 'Lesson already confirmed or cancelled' }, { status: 400 });
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 });
    }

    // Update lesson
    const updatedLesson = await storage.updateLesson(lessonId, {
      status: 'cancelled',
      cancelledBy: session.user.id,
      cancellationReason: reason
    });

    // Process refund if payment was made
    const transaction = await storage.getTransactionByLesson(lessonId);
    if (transaction && transaction.status === 'completed') {
      await storage.updateTransaction(transaction.id, {
        status: 'refunded'
      });
    }

    // Create notification for student
    await storage.createNotification({
      userId: parseInt(lesson.studentId),
      type: 'cancellation',
      title: 'Gia sư đã từ chối buổi học',
      message: `${tutor.fullName} không thể dạy buổi học ${lesson.subject} vào ${lesson.date}. Lý do: ${reason}`,
      link: `/dashboard?tab=cancelled`,
      isRead: 0
    });

    // TODO: Send email notification
    // TODO: Process actual refund via payment gateway

    return NextResponse.json({
      lesson: updatedLesson,
      transaction: transaction,
      message: 'Đã từ chối buổi học. Học sinh sẽ được hoàn tiền.'
    }, { status: 200 });

  } catch (error) {
    console.error('Error rejecting lesson:', error);
    return NextResponse.json({ error: 'Failed to reject lesson' }, { status: 500 });
  }
}
```

---

#### ✅ Task 1.4: Mark Lesson Complete API
**File:** `src/app/api/lessons/[id]/complete/route.ts`

```typescript
// PATCH /api/lessons/:id/complete
// Mark lesson as completed (can be done by tutor or student)

Request Body:
{
  "rating": 5, // Optional (if student)
  "feedback": "Great lesson!" // Optional
}

Business Logic:
1. Verify user is tutor or student
2. Check lesson status is 'confirmed'
3. Check lesson time has passed
4. Update status = 'completed'
5. Update completedAt = now
6. Release payment to tutor (escrow system)
7. Create notification
8. Request review from student
```

---

### Day 3-4: Tutor Dashboard UI

#### ✅ Task 2.1: Update Tutor Dashboard Page
**File:** `src/app/tutor/dashboard/page.tsx`

**Features to add:**
```typescript
Tabs:
1. ✅ Pending Requests (NEW)
   - Show lessons where tutorConfirmed = 0
   - Action buttons: Accept / Reject
   - Display student info, subject, time
   - Sort by date (oldest first)

2. ✅ Upcoming Lessons
   - Show confirmed lessons (future)
   - Meeting link
   - Student contact info

3. ✅ Completed Lessons
   - Past lessons
   - Earnings summary

4. ✅ Cancelled
   - Cancelled lessons history

Components:
- PendingRequestCard
- ConfirmationDialog (with reason input for reject)
- MeetingLinkInput (for confirm)
```

**Example UI:**
```typescript
<Card>
  <CardHeader>
    <CardTitle>Yêu Cầu Đặt Lịch Mới</CardTitle>
    <CardDescription>
      {pendingCount} yêu cầu đang chờ xác nhận
    </CardDescription>
  </CardHeader>
  <CardContent>
    {pendingLessons.map(lesson => (
      <PendingRequestCard
        key={lesson.id}
        lesson={lesson}
        onConfirm={handleConfirm}
        onReject={handleReject}
      />
    ))}
  </CardContent>
</Card>
```

---

#### ✅ Task 2.2: Create PendingRequestCard Component
**File:** `src/components/PendingRequestCard.tsx`

```typescript
interface Props {
  lesson: EnrichedLesson;
  onConfirm: (lessonId: number, meetingLink?: string) => void;
  onReject: (lessonId: number, reason: string) => void;
}

Features:
- Student avatar & name
- Subject & grade level
- Date & time
- Lesson duration
- Payment amount
- Accept button (opens meeting link dialog)
- Reject button (opens reason dialog)
- Countdown timer (auto-reject in 24h)
```

---

#### ✅ Task 2.3: Create API Hooks
**File:** `src/hooks/use-lessons.ts`

```typescript
// Hook to fetch tutor's lessons
export function useTutorLessons(tutorId: number, status?: string) {
  return useQuery({
    queryKey: ['tutor-lessons', tutorId, status],
    queryFn: async () => {
      const url = `/api/tutors/${tutorId}/lessons${status ? `?status=${status}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch lessons');
      return res.json();
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to confirm lesson
export function useConfirmLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lessonId, meetingLink }: { lessonId: number; meetingLink?: string }) => {
      const res = await fetch(`/api/lessons/${lessonId}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingLink })
      });
      if (!res.ok) throw new Error('Failed to confirm');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutor-lessons'] });
    }
  });
}

// Hook to reject lesson
export function useRejectLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lessonId, reason }: { lessonId: number; reason: string }) => {
      const res = await fetch(`/api/lessons/${lessonId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (!res.ok) throw new Error('Failed to reject');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutor-lessons'] });
    }
  });
}
```

---

### Day 5: Student Dashboard Updates

#### ✅ Task 3.1: Update Student Dashboard
**File:** `src/app/dashboard/page.tsx`

**Add booking status indicators:**
```typescript
Status Badges:
- Pending: "Chờ gia sư xác nhận" (yellow)
- Confirmed: "Đã xác nhận" (green)
- Cancelled: "Đã hủy" (red)
- Completed: "Đã hoàn thành" (blue)

Show countdown: "Gia sư sẽ tự động từ chối sau 18 giờ nếu không phản hồi"
```

---

### Day 6-7: Auto-Reject Logic & Testing

#### ✅ Task 4.1: Create Cron Job for Auto-Reject
**File:** `src/lib/cron/auto-reject-lessons.ts`

```typescript
/**
 * Runs every hour to check and auto-reject pending lessons > 24h
 */
export async function autoRejectExpiredLessons() {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Find pending lessons older than 24h
  const expiredLessons = await db
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.status, 'pending'),
        eq(lessons.tutorConfirmed, 0),
        sql`${lessons.createdAt} < ${twentyFourHoursAgo}`
      )
    );

  for (const lesson of expiredLessons) {
    // Auto-reject
    await storage.updateLesson(lesson.id, {
      status: 'cancelled',
      cancelledBy: -1, // System auto-reject
      cancellationReason: 'Gia sư không phản hồi trong 24 giờ'
    });

    // Refund
    const transaction = await storage.getTransactionByLesson(lesson.id);
    if (transaction && transaction.status === 'completed') {
      await storage.updateTransaction(transaction.id, {
        status: 'refunded'
      });
    }

    // Notify student
    await storage.createNotification({
      userId: parseInt(lesson.studentId),
      type: 'cancellation',
      title: 'Buổi học đã bị hủy tự động',
      message: `Gia sư không phản hồi trong 24h. Bạn đã được hoàn tiền.`,
      link: `/dashboard?tab=cancelled`,
      isRead: 0
    });

    // TODO: Penalize tutor (reduce response rate)
  }

  console.log(`Auto-rejected ${expiredLessons.length} expired lessons`);
}
```

**Setup cron (Vercel Cron or node-cron):**
```typescript
// In production: Use Vercel Cron
// api/cron/auto-reject/route.ts
export async function GET() {
  await autoRejectExpiredLessons();
  return NextResponse.json({ success: true });
}

// Configure in vercel.json:
{
  "crons": [{
    "path": "/api/cron/auto-reject",
    "schedule": "0 * * * *" // Every hour
  }]
}
```

---

#### ✅ Task 4.2: End-to-End Testing

**Test Scenarios:**

1. **Happy Path - Tutor Accepts**
   ```
   1. Student books lesson
   2. Tutor receives notification
   3. Tutor goes to dashboard
   4. Tutor clicks Accept
   5. Enters meeting link
   6. Confirms
   7. Student receives confirmation notification
   8. Lesson status = 'confirmed'
   9. Meeting link visible to both
   ```

2. **Tutor Rejects**
   ```
   1. Student books lesson with payment
   2. Tutor rejects with reason
   3. Student receives notification
   4. Transaction status = 'refunded'
   5. Student sees cancellation reason
   ```

3. **Auto-Reject After 24h**
   ```
   1. Student books lesson
   2. Tutor doesn't respond
   3. Wait 24+ hours
   4. Cron job runs
   5. Lesson auto-cancelled
   6. Student refunded
   7. Student notified
   ```

4. **Mark as Complete**
   ```
   1. Confirmed lesson
   2. Time passes (lesson happens)
   3. Tutor/Student marks complete
   4. Payment released to tutor
   5. Student prompted to review
   ```

---

### Day 8: Polish & Documentation

#### ✅ Task 5.1: Add Loading & Error States
```typescript
- Loading skeletons for lesson cards
- Error messages with retry buttons
- Success toasts for actions
- Optimistic updates (instant UI feedback)
```

#### ✅ Task 5.2: Mobile Responsiveness
```typescript
- Test on mobile devices
- Touch-friendly buttons
- Responsive layouts
- Mobile notifications
```

#### ✅ Task 5.3: Write Tests
```typescript
// API tests
- Test confirm endpoint
- Test reject endpoint
- Test permissions
- Test edge cases

// Integration tests
- Test full workflow
- Test auto-reject cron
```

---

## 📊 Success Metrics

### Technical
- ✅ All API endpoints return < 200ms
- ✅ Zero N+1 queries in new code
- ✅ 100% test coverage for confirmation flow
- ✅ Mobile responsive on all screen sizes

### User Experience
- ✅ Tutor can confirm in < 3 clicks
- ✅ Student sees status update in < 5 seconds
- ✅ Clear error messages in Vietnamese
- ✅ Email notifications sent within 1 minute

### Business
- ✅ < 5% auto-rejection rate (tutor responds in time)
- ✅ > 90% confirmation rate
- ✅ < 1% dispute rate
- ✅ Average response time < 6 hours

---

## 🎯 Definition of Done

- [ ] ✅ All API endpoints created and tested
- [ ] ✅ Tutor dashboard shows pending requests
- [ ] ✅ Confirm/Reject actions work end-to-end
- [ ] ✅ Notifications sent to student
- [ ] ✅ Auto-reject cron job working
- [ ] ✅ Student dashboard shows booking status
- [ ] ✅ Mobile responsive
- [ ] ✅ Error handling complete
- [ ] ✅ Code reviewed and merged
- [ ] ✅ Deployed to staging
- [ ] ✅ Tested by team
- [ ] ✅ Documentation updated

---

## 🚀 Next Week Preview

**Week 2: Email Notifications**
- SendGrid/Resend integration
- Email templates
- Booking confirmation emails
- Reminder emails (1 day, 1 hour before)
- Weekly summary emails

**Week 3: Video Integration**
- Zoom API setup
- Meeting creation
- Join links
- Recording (optional)

---

## 💡 Tips

1. **Start with API** - Get backend working first
2. **Use Postman** - Test APIs before building UI
3. **Mobile First** - Design for mobile, scale up
4. **Incremental** - Ship small features daily
5. **User Feedback** - Test with real users ASAP

Hãy bắt đầu với Task 1.1! 🚀
