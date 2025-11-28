/**
 * API: Dashboard tài chính của học viên
 * GET /api/student/dashboard/financial
 *
 * Trả về:
 * - Danh sách các lớp đã đăng ký
 * - Số buổi đã học theo từng lớp
 * - Số tiền đã thanh toán theo từng lớp
 * - Số dư credit (tiền hoàn lại có thể dùng cho lớp mới)
 * - Lịch sử thanh toán
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  classEnrollments,
  sessionRecords,
  payments,
  escrowPayments,
  studentCredits,
  students,
  users,
  tutors,
  subjects,
  gradeLevels,
} from '@/lib/schema';
import { eq, and, sql, desc, gt } from 'drizzle-orm';

// Middleware: Kiểm tra authentication
function getUserIdFromRequest(request: NextRequest): number | null {
  const userId = request.headers.get('x-user-id');
  return userId ? parseInt(userId) : null;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Xác thực user
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - User not logged in' },
        { status: 401 }
      );
    }

    // 2. Lấy thông tin student
    const student = await db
      .select()
      .from(students)
      .where(eq(students.userId, userId))
      .limit(1);

    if (!student.length) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      );
    }

    const studentId = student[0].id;

    // 3. Lấy danh sách tất cả các lớp đã đăng ký
    const enrollments = await db
      .select({
        enrollmentId: classEnrollments.id,
        tutorId: classEnrollments.tutorId,
        subjectId: classEnrollments.subjectId,
        gradeLevelId: classEnrollments.gradeLevelId,
        totalSessions: classEnrollments.totalSessions,
        completedSessions: classEnrollments.completedSessions,
        pricePerSession: classEnrollments.pricePerSession,
        totalAmount: classEnrollments.totalAmount,
        status: classEnrollments.status,
        startDate: classEnrollments.startDate,
        endDate: classEnrollments.endDate,
        createdAt: classEnrollments.createdAt,
        tutorName: tutors.fullName,
        tutorAvatar: tutors.avatar,
        subjectName: subjects.name,
        gradeLevelName: gradeLevels.name,
      })
      .from(classEnrollments)
      .leftJoin(tutors, eq(classEnrollments.tutorId, tutors.id))
      .leftJoin(subjects, eq(classEnrollments.subjectId, subjects.id))
      .leftJoin(gradeLevels, eq(classEnrollments.gradeLevelId, gradeLevels.id))
      .where(eq(classEnrollments.studentId, studentId))
      .orderBy(desc(classEnrollments.createdAt));

    // 4. Tính toán chi tiết cho từng lớp
    const classDetails = await Promise.all(
      enrollments.map(async (enrollment) => {
        // 4.1. Lấy payment info
        const payment = await db
          .select()
          .from(payments)
          .where(eq(payments.enrollmentId, enrollment.enrollmentId))
          .limit(1);

        const paymentInfo = payment.length ? payment[0] : null;

        // 4.2. Lấy escrow info
        const escrow = await db
          .select()
          .from(escrowPayments)
          .where(eq(escrowPayments.enrollmentId, enrollment.enrollmentId))
          .limit(1);

        const escrowInfo = escrow.length ? escrow[0] : null;

        // 4.3. Lấy sessions
        const sessions = await db
          .select()
          .from(sessionRecords)
          .where(eq(sessionRecords.enrollmentId, enrollment.enrollmentId))
          .orderBy(sessionRecords.sessionNumber);

        const completedSessionsList = sessions.filter(
          (s) => s.status === 'completed'
        );

        // 4.4. Tính toán số tiền
        // Số tiền đã thanh toán ban đầu
        const amountPaid = paymentInfo ? paymentInfo.amount : 0;

        // Số tiền tương ứng với số buổi đã học
        const amountForCompletedSessions =
          enrollment.pricePerSession * completedSessionsList.length;

        // Số tiền đã được giải ngân cho giáo viên (không thể hoàn lại)
        const amountReleased = escrowInfo ? escrowInfo.releasedAmount : 0;

        // Số tiền có thể hoàn lại nếu hủy lớp
        // = Tiền đã trả - Tiền của các buổi đã học - Phí nền tảng
        const commissionRate = escrowInfo ? escrowInfo.commissionRate : 15;
        const platformFeeForCompleted = Math.floor(
          (amountForCompletedSessions * commissionRate) / 100
        );
        const refundableAmount = Math.max(
          0,
          amountPaid - amountForCompletedSessions - platformFeeForCompleted
        );

        return {
          enrollmentId: enrollment.enrollmentId,
          tutor: {
            id: enrollment.tutorId,
            name: enrollment.tutorName || 'N/A',
            avatar: enrollment.tutorAvatar,
          },
          subject: enrollment.subjectName || 'N/A',
          gradeLevel: enrollment.gradeLevelName || 'N/A',
          totalSessions: enrollment.totalSessions,
          completedSessions: enrollment.completedSessions,
          pricePerSession: enrollment.pricePerSession,
          totalAmount: enrollment.totalAmount,
          status: enrollment.status,
          startDate: enrollment.startDate,
          endDate: enrollment.endDate,
          sessions: sessions.map((s) => ({
            id: s.id,
            sessionNumber: s.sessionNumber,
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            status: s.status,
            tutorAttended: s.tutorAttended === 1,
            studentAttended: s.studentAttended === 1,
            completedAt: s.completedAt,
          })),
          financial: {
            amountPaid, // Tổng tiền đã trả
            amountForCompletedSessions, // Giá trị buổi đã học
            amountReleased, // Tiền đã trả cho giáo viên
            refundableAmount, // Tiền có thể hoàn lại nếu hủy
            commissionRate,
          },
          payment: paymentInfo
            ? {
                id: paymentInfo.id,
                method: paymentInfo.method,
                gateway: paymentInfo.gateway,
                status: paymentInfo.status,
                transactionCode: paymentInfo.transactionCode,
                paidAt: paymentInfo.paidAt,
              }
            : null,
        };
      })
    );

    // 5. Lấy danh sách student credits (tiền hoàn lại)
    const credits = await db
      .select({
        creditId: studentCredits.id,
        sourceEnrollmentId: studentCredits.sourceEnrollmentId,
        amount: studentCredits.amount,
        usedAmount: studentCredits.usedAmount,
        remainingAmount: studentCredits.remainingAmount,
        status: studentCredits.status,
        expiresAt: studentCredits.expiresAt,
        usedForEnrollmentId: studentCredits.usedForEnrollmentId,
        reason: studentCredits.reason,
        createdAt: studentCredits.createdAt,
      })
      .from(studentCredits)
      .where(
        and(
          eq(studentCredits.studentId, studentId),
          sql`${studentCredits.status} IN ('active', 'used')`
        )
      )
      .orderBy(desc(studentCredits.createdAt));

    // Tổng credit còn lại có thể sử dụng
    const totalActiveCredit = credits
      .filter((c) => c.status === 'active')
      .reduce((sum, c) => sum + (c.remainingAmount || 0), 0);

    // 6. Lấy lịch sử thanh toán
    const paymentHistory = await db
      .select({
        paymentId: payments.id,
        enrollmentId: payments.enrollmentId,
        amount: payments.amount,
        method: payments.method,
        gateway: payments.gateway,
        status: payments.status,
        transactionCode: payments.transactionCode,
        paidAt: payments.paidAt,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(eq(payments.studentId, studentId))
      .orderBy(desc(payments.createdAt))
      .limit(20);

    // 7. Tổng quan
    const totalPaid = paymentHistory
      .filter((p) => p.status === 'holding' || p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalRefunded = paymentHistory
      .filter((p) => p.status === 'refunded')
      .reduce((sum, p) => sum + p.amount, 0);

    // 8. Trả về response
    return NextResponse.json({
      success: true,
      data: {
        // Tổng quan tài chính
        summary: {
          totalPaid, // Tổng tiền đã thanh toán
          totalRefunded, // Tổng tiền đã hoàn lại
          totalActiveCredit, // Tổng credit có thể dùng
          totalClassesActive: classDetails.filter((c) => c.status === 'active')
            .length,
          totalClassesCompleted: classDetails.filter(
            (c) => c.status === 'completed'
          ).length,
          totalClassesCancelled: classDetails.filter(
            (c) => c.status === 'cancelled'
          ).length,
        },

        // Chi tiết từng lớp
        classes: classDetails,

        // Danh sách credits
        credits: credits.map((c) => ({
          id: c.creditId,
          sourceEnrollmentId: c.sourceEnrollmentId,
          amount: c.amount,
          usedAmount: c.usedAmount,
          remainingAmount: c.remainingAmount,
          status: c.status,
          expiresAt: c.expiresAt,
          usedForEnrollmentId: c.usedForEnrollmentId,
          reason: c.reason,
          createdAt: c.createdAt,
        })),

        // Lịch sử thanh toán
        paymentHistory: paymentHistory.map((p) => ({
          id: p.paymentId,
          enrollmentId: p.enrollmentId,
          amount: p.amount,
          method: p.method,
          gateway: p.gateway,
          status: p.status,
          transactionCode: p.transactionCode,
          paidAt: p.paidAt,
          createdAt: p.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('[API Error] GET /api/student/dashboard/financial:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
