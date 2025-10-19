import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * API: Ghi nhận buổi học đã hoàn thành
 * POST /api/sessions/[id]/complete
 *
 * QUAN TRỌNG:
 * - Chỉ gia sư mới có thể complete session
 * - CHỈ GHI NHẬN buổi học, KHÔNG tự động release escrow
 * - Admin sẽ duyệt thanh toán sau khi đủ điều kiện
 *
 * Flow:
 * 1. Tutor marks session as completed
 * 2. System records attendance
 * 3. Update enrollment progress
 * 4. Send notifications
 * 5. Admin sẽ duyệt thanh toán khi đủ điều kiện
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Xác thực
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Vui lòng đăng nhập' },
        { status: 401 }
      );
    }

    const tutorProfile = await storage.getTutorByUserId(session.user.id);

    if (!tutorProfile) {
      return NextResponse.json(
        { error: 'Chỉ gia sư mới có thể hoàn thành buổi học' },
        { status: 403 }
      );
    }

    // 2. Lấy session record
    const sessionId = parseInt(params.id);
    const sessionRecord = await storage.getSessionRecordById(sessionId);

    if (!sessionRecord) {
      return NextResponse.json(
        { error: 'Session không tồn tại' },
        { status: 404 }
      );
    }

    // 3. Kiểm tra ownership
    const enrollment = await storage.getEnrollmentById(sessionRecord.enrollmentId);

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment không tồn tại' },
        { status: 404 }
      );
    }

    if (enrollment.tutorId !== tutorProfile.id) {
      return NextResponse.json(
        { error: 'Bạn không có quyền complete session này' },
        { status: 403 }
      );
    }

    // 4. Kiểm tra status
    if (sessionRecord.status === 'completed') {
      return NextResponse.json(
        { error: 'Session đã được hoàn thành trước đó' },
        { status: 400 }
      );
    }

    if (sessionRecord.status !== 'scheduled') {
      return NextResponse.json(
        { error: `Session không thể hoàn thành (status: ${sessionRecord.status})` },
        { status: 400 }
      );
    }

    // 5. Parse request body
    const body = await request.json();
    const { tutorNotes, studentAttended } = body;

    // 6. Cập nhật session status
    await storage.updateSessionRecord(sessionId, {
      status: 'completed',
      tutorAttended: 1,
      studentAttended: studentAttended ? 1 : 0,
      tutorNotes: tutorNotes || null,
      completedAt: new Date(),
    });

    // 7. Tăng completedSessions của enrollment
    await storage.updateEnrollment(enrollment.id, {
      completedSessions: enrollment.completedSessions + 1,
    });

    // 8. Kiểm tra nếu đã hoàn thành hết các buổi
    if (enrollment.completedSessions + 1 >= enrollment.totalSessions) {
      await storage.updateEnrollment(enrollment.id, {
        status: 'completed',
      });
    }

    // 9. Lấy student để gửi notification
    const student = await storage.getStudentById(enrollment.studentId);

    if (student) {
      await storage.createNotification({
        userId: student.userId,
        type: 'lesson_completed',
        title: 'Buổi học đã hoàn thành',
        message: `Buổi học #${sessionRecord.sessionNumber} với gia sư ${tutorProfile.fullName} đã hoàn thành. ${
          studentAttended
            ? 'Hãy đánh giá buổi học để giúp cộng đồng!'
            : 'Bạn đã vắng mặt buổi học này.'
        }`,
        link: `/dashboard/enrollments/${enrollment.id}`,
        isRead: 0,
      });
    }

    // 10. Ghi audit log
    await storage.createAuditLog({
      userId: session.user.id,
      action: 'session_completed',
      entityType: 'session',
      entityId: sessionId,
      changes: JSON.stringify({
        sessionNumber: sessionRecord.sessionNumber,
        enrollmentId: enrollment.id,
        tutorAttended: true,
        studentAttended: !!studentAttended,
      }),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      session: {
        id: sessionId,
        sessionNumber: sessionRecord.sessionNumber,
        status: 'completed',
        completedAt: new Date(),
      },
      enrollment: {
        completedSessions: enrollment.completedSessions + 1,
        totalSessions: enrollment.totalSessions,
        isCompleted: enrollment.completedSessions + 1 >= enrollment.totalSessions,
      },
      message: 'Đã ghi nhận buổi học. Admin sẽ duyệt thanh toán khi đủ điều kiện.',
    }, { status: 200 });

  } catch (error) {
    console.error('Error completing session:', error);

    return NextResponse.json(
      { error: 'Lỗi hoàn thành buổi học' },
      { status: 500 }
    );
  }
}
