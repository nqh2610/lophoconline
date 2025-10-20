import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { videoCallSessions, sessionRecords } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { calculateSessionDuration } from '@/lib/jitsi';

/**
 * POST /api/video-call/leave
 * Record when a user leaves the video call session
 *
 * Request body:
 * - sessionId: number (video call session ID)
 *
 * Actions:
 * 1. Verify user is participant
 * 2. Record leave time (tutorLeftAt or studentLeftAt)
 * 3. If both tutor and student have left, mark session as completed
 * 4. Update session_records with attendance and completion time
 */
export async function POST(request: NextRequest) {
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

    // 2. Parse request body
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // 3. Get video call session
    const videoSession = await db
      .select()
      .from(videoCallSessions)
      .where(eq(videoCallSessions.id, sessionId))
      .limit(1);

    if (videoSession.length === 0) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const sessionData = videoSession[0];

    // 4. Check if user is authorized
    const isTutor = userId === sessionData.tutorId;
    const isStudent = userId === sessionData.studentId;

    if (!isTutor && !isStudent) {
      return NextResponse.json(
        { error: 'Access denied - You are not a participant of this session' },
        { status: 403 }
      );
    }

    // 5. Check if user has actually joined before leaving
    if (isTutor && !sessionData.tutorJoinedAt) {
      return NextResponse.json(
        { error: 'Cannot leave - Tutor has not joined yet' },
        { status: 400 }
      );
    }

    if (isStudent && !sessionData.studentJoinedAt) {
      return NextResponse.json(
        { error: 'Cannot leave - Student has not joined yet' },
        { status: 400 }
      );
    }

    // 6. Check if already left
    if (isTutor && sessionData.tutorLeftAt) {
      return NextResponse.json(
        {
          success: true,
          message: 'Tutor already left this session',
          leftAt: sessionData.tutorLeftAt,
        }
      );
    }

    if (isStudent && sessionData.studentLeftAt) {
      return NextResponse.json(
        {
          success: true,
          message: 'Student already left this session',
          leftAt: sessionData.studentLeftAt,
        }
      );
    }

    // 7. Record leave time
    const now = new Date();
    const updateData: any = { updatedAt: now };

    if (isTutor) {
      updateData.tutorLeftAt = now;
    } else if (isStudent) {
      updateData.studentLeftAt = now;
    }

    // 8. Check if both participants have left
    const bothLeft =
      (isTutor && sessionData.studentLeftAt) ||
      (isStudent && sessionData.tutorLeftAt);

    if (bothLeft) {
      // Mark session as completed and record end time
      updateData.status = 'completed';
      updateData.sessionEndedAt = now;

      // Calculate actual session duration
      const tutorJoinTime = sessionData.tutorJoinedAt;
      const studentJoinTime = sessionData.studentJoinedAt;
      const tutorLeaveTime = isTutor ? now : sessionData.tutorLeftAt;
      const studentLeaveTime = isStudent ? now : sessionData.studentLeftAt;

      // Session start time is when both joined (use the later join time)
      const sessionStartTime =
        tutorJoinTime && studentJoinTime
          ? new Date(Math.max(tutorJoinTime.getTime(), studentJoinTime.getTime()))
          : null;

      // Session end time is when first person left (use the earlier leave time)
      const sessionEndTime =
        tutorLeaveTime && studentLeaveTime
          ? new Date(Math.min(tutorLeaveTime.getTime(), studentLeaveTime.getTime()))
          : now;

      const durationMinutes = sessionStartTime
        ? calculateSessionDuration(sessionStartTime, sessionEndTime)
        : null;

      // 9. Update associated session_records if exists
      if (sessionData.sessionRecordId) {
        const sessionRecordUpdateData: any = {
          status: 'completed',
          tutorAttended: sessionData.tutorJoinedAt ? 1 : 0,
          studentAttended: sessionData.studentJoinedAt ? 1 : 0,
          completedAt: now,
          updatedAt: now,
        };

        await db
          .update(sessionRecords)
          .set(sessionRecordUpdateData)
          .where(eq(sessionRecords.id, sessionData.sessionRecordId));
      }

      // 10. Update lessons table if exists
      if (sessionData.lessonId) {
        const { lessons } = await import('@/lib/schema');

        await db
          .update(lessons)
          .set({
            status: 'completed',
            completedAt: now,
            updatedAt: now,
          })
          .where(eq(lessons.id, sessionData.lessonId));
      }
    }

    // 11. Update video call session
    await db
      .update(videoCallSessions)
      .set(updateData)
      .where(eq(videoCallSessions.id, sessionData.id));

    // 12. Calculate session duration for this user
    const joinTime = isTutor ? sessionData.tutorJoinedAt : sessionData.studentJoinedAt;
    const duration = joinTime ? calculateSessionDuration(joinTime, now) : null;

    // 13. Return success response
    return NextResponse.json({
      success: true,
      message: bothLeft
        ? 'Session completed - Both participants have left'
        : `${isTutor ? 'Tutor' : 'Student'} left the session`,
      sessionId: sessionData.id,
      leftAt: now.toISOString(),
      role: isTutor ? 'tutor' : 'student',
      durationMinutes: duration,
      sessionCompleted: bothLeft,
      sessionEndedAt: bothLeft ? now.toISOString() : null,
    });

  } catch (error) {
    console.error('Error leaving video call:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
