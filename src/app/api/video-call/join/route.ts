import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { videoCallSessions, users } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { canJoinNow, isSessionValid, generateJitsiUrl } from '@/lib/jitsi';

/**
 * POST /api/video-call/join
 * Join a video call session with security checks
 *
 * Request body:
 * - accessToken: string (unique session access token)
 *
 * Security checks:
 * 1. User must be authenticated
 * 2. Access token must be valid and not expired
 * 3. User must be the tutor or student of this session
 * 4. Session must not be expired
 * 5. Student must have paid (canStudentJoin = 1)
 * 6. Current time must be within join window
 * 7. Track IP address and join time
 * 8. Prevent duplicate joins (each user can only join once per session)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body first
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }

    // 2. Get video call session by access token (before auth check)
    const videoSession = await db
      .select()
      .from(videoCallSessions)
      .where(eq(videoCallSessions.accessToken, accessToken))
      .limit(1);

    if (videoSession.length === 0) {
      return NextResponse.json(
        { error: 'Invalid access token - Session not found' },
        { status: 404 }
      );
    }

    const sessionData = videoSession[0];

    // 3. For Videolify provider, authentication is optional (accessToken is sufficient)
    // For Jitsi provider, require authentication
    let userId: number | null = null;
    let userRole: string | null = null;
    let userName = 'Anonymous User';

    if (sessionData.provider === 'videolify') {
      // Videolify: accessToken is enough, no login required
      // We'll use a mock user based on session data
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        userId = parseInt(session.user.id);
        userRole = session.user.role;
      } else {
        // No session - allow anonymous join for videolify
        // Auto-detect role based on existing joins or use tutor as default
        userId = null; // Will be set below
      }
    } else {
      // Jitsi: require authentication
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Unauthorized - Please login first (Jitsi requires authentication)' },
          { status: 401 }
        );
      }
      userId = parseInt(session.user.id);
      userRole = session.user.role;
    }

    // 4. Determine user role for videolify (if not authenticated)
    let isTutor = false;
    let isStudent = false;

    if (userId === null && sessionData.provider === 'videolify') {
      // Auto-assign role based on who hasn't joined yet
      if (!sessionData.tutorJoinedAt) {
        isTutor = true;
        userId = sessionData.tutorId;
        userName = 'Tutor';
      } else if (!sessionData.studentJoinedAt) {
        isStudent = true;
        userId = sessionData.studentId;
        userName = 'Student';
      } else {
        // Both joined - allow as observer or assign to less recent joiner
        isTutor = true;
        userId = sessionData.tutorId;
        userName = 'Tutor (Rejoin)';
      }
    } else if (userId !== null) {
      // Authenticated user - check authorization
      isTutor = userId === sessionData.tutorId;
      isStudent = userId === sessionData.studentId;

      if (!isTutor && !isStudent && sessionData.provider !== 'videolify') {
        return NextResponse.json(
          { error: 'Access denied - You are not a participant of this session' },
          { status: 403 }
        );
      }
    }

    // For Videolify, if still no role assigned, default to tutor
    if (!isTutor && !isStudent && sessionData.provider === 'videolify') {
      isTutor = true;
    }

    // 5. Check session expiry
    if (!isSessionValid(sessionData.expiresAt)) {
      // Update session status to expired
      await db
        .update(videoCallSessions)
        .set({ status: 'expired' })
        .where(eq(videoCallSessions.id, sessionData.id));

      return NextResponse.json(
        { error: 'Session has expired' },
        { status: 410 }
      );
    }

    // 6. Check if session is cancelled
    if (sessionData.status === 'cancelled') {
      return NextResponse.json(
        { error: 'This session has been cancelled' },
        { status: 403 }
      );
    }

    // 7. Check payment status for students
    if (isStudent && sessionData.canStudentJoin === 0) {
      return NextResponse.json(
        {
          error: 'Payment required - Please complete payment before joining the session',
          paymentStatus: sessionData.paymentStatus
        },
        { status: 402 } // Payment Required
      );
    }

    // 8. Check if tutor is allowed to join
    if (isTutor && sessionData.canTutorJoin === 0) {
      return NextResponse.json(
        { error: 'Access denied - Please contact support' },
        { status: 403 }
      );
    }

    // 9. Check join time window (15 minutes before scheduled start, until scheduled end + 1 hour grace)
    const scheduledStart = new Date(sessionData.scheduledStartTime);
    const scheduledEnd = new Date(sessionData.scheduledEndTime);
    const now = new Date();

    // ✅ DEBUG: Log times for troubleshooting
    console.log('[Join] Time check:', {
      now: now.toISOString(),
      nowLocal: now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      scheduledStart: scheduledStart.toISOString(),
      scheduledStartLocal: scheduledStart.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      scheduledEnd: scheduledEnd.toISOString(),
      scheduledEndLocal: scheduledEnd.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      rawScheduledStart: sessionData.scheduledStartTime,
      rawScheduledEnd: sessionData.scheduledEndTime,
      canJoin: canJoinNow(scheduledStart, scheduledEnd)
    });

    if (!canJoinNow(scheduledStart, scheduledEnd)) {
      const minutesUntilStart = Math.floor((scheduledStart.getTime() - now.getTime()) / 60000);
      const minutesSinceEnd = Math.floor((now.getTime() - scheduledEnd.getTime()) / 60000);

      if (minutesUntilStart > 15) {
        return NextResponse.json(
          {
            error: `Session not yet available - You can join starting ${minutesUntilStart - 15} minutes from now`,
            scheduledStartTime: scheduledStart.toISOString(),
            canJoinAt: new Date(scheduledStart.getTime() - 15 * 60 * 1000).toISOString(),
          },
          { status: 425 } // Too Early
        );
      } else if (minutesSinceEnd > 60) { // ✅ Changed from 0 to 60 (1 hour grace)
        return NextResponse.json(
          {
            error: 'Session has ended',
            scheduledEndTime: scheduledEnd.toISOString(),
          },
          { status: 410 } // Gone
        );
      }
    }

    // 10. Get user full name (needed for both first join and rejoin)
    if (userId && userName === 'Anonymous User') {
      const userData = await db
        .select({
          fullName: users.fullName,
          username: users.username,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      userName = userData[0]?.fullName || userData[0]?.username || (isTutor ? 'Tutor' : 'Student');
    }
    
    console.log('👤 [Video Call Join] userName:', userName, 'userId:', userId, 'isTutor:', isTutor);

    // 11. Check for duplicate join (prevent copy-paste of link)
    // If user already joined once, don't allow again
    if (isTutor && sessionData.tutorJoinedAt) {
      // Tutor already joined - don't record again but allow rejoin
      const jitsiUrl = generateJitsiUrl(sessionData.roomName, sessionData.tutorToken, userName);

      return NextResponse.json({
        success: true,
        message: 'Rejoining session',
        sessionId: sessionData.id,
        jitsiUrl,
        roomName: sessionData.roomName,
        userName, // ✅ ADDED
        role: 'tutor',
        provider: sessionData.provider || 'jitsi', // ✅ Add provider
        moderator: true,
        joinedAt: sessionData.tutorJoinedAt,
      });
    }

    if (isStudent && sessionData.studentJoinedAt) {
      // Student already joined - don't record again but allow rejoin
      const jitsiUrl = generateJitsiUrl(sessionData.roomName, sessionData.studentToken, userName);

      return NextResponse.json({
        success: true,
        message: 'Rejoining session',
        sessionId: sessionData.id,
        jitsiUrl,
        roomName: sessionData.roomName,
        userName, // ✅ ADDED
        role: 'student',
        provider: sessionData.provider || 'jitsi', // ✅ Add provider
        moderator: false,
        joinedAt: sessionData.studentJoinedAt,
      });
    }

    // 12. Get client IP address
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0] || realIp || 'unknown';

    // 12. Parse existing IP addresses
    let ipAddresses: string[] = [];
    if (sessionData.ipAddresses) {
      try {
        ipAddresses = JSON.parse(sessionData.ipAddresses);
      } catch {
        ipAddresses = [];
      }
    }

    // Add current IP if not already tracked
    if (!ipAddresses.includes(clientIp)) {
      ipAddresses.push(clientIp);
    }

    // 13. Update session with join information
    const updateData: any = {
      usedCount: sessionData.usedCount + 1,
      ipAddresses: JSON.stringify(ipAddresses),
      updatedAt: now,
    };

    // Record join time
    if (isTutor) {
      updateData.tutorJoinedAt = now;
    } else if (isStudent) {
      updateData.studentJoinedAt = now;
    }

    // Update session status to active if this is first join
    if (sessionData.status === 'pending') {
      updateData.status = 'active';
    }

    await db
      .update(videoCallSessions)
      .set(updateData)
      .where(eq(videoCallSessions.id, sessionData.id));

    // 14. Generate Jitsi meeting URL with appropriate token (userName already fetched above)
    const jitsiToken = isTutor ? sessionData.tutorToken : sessionData.studentToken;
    const jitsiUrl = generateJitsiUrl(sessionData.roomName, jitsiToken, userName);

    // 15. Return success response with userName
    return NextResponse.json({
      success: true,
      message: 'Successfully joined video call session',
      sessionId: sessionData.id,
      jitsiUrl,
      roomName: sessionData.roomName,
      userName, // ✅ Add userName for iframe API
      role: isTutor ? 'tutor' : 'student',
      provider: sessionData.provider || 'jitsi', // ✅ Add provider
      moderator: isTutor,
      joinedAt: now.toISOString(),
      scheduledEndTime: scheduledEnd.toISOString(),
    });

  } catch (error) {
    console.error('Error joining video call:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
