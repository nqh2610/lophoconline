import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { videoCallSessions, lessons, classEnrollments, users, subjects } from '@/lib/schema';
import { eq, and, or, gte, lte, desc } from 'drizzle-orm';
import { canJoinNow } from '@/lib/jitsi';

/**
 * GET /api/video-call/upcoming
 * Get upcoming video call sessions for current user
 *
 * Query params:
 * - role?: 'tutor' | 'student' (filter by role)
 * - status?: 'pending' | 'active' | 'completed' (filter by status)
 * - limit?: number (default: 20)
 *
 * Returns:
 * - List of upcoming video call sessions with lesson/enrollment details
 * - Access tokens for joining
 * - Payment status
 * - Join availability status
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login first' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const userRole = session.user.role;

    // 2. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const roleFilter = searchParams.get('role') as 'tutor' | 'student' | null;
    const statusFilter = searchParams.get('status') || null;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 20;

    // 3. Build query conditions
    const now = new Date();
    const conditions: any[] = [];

    // Filter by user role
    if (roleFilter === 'tutor' || (userRole === 'tutor' && !roleFilter)) {
      conditions.push(eq(videoCallSessions.tutorId, userId));
    } else if (roleFilter === 'student' || (userRole === 'student' && !roleFilter)) {
      conditions.push(eq(videoCallSessions.studentId, userId));
    } else {
      // If no role filter and user is neither tutor nor student, show all their sessions
      conditions.push(
        or(
          eq(videoCallSessions.tutorId, userId),
          eq(videoCallSessions.studentId, userId)
        )
      );
    }

    // Filter by status
    if (statusFilter) {
      conditions.push(eq(videoCallSessions.status, statusFilter));
    } else {
      // Default: show only pending and active sessions (not completed or expired)
      conditions.push(
        or(
          eq(videoCallSessions.status, 'pending'),
          eq(videoCallSessions.status, 'active')
        )
      );
    }

    // Only show sessions that haven't expired yet
    conditions.push(gte(videoCallSessions.expiresAt, now));

    // 4. Query video call sessions
    const sessions = await db
      .select()
      .from(videoCallSessions)
      .where(and(...conditions))
      .orderBy(videoCallSessions.scheduledStartTime)
      .limit(limit);

    // 5. Enrich sessions with lesson/enrollment details
    const enrichedSessions = await Promise.all(
      sessions.map(async (videoSession) => {
        const isTutor = videoSession.tutorId === userId;
        const isStudent = videoSession.studentId === userId;

        // Get partner user info (if I'm tutor, get student; if I'm student, get tutor)
        const partnerId = isTutor ? videoSession.studentId : videoSession.tutorId;
        const partner = await db
          .select({
            id: users.id,
            username: users.username,
            avatar: users.avatar,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, partnerId))
          .limit(1);

        const partnerInfo = partner.length > 0 ? partner[0] : null;

        // Base session info
        const sessionInfo: any = {
          id: videoSession.id,
          sessionType: videoSession.lessonId ? 'lesson' : 'enrollment',
          roomName: videoSession.roomName,
          accessToken: videoSession.accessToken,
          scheduledStartTime: videoSession.scheduledStartTime,
          scheduledEndTime: videoSession.scheduledEndTime,
          status: videoSession.status,
          paymentStatus: videoSession.paymentStatus,
          canJoin: isTutor
            ? videoSession.canTutorJoin === 1
            : videoSession.canStudentJoin === 1,
          canJoinNow: canJoinNow(
            videoSession.scheduledStartTime,
            videoSession.scheduledEndTime
          ),
          expiresAt: videoSession.expiresAt,
          userRole: isTutor ? 'tutor' : 'student',
          partnerRole: isTutor ? 'student' : 'tutor',
          partner: partnerInfo,
          joinedAt: isTutor
            ? videoSession.tutorJoinedAt
            : videoSession.studentJoinedAt,
          partnerJoinedAt: isTutor
            ? videoSession.studentJoinedAt
            : videoSession.tutorJoinedAt,
          leftAt: isTutor ? videoSession.tutorLeftAt : videoSession.studentLeftAt,
          sessionEndedAt: videoSession.sessionEndedAt,
          usedCount: videoSession.usedCount,
        };

        // Get lesson details if exists
        if (videoSession.lessonId) {
          const lesson = await db
            .select()
            .from(lessons)
            .where(eq(lessons.id, videoSession.lessonId))
            .limit(1);

          if (lesson.length > 0) {
            const lessonData = lesson[0];
            sessionInfo.lesson = {
              id: lessonData.id,
              subject: lessonData.subject,
              date: lessonData.date,
              startTime: lessonData.startTime,
              endTime: lessonData.endTime,
              status: lessonData.status,
              price: lessonData.price,
              isTrial: lessonData.isTrial === 1,
              notes: lessonData.notes,
            };
          }
        }

        // Get enrollment details if exists
        if (videoSession.enrollmentId) {
          const enrollment = await db
            .select()
            .from(classEnrollments)
            .where(eq(classEnrollments.id, videoSession.enrollmentId))
            .limit(1);

          if (enrollment.length > 0) {
            const enrollmentData = enrollment[0];

            // Get subject name
            const subject = await db
              .select()
              .from(subjects)
              .where(eq(subjects.id, enrollmentData.subjectId))
              .limit(1);

            sessionInfo.enrollment = {
              id: enrollmentData.id,
              subjectId: enrollmentData.subjectId,
              subjectName: subject.length > 0 ? subject[0].name : 'Unknown',
              totalSessions: enrollmentData.totalSessions,
              completedSessions: enrollmentData.completedSessions,
              pricePerSession: enrollmentData.pricePerSession,
              totalAmount: enrollmentData.totalAmount,
              status: enrollmentData.status,
              startDate: enrollmentData.startDate,
              endDate: enrollmentData.endDate,
            };
          }
        }

        // Get session record details if exists
        if (videoSession.sessionRecordId) {
          const { sessionRecords } = await import('@/lib/schema');
          const record = await db
            .select()
            .from(sessionRecords)
            .where(eq(sessionRecords.id, videoSession.sessionRecordId))
            .limit(1);

          if (record.length > 0) {
            const recordData = record[0];
            sessionInfo.sessionRecord = {
              id: recordData.id,
              sessionNumber: recordData.sessionNumber,
              date: recordData.date,
              startTime: recordData.startTime,
              endTime: recordData.endTime,
              status: recordData.status,
              tutorAttended: recordData.tutorAttended === 1,
              studentAttended: recordData.studentAttended === 1,
              tutorNotes: recordData.tutorNotes,
            };
          }
        }

        return sessionInfo;
      })
    );

    // 6. Separate into categories for better UX
    const upcomingSessions = enrichedSessions.filter(
      (s) => new Date(s.scheduledStartTime) > now && s.status === 'pending'
    );

    const activeSessions = enrichedSessions.filter(
      (s) => s.status === 'active' && !s.sessionEndedAt
    );

    const joinableSoon = enrichedSessions.filter(
      (s) => s.canJoinNow && s.status === 'pending'
    );

    // 7. Return response
    return NextResponse.json({
      success: true,
      total: enrichedSessions.length,
      sessions: enrichedSessions,
      categories: {
        active: activeSessions.length,
        upcoming: upcomingSessions.length,
        joinableSoon: joinableSoon.length,
      },
      activeSessions,
      upcomingSessions,
      joinableSoon,
    });

  } catch (error) {
    console.error('Error fetching upcoming video calls:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
