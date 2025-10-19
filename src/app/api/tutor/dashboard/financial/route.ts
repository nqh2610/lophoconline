/**
 * API: Dashboard tài chính của gia sư
 * GET /api/tutor/dashboard/financial
 *
 * Trả về:
 * - Danh sách các lớp đang dạy với thông tin buổi học, tiền đã nhận
 * - Tổng doanh thu theo từng lớp
 * - Tổng doanh thu tất cả các lớp
 * - Số dư ví (available, pending, withdrawn)
 * - Lịch sử thanh toán đã nhận
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  classEnrollments,
  sessionRecords,
  wallets,
  walletTransactions,
  escrowPayments,
  students,
  users,
  subjects,
  gradeLevels,
} from '@/lib/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

// Middleware: Kiểm tra authentication (giả định user đã login)
// Trong production, cần implement JWT/session authentication
function getUserIdFromRequest(request: NextRequest): number | null {
  // TODO: Implement proper authentication
  // For now, get from header or cookie
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

    // 2. Kiểm tra user có phải tutor không
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length || user[0].role !== 'tutor') {
      return NextResponse.json(
        { error: 'Forbidden - User is not a tutor' },
        { status: 403 }
      );
    }

    // 3. Lấy thông tin ví của gia sư
    let wallet = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.ownerId, userId), eq(wallets.ownerType, 'tutor')))
      .limit(1);

    // Nếu chưa có ví, tạo mới
    if (!wallet.length) {
      const [newWallet] = await db.insert(wallets).values({
        ownerId: userId,
        ownerType: 'tutor',
        availableBalance: 0,
        pendingBalance: 0,
        withdrawnBalance: 0,
        totalEarned: 0,
      });

      wallet = await db
        .select()
        .from(wallets)
        .where(eq(wallets.id, newWallet.insertId))
        .limit(1);
    }

    const tutorWallet = wallet[0];

    // 4. Lấy danh sách tất cả các lớp của gia sư (active, completed)
    const enrollments = await db
      .select({
        enrollmentId: classEnrollments.id,
        studentId: classEnrollments.studentId,
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
        studentName: students.fullName,
        studentAvatar: students.avatar,
        subjectName: subjects.name,
        gradeLevelName: gradeLevels.name,
      })
      .from(classEnrollments)
      .leftJoin(students, eq(classEnrollments.studentId, students.id))
      .leftJoin(subjects, eq(classEnrollments.subjectId, subjects.id))
      .leftJoin(gradeLevels, eq(classEnrollments.gradeLevelId, gradeLevels.id))
      .where(
        and(
          eq(classEnrollments.tutorId, userId),
          sql`${classEnrollments.status} IN ('active', 'completed')`
        )
      )
      .orderBy(desc(classEnrollments.createdAt));

    // 5. Tính toán chi tiết cho từng lớp
    const classDetails = await Promise.all(
      enrollments.map(async (enrollment) => {
        // 5.1. Lấy tất cả session records của lớp này
        const sessions = await db
          .select()
          .from(sessionRecords)
          .where(eq(sessionRecords.enrollmentId, enrollment.enrollmentId))
          .orderBy(sessionRecords.sessionNumber);

        // 5.2. Lấy escrow payment info
        const escrow = await db
          .select()
          .from(escrowPayments)
          .where(eq(escrowPayments.enrollmentId, enrollment.enrollmentId))
          .limit(1);

        const escrowInfo = escrow.length ? escrow[0] : null;

        // 5.3. Tính toán số tiền
        const completedSessionsList = sessions.filter(
          (s) => s.status === 'completed'
        );
        const paidSessions = sessions.filter(
          (s) => s.status === 'completed' && s.releasedAmount && s.releasedAmount > 0
        );

        // Tổng tiền đã được admin duyệt trả cho lớp này
        const totalPaidAmount = paidSessions.reduce(
          (sum, s) => sum + (s.releasedAmount || 0),
          0
        );

        // Tổng tiền đang chờ duyệt (buổi đã học nhưng chưa được trả)
        const totalPendingAmount = escrowInfo
          ? escrowInfo.totalAmount - escrowInfo.releasedAmount
          : 0;

        // Commission rate
        const commissionRate = escrowInfo ? escrowInfo.commissionRate : 15;
        const platformFeeTotal = Math.floor(
          (totalPaidAmount * commissionRate) / 100
        );
        const netEarned = totalPaidAmount - platformFeeTotal;

        return {
          enrollmentId: enrollment.enrollmentId,
          student: {
            id: enrollment.studentId,
            name: enrollment.studentName || 'N/A',
            avatar: enrollment.studentAvatar,
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
            releasedAmount: s.releasedAmount || 0,
            isPaid: s.releasedAmount && s.releasedAmount > 0,
            completedAt: s.completedAt,
          })),
          financial: {
            totalPaidAmount, // Tổng tiền đã nhận cho lớp này
            totalPendingAmount, // Tiền đang chờ duyệt
            platformFee: platformFeeTotal,
            netEarned, // Tiền thực nhận (đã trừ hoa hồng)
            commissionRate,
          },
        };
      })
    );

    // 6. Tính tổng doanh thu tất cả các lớp
    const totalEarnedAllClasses = classDetails.reduce(
      (sum, cls) => sum + cls.financial.netEarned,
      0
    );
    const totalPendingAllClasses = classDetails.reduce(
      (sum, cls) => sum + cls.financial.totalPendingAmount,
      0
    );
    const totalPlatformFeeAllClasses = classDetails.reduce(
      (sum, cls) => sum + cls.financial.platformFee,
      0
    );

    // 7. Lấy lịch sử giao dịch ví (10 giao dịch gần nhất)
    const recentTransactions = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.walletId, tutorWallet.id))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(10);

    // 8. Trả về response
    return NextResponse.json({
      success: true,
      data: {
        // Thông tin ví
        wallet: {
          availableBalance: tutorWallet.availableBalance, // Tiền có thể rút
          pendingBalance: tutorWallet.pendingBalance, // Tiền đang chờ (30 ngày)
          withdrawnBalance: tutorWallet.withdrawnBalance, // Đã rút
          totalEarned: tutorWallet.totalEarned, // Tổng thu nhập lịch sử
          lastPayoutDate: tutorWallet.lastPayoutDate,
        },

        // Tổng quan tài chính
        summary: {
          totalEarnedAllClasses, // Tổng doanh thu thực tế (đã trừ hoa hồng)
          totalPendingAllClasses, // Tổng tiền đang chờ duyệt
          totalPlatformFeeAllClasses, // Tổng hoa hồng nền tảng
          totalClassesActive: classDetails.filter((c) => c.status === 'active')
            .length,
          totalClassesCompleted: classDetails.filter(
            (c) => c.status === 'completed'
          ).length,
        },

        // Chi tiết từng lớp
        classes: classDetails,

        // Lịch sử giao dịch
        recentTransactions: recentTransactions.map((tx) => ({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          balanceBefore: tx.balanceBefore,
          balanceAfter: tx.balanceAfter,
          description: tx.description,
          createdAt: tx.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('[API Error] GET /api/tutor/dashboard/financial:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
