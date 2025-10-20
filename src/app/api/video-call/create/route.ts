import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { videoCallSessions, classEnrollments, lessons, payments, escrowPayments } from '@/lib/schema';
import { eq, and, or } from 'drizzle-orm';
import {
  generateRoomName,
  generateAccessToken,
  generateJitsiToken,
  getSessionExpiry,
} from '@/lib/jitsi';

/**
 * POST /api/video-call/create
 * Create a video call session for a lesson or enrollment
 *
 * Request body:
 * - lessonId?: number (for individual lessons)
 * - enrollmentId?: number (for package enrollments)
 * - sessionRecordId?: number (for specific session in enrollment)
 *
 * Security checks:
 * 1. User must be authenticated
 * 2. User must be tutor or student of the lesson/enrollment
 * 3. Payment must be completed (for students)
 * 4. Cannot create duplicate sessions for same lesson/session_record
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const userRole = session.user.role;

    // 2. Parse request body
    const body = await request.json();
    const { lessonId, enrollmentId, sessionRecordId } = body;

    // 3. Validate input - must have either lessonId or (enrollmentId + sessionRecordId)
    if (!lessonId && !enrollmentId) {
      return NextResponse.json(
        { error: 'Either lessonId or enrollmentId must be provided' },
        { status: 400 }
      );
    }

    let tutorId: number;
    let studentId: number;
    let scheduledStartTime: Date;
    let scheduledEndTime: Date;
    let paymentStatus: 'unpaid' | 'paid' | 'partially_paid' = 'unpaid';
    let canStudentJoin = 1;

    // 4. Handle individual lesson
    if (lessonId) {
      // Check if session already exists for this lesson
      const existingSession = await db
        .select()
        .from(videoCallSessions)
        .where(eq(videoCallSessions.lessonId, lessonId))
        .limit(1);

      if (existingSession.length > 0) {
        return NextResponse.json(
          { error: 'Video call session already exists for this lesson', sessionId: existingSession[0].id },
          { status: 409 }
        );
      }

      // Get lesson details
      const lesson = await db
        .select()
        .from(lessons)
        .where(eq(lessons.id, lessonId))
        .limit(1);

      if (lesson.length === 0) {
        return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
      }

      const lessonData = lesson[0];

      // Check authorization - user must be tutor or student
      tutorId = parseInt(lessonData.tutorId);
      studentId = parseInt(lessonData.studentId);

      if (userId !== tutorId && userId !== studentId) {
        return NextResponse.json(
          { error: 'You are not authorized to create video call for this lesson' },
          { status: 403 }
        );
      }

      // Check lesson status
      if (lessonData.status === 'cancelled') {
        return NextResponse.json(
          { error: 'Cannot create video call for cancelled lesson' },
          { status: 400 }
        );
      }

      // Parse schedule times
      const dateStr = lessonData.date;
      const startTimeStr = lessonData.startTime;
      const endTimeStr = lessonData.endTime;

      scheduledStartTime = new Date(`${dateStr}T${startTimeStr}:00`);
      scheduledEndTime = new Date(`${dateStr}T${endTimeStr}:00`);

      // Check payment status for trial lessons (free) or regular lessons
      if (lessonData.isTrial === 0) {
        // Regular lesson - check payment
        // For now, assume paid if lesson is confirmed
        // TODO: Implement actual payment check
        paymentStatus = lessonData.status === 'confirmed' ? 'paid' : 'unpaid';
        canStudentJoin = paymentStatus === 'paid' ? 1 : 0;
      } else {
        // Trial lesson - always allow
        paymentStatus = 'paid';
        canStudentJoin = 1;
      }
    }
    // 5. Handle enrollment-based session
    else if (enrollmentId) {
      // Get enrollment details
      const enrollment = await db
        .select()
        .from(classEnrollments)
        .where(eq(classEnrollments.id, enrollmentId))
        .limit(1);

      if (enrollment.length === 0) {
        return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
      }

      const enrollmentData = enrollment[0];

      tutorId = enrollmentData.tutorId;
      studentId = enrollmentData.studentId;

      // Check authorization
      if (userId !== tutorId && userId !== studentId) {
        return NextResponse.json(
          { error: 'You are not authorized to create video call for this enrollment' },
          { status: 403 }
        );
      }

      // Check enrollment status
      if (enrollmentData.status !== 'active') {
        return NextResponse.json(
          { error: 'Enrollment must be active to create video call' },
          { status: 400 }
        );
      }

      // Check payment status via escrow
      const payment = await db
        .select()
        .from(payments)
        .where(eq(payments.enrollmentId, enrollmentId))
        .limit(1);

      if (payment.length === 0) {
        paymentStatus = 'unpaid';
        canStudentJoin = 0;
      } else {
        const paymentData = payment[0];

        if (paymentData.status === 'completed' || paymentData.status === 'holding') {
          paymentStatus = 'paid';
          canStudentJoin = 1;
        } else {
          paymentStatus = 'unpaid';
          canStudentJoin = 0;
        }
      }

      // For enrollment without specific sessionRecordId, use enrollment dates
      if (enrollmentData.startDate && enrollmentData.endDate) {
        const startDate = new Date(enrollmentData.startDate);
        const endDate = new Date(enrollmentData.endDate);

        scheduledStartTime = startDate;
        scheduledEndTime = endDate;
      } else {
        // Default to current time + 1 hour if no dates
        scheduledStartTime = new Date();
        scheduledEndTime = new Date(Date.now() + 60 * 60 * 1000);
      }

      // If sessionRecordId is provided, check it exists and use its schedule
      if (sessionRecordId) {
        const { sessionRecords } = await import('@/lib/schema');

        // Check if session already exists
        const existingSession = await db
          .select()
          .from(videoCallSessions)
          .where(eq(videoCallSessions.sessionRecordId, sessionRecordId))
          .limit(1);

        if (existingSession.length > 0) {
          return NextResponse.json(
            { error: 'Video call session already exists for this session record', sessionId: existingSession[0].id },
            { status: 409 }
          );
        }

        const sessionRecord = await db
          .select()
          .from(sessionRecords)
          .where(eq(sessionRecords.id, sessionRecordId))
          .limit(1);

        if (sessionRecord.length === 0) {
          return NextResponse.json({ error: 'Session record not found' }, { status: 404 });
        }

        const recordData = sessionRecord[0];
        const dateStr = recordData.date;
        const startTimeStr = recordData.startTime;
        const endTimeStr = recordData.endTime;

        scheduledStartTime = new Date(`${dateStr}T${startTimeStr}:00`);
        scheduledEndTime = new Date(`${dateStr}T${endTimeStr}:00`);
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid request - missing required fields' },
        { status: 400 }
      );
    }

    // 6. Generate unique tokens and room name
    const roomName = generateRoomName('lophoc');
    const accessToken = generateAccessToken();
    const expiresAt = getSessionExpiry(scheduledEndTime);

    // Get user details for JWT
    const { users } = await import('@/lib/schema');
    const [tutorUser, studentUser] = await Promise.all([
      db.select().from(users).where(eq(users.id, tutorId)).limit(1),
      db.select().from(users).where(eq(users.id, studentId)).limit(1),
    ]);

    if (tutorUser.length === 0 || studentUser.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate JWT tokens for Jitsi
    const tutorToken = await generateJitsiToken({
      roomName,
      userId: tutorId.toString(),
      userName: tutorUser[0].username,
      email: tutorUser[0].email || undefined,
      moderator: true, // Tutor is moderator
      expiresIn: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    });

    const studentToken = await generateJitsiToken({
      roomName,
      userId: studentId.toString(),
      userName: studentUser[0].username,
      email: studentUser[0].email || undefined,
      moderator: false, // Student is participant
      expiresIn: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    });

    // 7. Create video call session
    await db.insert(videoCallSessions).values({
      enrollmentId: enrollmentId || null,
      lessonId: lessonId || null,
      sessionRecordId: sessionRecordId || null,
      tutorId,
      studentId,
      roomName,
      accessToken,
      tutorToken,
      studentToken,
      scheduledStartTime,
      scheduledEndTime,
      status: 'pending',
      paymentStatus,
      canStudentJoin,
      canTutorJoin: 1,
      expiresAt,
    });

    // Get the created session
    const createdSession = await db
      .select()
      .from(videoCallSessions)
      .where(eq(videoCallSessions.accessToken, accessToken))
      .limit(1);

    // 8. Return success response
    return NextResponse.json({
      success: true,
      sessionId: createdSession[0]?.id || 0,
      roomName,
      accessToken,
      scheduledStartTime: scheduledStartTime.toISOString(),
      scheduledEndTime: scheduledEndTime.toISOString(),
      expiresAt: expiresAt.toISOString(),
      paymentStatus,
      canStudentJoin: canStudentJoin === 1,
      message: canStudentJoin === 1
        ? 'Video call session created successfully'
        : 'Video call session created but student cannot join due to unpaid status',
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating video call session:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
