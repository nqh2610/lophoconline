/**
 * API: Admin Dashboard - Tổng quan hệ thống
 * GET /api/admin/dashboard/overview
 *
 * Trả về:
 * - Danh sách tất cả enrollments với thông tin chi tiết
 * - Thông tin giáo viên và học viên
 * - Trạng thái thanh toán, escrow
 * - Buổi học đã hoàn thành
 * - Các yêu cầu cần xử lý (refund, payout)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  classEnrollments,
  sessionRecords,
  payments,
  escrowPayments,
  wallets,
  students,
  tutors,
  users,
  subjects,
  gradeLevels,
  payoutRequests,
} from '@/lib/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

// Middleware: Kiểm tra admin authentication
function getAdminUserIdFromRequest(request: NextRequest): number | null {
  const userId = request.headers.get('x-user-id');
  if (!userId) return null;
  return parseInt(userId);
}

export async function GET(request: NextRequest) {
  try {
    // 1. Xác thực admin
    const adminUserId = getAdminUserIdFromRequest(request);
    if (!adminUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await db
      .select()
      .from(users)
      .where(eq(users.id, adminUserId))
      .limit(1);

    if (!admin.length || admin[0].role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Lấy URL search params
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status'); // filter by status
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 3. Build query conditions
    let conditions = sql`1=1`;
    if (status) {
      conditions = sql`${classEnrollments.status} = ${status}`;
    }

    // 4. Lấy danh sách enrollments
    // ✅ FIXED: Join với users table để lấy fullName, avatar, phone
    // Note: Drizzle doesn't support table aliases well, so we'll query base data first
    // then enrich with user info in a second step
    
    const enrollments = await db
      .select({
        enrollmentId: classEnrollments.id,
        studentId: classEnrollments.studentId,
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
        // IDs to lookup user info
        studentUserId: students.userId,
        tutorUserId: tutors.userId,
        // Subject & Grade
        subjectName: subjects.name,
        gradeLevelName: gradeLevels.name,
      })
      .from(classEnrollments)
      .leftJoin(students, eq(classEnrollments.studentId, students.id))
      .leftJoin(tutors, eq(classEnrollments.tutorId, tutors.id))
      .leftJoin(subjects, eq(classEnrollments.subjectId, subjects.id))
      .leftJoin(gradeLevels, eq(classEnrollments.gradeLevelId, gradeLevels.id))
      .where(conditions)
      .orderBy(desc(classEnrollments.createdAt))
      .limit(limit)
      .offset(offset);

    // Get all unique user IDs to fetch in one query
    const userIds = new Set<number>();
    enrollments.forEach(e => {
      if (e.studentUserId) userIds.add(e.studentUserId);
      if (e.tutorUserId) userIds.add(e.tutorUserId);
    });

    // Fetch all user data at once
    const userDataMap = new Map<number, any>();
    if (userIds.size > 0) {
      const userData = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          avatar: users.avatar,
          phone: users.phone,
        })
        .from(users)
        .where(sql`${users.id} IN (${Array.from(userIds).join(',')})`);
      
      userData.forEach(u => userDataMap.set(u.id, u));
    }

    // 5. Lấy thông tin chi tiết cho từng enrollment
    const enrollmentDetails = await Promise.all(
      enrollments.map(async (enrollment) => {
        // Get user info from map
        const studentUser = enrollment.studentUserId ? userDataMap.get(enrollment.studentUserId) : null;
        const tutorUser = enrollment.tutorUserId ? userDataMap.get(enrollment.tutorUserId) : null;

        // 5.1. Payment info
        const payment = await db
          .select()
          .from(payments)
          .where(eq(payments.enrollmentId, enrollment.enrollmentId))
          .limit(1);

        const paymentInfo = payment.length ? payment[0] : null;

        // 5.2. Escrow info
        const escrow = await db
          .select()
          .from(escrowPayments)
          .where(eq(escrowPayments.enrollmentId, enrollment.enrollmentId))
          .limit(1);

        const escrowInfo = escrow.length ? escrow[0] : null;

        // 5.3. Sessions
        const sessions = await db
          .select()
          .from(sessionRecords)
          .where(eq(sessionRecords.enrollmentId, enrollment.enrollmentId))
          .orderBy(sessionRecords.sessionNumber);

        const completedSessionsList = sessions.filter(
          (s) => s.status === 'completed'
        );
        const paidSessions = sessions.filter(
          (s) =>
            s.status === 'completed' &&
            s.releasedAmount &&
            s.releasedAmount > 0
        );

        // 5.4. Tính toán tiền
        const totalPaidToTutor = paidSessions.reduce(
          (sum, s) => sum + (s.releasedAmount || 0),
          0
        );

        const totalPendingRelease = escrowInfo
          ? escrowInfo.totalAmount - escrowInfo.releasedAmount
          : 0;

        const commissionRate = escrowInfo ? escrowInfo.commissionRate : 15;
        const platformFeeEarned = escrowInfo ? escrowInfo.platformFee : 0;

        // Kiểm tra điều kiện đủ để duyệt thanh toán
        let eligibleForPayout = false;
        let eligibilityReason = '';

        if (
          enrollment.status === 'active' &&
          completedSessionsList.length > 0
        ) {
          const firstSession = completedSessionsList[0];
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

          if (firstSession && new Date(firstSession.date) <= oneMonthAgo) {
            eligibleForPayout = true;
            eligibilityReason = 'Đã học đủ 1 tháng';
          }
        }

        if (enrollment.status === 'completed') {
          eligibleForPayout = true;
          eligibilityReason = 'Lớp đã kết thúc';
        }

        return {
          enrollmentId: enrollment.enrollmentId,
          student: {
            id: enrollment.studentId,
            userId: enrollment.studentUserId,
            name: studentUser?.fullName || 'N/A',
            avatar: studentUser?.avatar,
            phone: studentUser?.phone,
          },
          tutor: {
            id: enrollment.tutorId,
            userId: enrollment.tutorUserId,
            name: tutorUser?.fullName || 'N/A',
            avatar: tutorUser?.avatar,
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
          createdAt: enrollment.createdAt,
          payment: paymentInfo
            ? {
                id: paymentInfo.id,
                amount: paymentInfo.amount,
                method: paymentInfo.method,
                gateway: paymentInfo.gateway,
                status: paymentInfo.status,
                transactionCode: paymentInfo.transactionCode,
                paidAt: paymentInfo.paidAt,
              }
            : null,
          escrow: escrowInfo
            ? {
                id: escrowInfo.id,
                totalAmount: escrowInfo.totalAmount,
                releasedAmount: escrowInfo.releasedAmount,
                platformFee: escrowInfo.platformFee,
                commissionRate: escrowInfo.commissionRate,
                status: escrowInfo.status,
              }
            : null,
          financial: {
            totalPaidToTutor,
            totalPendingRelease,
            platformFeeEarned,
            commissionRate,
          },
          eligibleForPayout,
          eligibilityReason,
          sessionsCount: {
            total: sessions.length,
            completed: completedSessionsList.length,
            paid: paidSessions.length,
            pending: completedSessionsList.length - paidSessions.length,
          },
        };
      })
    );

    // 6. Lấy danh sách payout requests đang chờ
    const pendingPayouts = await db
      .select({
        payoutId: payoutRequests.id,
        tutorId: payoutRequests.tutorId,
        amount: payoutRequests.amount,
        bankName: payoutRequests.bankName,
        bankAccount: payoutRequests.bankAccount,
        bankAccountName: payoutRequests.bankAccountName,
        status: payoutRequests.status,
        requestNote: payoutRequests.requestNote,
        createdAt: payoutRequests.createdAt,
        tutorUserId: tutors.userId,
      })
      .from(payoutRequests)
      .leftJoin(tutors, eq(payoutRequests.tutorId, tutors.id))
      .where(eq(payoutRequests.status, 'pending'))
      .orderBy(desc(payoutRequests.createdAt))
      .limit(20);

    // Get tutor user info for payouts
    const payoutTutorUserIds = pendingPayouts
      .map(p => p.tutorUserId)
      .filter((id): id is number => id !== null);
    
    const payoutTutorUsers = new Map<number, any>();
    if (payoutTutorUserIds.length > 0) {
      const tutorUserData = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          avatar: users.avatar,
        })
        .from(users)
        .where(sql`${users.id} IN (${payoutTutorUserIds.join(',')})`);
      
      tutorUserData.forEach(u => payoutTutorUsers.set(u.id, u));
    }

    // 7. Tính toán tổng quan hệ thống
    const totalRevenue = enrollmentDetails.reduce(
      (sum, e) => sum + (e.payment?.amount || 0),
      0
    );

    const totalPlatformFee = enrollmentDetails.reduce(
      (sum, e) => sum + e.financial.platformFeeEarned,
      0
    );

    const totalPaidToTutors = enrollmentDetails.reduce(
      (sum, e) => sum + e.financial.totalPaidToTutor,
      0
    );

    const totalPendingRelease = enrollmentDetails.reduce(
      (sum, e) => sum + e.financial.totalPendingRelease,
      0
    );

    const enrollmentsEligibleForPayout = enrollmentDetails.filter(
      (e) => e.eligibleForPayout
    ).length;

    // 8. Lấy platform wallet
    const platformWallet = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.ownerId, 0), eq(wallets.ownerType, 'platform')))
      .limit(1);

    const platformWalletInfo = platformWallet.length
      ? platformWallet[0]
      : null;

    // 9. Trả về response
    return NextResponse.json({
      success: true,
      data: {
        // Tổng quan hệ thống
        summary: {
          totalEnrollments: enrollmentDetails.length,
          totalRevenue, // Tổng doanh thu
          totalPlatformFee, // Hoa hồng nền tảng đã thu
          totalPaidToTutors, // Đã trả cho giáo viên
          totalPendingRelease, // Đang giữ trong escrow
          enrollmentsEligibleForPayout, // Số lớp đủ điều kiện thanh toán
          pendingPayoutRequests: pendingPayouts.length, // Số yêu cầu rút tiền chờ duyệt
        },

        // Platform wallet
        platformWallet: platformWalletInfo
          ? {
              availableBalance: platformWalletInfo.availableBalance,
              pendingBalance: platformWalletInfo.pendingBalance,
              totalEarned: platformWalletInfo.totalEarned,
            }
          : null,

        // Chi tiết enrollments
        enrollments: enrollmentDetails,

        // Payout requests đang chờ
        pendingPayouts: pendingPayouts.map((p) => {
          const tutorUser = p.tutorUserId ? payoutTutorUsers.get(p.tutorUserId) : null;
          return {
            id: p.payoutId,
            tutor: {
              id: p.tutorId,
              name: tutorUser?.fullName || 'N/A',
              avatar: tutorUser?.avatar,
            },
            amount: p.amount,
            bankName: p.bankName,
            bankAccount: p.bankAccount,
            bankAccountName: p.bankAccountName,
            status: p.status,
            requestNote: p.requestNote,
            createdAt: p.createdAt,
          };
        }),

        // Pagination info
        pagination: {
          limit,
          offset,
          hasMore: enrollmentDetails.length === limit,
        },
      },
    });
  } catch (error: any) {
    console.error('[API Error] GET /api/admin/dashboard/overview:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
