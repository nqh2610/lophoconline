import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { classEnrollments, payments, users, tutors, students } from '@/lib/schema';
import { eq, sql, inArray } from 'drizzle-orm';

/**
 * API: Lấy danh sách lớp đủ điều kiện thanh toán
 * GET /api/admin/enrollments/eligible-for-payout
 *
 * Điều kiện thanh toán:
 * 1. Lớp đã học đủ 1 tháng (30 ngày kể từ buổi học đầu tiên)
 * 2. Lớp đã kết thúc (status = 'completed')
 * 3. Lớp có yêu cầu thanh toán từ giáo viên (tutor_requested_payout = 1)
 * 4. Học sinh yêu cầu nghỉ → tính theo số buổi học thực tế
 *
 * Trả về:
 * - Danh sách enrollments
 * - Số buổi đã học thực tế
 * - Số tiền phải trả (dựa trên số buổi thực tế)
 * - Phí nền tảng
 * - Số tiền giáo viên nhận
 */

export async function GET(request: NextRequest) {
  try {
    // 1. Xác thực admin
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Vui lòng đăng nhập' },
        { status: 401 }
      );
    }

    const user = await storage.getUserById(parseInt(session.user.id));

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Chỉ admin mới có quyền xem danh sách này' },
        { status: 403 }
      );
    }

    // 2. Lấy tất cả enrollments có escrow (đã thanh toán)
    const allEnrollments = await db
      .select()
      .from(classEnrollments)
      .where(sql`status IN ('active', 'completed')`);

    const eligibleEnrollments = [];
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 3. Kiểm tra từng enrollment
    for (const enrollment of allEnrollments) {
      // Lấy sessions của enrollment
      const sessions = await storage.getSessionsByEnrollment(enrollment.id);
      const completedSessions = sessions.filter(s => s.status === 'completed');

      if (completedSessions.length === 0) continue;

      // Lấy escrow payment
      const payment = await db
        .select()
        .from(payments)
        .where(eq(payments.enrollmentId, enrollment.id))
        .limit(1);

      if (payment.length === 0) continue;

      const escrow = await storage.getEscrowByPaymentId(payment[0].id);

      if (!escrow) continue;

      // Kiểm tra điều kiện:
      let eligible = false;
      let reason = '';

      // Điều kiện 1: Đủ 1 tháng từ buổi học đầu tiên
      const firstSession = sessions
        .filter(s => s.status === 'completed')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

      if (firstSession) {
        const firstSessionDate = new Date(firstSession.date);
        if (firstSessionDate <= oneMonthAgo) {
          eligible = true;
          reason = 'Đã học đủ 1 tháng';
        }
      }

      // Điều kiện 2: Lớp đã kết thúc
      if (enrollment.status === 'completed') {
        eligible = true;
        reason = 'Lớp đã kết thúc';
      }

      // Điều kiện 3: Giáo viên yêu cầu thanh toán
      // TODO: Add field tutor_requested_payout to enrollment
      // if (enrollment.tutorRequestedPayout === 1) {
      //   eligible = true;
      //   reason = 'Giáo viên yêu cầu thanh toán';
      // }

      // Điều kiện 4: Học sinh yêu cầu nghỉ
      if (enrollment.status === 'cancelled') {
        eligible = true;
        reason = 'Học sinh nghỉ - tính theo buổi thực tế';
      }

      if (!eligible) continue;

      // Tính toán số tiền
      const completedCount = completedSessions.length;
      const amountPerSession = Math.floor(enrollment.totalAmount / enrollment.totalSessions);
      const totalAmountForCompletedSessions = amountPerSession * completedCount;

      // Trừ đi số tiền đã release (nếu có)
      const alreadyReleased = escrow.releasedAmount || 0;
      const amountToRelease = totalAmountForCompletedSessions - alreadyReleased;

      if (amountToRelease <= 0) continue; // Đã release hết

      // Commission rate
      const commissionRate = escrow.commissionRate || 15;
      const platformFee = Math.floor((amountToRelease * commissionRate) / 100);
      const tutorAmount = amountToRelease - platformFee;

      eligibleEnrollments.push({
        enrollment: {
          id: enrollment.id,
          totalSessions: enrollment.totalSessions,
          completedSessions: completedCount,
          pricePerSession: enrollment.pricePerSession,
          totalAmount: enrollment.totalAmount,
          status: enrollment.status,
          startDate: enrollment.startDate,
          tutorId: enrollment.tutorId,
          studentId: enrollment.studentId,
        },
        escrow: {
          id: escrow.id,
          totalAmount: escrow.totalAmount,
          alreadyReleased: alreadyReleased,
          amountToRelease,
          platformFee,
          tutorAmount,
          commissionRate,
        },
        reason,
        firstSessionDate: firstSession ? firstSession.date : null,
        lastSessionDate: completedSessions.length > 0
          ? completedSessions[completedSessions.length - 1].date
          : null,
      });
    }

    // Fetch user data for all tutors and students in batch
    const tutorIds = [...new Set(eligibleEnrollments.map(e => e.enrollment.tutorId))];
    const studentIds = [...new Set(eligibleEnrollments.map(e => e.enrollment.studentId))];

    const [tutorProfiles, studentProfiles] = await Promise.all([
      tutorIds.length > 0 
        ? db.select().from(tutors).where(inArray(tutors.id, tutorIds))
        : Promise.resolve([]),
      studentIds.length > 0
        ? db.select().from(students).where(inArray(students.id, studentIds))
        : Promise.resolve([]),
    ]);

    const tutorUserIds = tutorProfiles.map(t => t.userId);
    const studentUserIds = studentProfiles.map(s => s.userId);
    const allUserIds = [...tutorUserIds, ...studentUserIds];

    const usersData = allUserIds.length > 0
      ? await db.select().from(users).where(inArray(users.id, allUserIds))
      : [];

    // Create maps for quick lookup
    const tutorMap = new Map(tutorProfiles.map(t => [t.id, t]));
    const studentMap = new Map(studentProfiles.map(s => [s.id, s]));
    const userMap = new Map(usersData.map(u => [u.id, u]));

    // Enhance enrollments with user data
    const enrichedEnrollments = eligibleEnrollments.map(item => {
      const tutor = tutorMap.get(item.enrollment.tutorId);
      const student = studentMap.get(item.enrollment.studentId);
      const tutorUser = tutor ? userMap.get(tutor.userId) : null;
      const studentUser = student ? userMap.get(student.userId) : null;

      return {
        enrollment: {
          id: item.enrollment.id,
          totalSessions: item.enrollment.totalSessions,
          completedSessions: item.enrollment.completedSessions,
          pricePerSession: item.enrollment.pricePerSession,
          totalAmount: item.enrollment.totalAmount,
          status: item.enrollment.status,
          startDate: item.enrollment.startDate,
        },
        tutor: tutorUser ? {
          id: tutor!.id,
          fullName: tutorUser.fullName,
          userId: tutor!.userId,
        } : null,
        student: studentUser ? {
          id: student!.id,
          fullName: studentUser.fullName,
          userId: student!.userId,
        } : null,
        escrow: item.escrow,
        reason: item.reason,
        firstSessionDate: item.firstSessionDate,
        lastSessionDate: item.lastSessionDate,
      };
    });

    // Sắp xếp theo thời gian buổi học đầu tiên (cũ nhất trước)
    enrichedEnrollments.sort((a, b) => {
      const dateA = a.firstSessionDate ? new Date(a.firstSessionDate).getTime() : 0;
      const dateB = b.firstSessionDate ? new Date(b.firstSessionDate).getTime() : 0;
      return dateA - dateB;
    });

    return NextResponse.json({
      success: true,
      count: enrichedEnrollments.length,
      enrollments: enrichedEnrollments,
      summary: {
        totalToRelease: enrichedEnrollments.reduce((sum, e) => sum + e.escrow.amountToRelease, 0),
        totalPlatformFee: enrichedEnrollments.reduce((sum, e) => sum + e.escrow.platformFee, 0),
        totalTutorAmount: enrichedEnrollments.reduce((sum, e) => sum + e.escrow.tutorAmount, 0),
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching eligible enrollments:', error);

    return NextResponse.json(
      { error: 'Lỗi lấy danh sách lớp đủ điều kiện thanh toán' },
      { status: 500 }
    );
  }
}
