import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { videoCallSessions, users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { isSessionValid } from '@/lib/jitsi';

/**
 * POST /api/video-call/validate
 * Validate access token and check user authorization
 * Used by prejoin page to verify before showing media setup
 * 
 * Returns:
 * - valid: boolean
 * - authorized: boolean (user is tutor or student of this session)
 * - sessionInfo: basic session info if valid
 * - error: error message if invalid
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json({
        valid: false,
        authorized: false,
        error: 'Access token is required',
        redirectTo: '/login'
      }, { status: 400 });
    }

    // 1. Check user authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({
        valid: false,
        authorized: false,
        error: 'Vui lòng đăng nhập để tham gia lớp học',
        redirectTo: '/login'
      }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const userRole = session.user.role;

    console.log('[Validate] User from session:', { userId, userRole, sessionUserId: session.user.id });

    // 2. Get video call session by access token
    const videoSession = await db
      .select()
      .from(videoCallSessions)
      .where(eq(videoCallSessions.accessToken, accessToken))
      .limit(1);

    if (videoSession.length === 0) {
      return NextResponse.json({
        valid: false,
        authorized: false,
        error: 'Link lớp học không hợp lệ hoặc đã hết hạn',
        redirectTo: userRole === 'tutor' ? '/tutor/dashboard' : '/student/dashboard'
      }, { status: 404 });
    }

    const sessionData = videoSession[0];

    console.log('[Validate] Session data:', { 
      sessionId: sessionData.id, 
      tutorId: sessionData.tutorId, 
      studentId: sessionData.studentId,
      userId,
      isTutor: userId === sessionData.tutorId,
      isStudent: userId === sessionData.studentId
    });

    // 3. Check if user is tutor or student of this session
    // Use Number() to handle BigInt comparison
    const isTutor = userId === Number(sessionData.tutorId);
    const isStudent = userId === Number(sessionData.studentId);

    if (!isTutor && !isStudent) {
      return NextResponse.json({
        valid: true,
        authorized: false,
        error: 'Bạn không phải là thành viên của lớp học này',
        redirectTo: userRole === 'tutor' ? '/tutor/dashboard' : '/student/dashboard'
      }, { status: 403 });
    }

    // 4. Check session expiry
    if (!isSessionValid(sessionData.expiresAt)) {
      return NextResponse.json({
        valid: false,
        authorized: false,
        error: 'Buổi học đã hết hạn',
        redirectTo: userRole === 'tutor' ? '/tutor/dashboard' : '/student/dashboard'
      }, { status: 410 });
    }

    // 5. Check if session is cancelled
    if (sessionData.status === 'cancelled') {
      return NextResponse.json({
        valid: false,
        authorized: false,
        error: 'Buổi học đã bị hủy',
        redirectTo: userRole === 'tutor' ? '/tutor/dashboard' : '/student/dashboard'
      }, { status: 403 });
    }

    // 6. Check payment status for students
    if (isStudent && sessionData.canStudentJoin === 0) {
      return NextResponse.json({
        valid: true,
        authorized: false,
        error: 'Vui lòng thanh toán trước khi tham gia lớp học',
        redirectTo: '/student/dashboard'
      }, { status: 402 });
    }

    // 7. Get user name
    const userData = await db
      .select({
        fullName: users.fullName,
        username: users.username,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const userName = userData[0]?.fullName || userData[0]?.username || (isTutor ? 'Tutor' : 'Student');

    // 8. Return success with session info
    return NextResponse.json({
      valid: true,
      authorized: true,
      sessionInfo: {
        sessionId: sessionData.id,
        roomName: sessionData.roomName,
        role: isTutor ? 'tutor' : 'student',
        userName,
        scheduledStartTime: sessionData.scheduledStartTime,
        scheduledEndTime: sessionData.scheduledEndTime,
        provider: sessionData.provider || 'videolify'
      }
    });

  } catch (error) {
    console.error('Error validating video call access:', error);
    return NextResponse.json({
      valid: false,
      authorized: false,
      error: 'Có lỗi xảy ra, vui lòng thử lại',
      redirectTo: '/login'
    }, { status: 500 });
  }
}
