/**
 * API: Admin hoàn trả tiền cho học viên
 * POST /api/admin/refund/[id]
 *
 * Khi học viên muốn hủy lớp:
 * - Tính toán số tiền hoàn lại dựa trên số buổi đã học
 * - Trừ phí nền tảng
 * - Tạo student credit để học viên có thể dùng cho lớp mới
 * - Hoặc hoàn tiền trực tiếp (tùy chọn)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  classEnrollments,
  sessionRecords,
  payments,
  escrowPayments,
  studentCredits,
  wallets,
  walletTransactions,
  auditLogs,
  users,
  students,
} from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';

// Middleware: Kiểm tra admin authentication
function getAdminUserIdFromRequest(request: NextRequest): number | null {
  const userId = request.headers.get('x-user-id');
  if (!userId) return null;
  // TODO: Verify user is admin
  return parseInt(userId);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const enrollmentId = parseInt(params.id);
    const { refundType, reason } = await request.json();
    // refundType: 'credit' (tạo credit) hoặc 'direct' (hoàn tiền trực tiếp)

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

    // 2. Lấy thông tin enrollment
    const enrollment = await db
      .select()
      .from(classEnrollments)
      .where(eq(classEnrollments.id, enrollmentId))
      .limit(1);

    if (!enrollment.length) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    const enrollmentData = enrollment[0];

    // Kiểm tra status - chỉ refund cho lớp chưa hoàn thành
    if (enrollmentData.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot refund completed class' },
        { status: 400 }
      );
    }

    if (enrollmentData.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Class already cancelled' },
        { status: 400 }
      );
    }

    // 3. Lấy payment và escrow
    const payment = await db
      .select()
      .from(payments)
      .where(eq(payments.enrollmentId, enrollmentId))
      .limit(1);

    if (!payment.length) {
      return NextResponse.json(
        { error: 'Payment not found for this enrollment' },
        { status: 404 }
      );
    }

    const paymentData = payment[0];

    // Kiểm tra payment đã được refund chưa
    if (paymentData.status === 'refunded') {
      return NextResponse.json(
        { error: 'Payment already refunded' },
        { status: 400 }
      );
    }

    const escrow = await db
      .select()
      .from(escrowPayments)
      .where(eq(escrowPayments.enrollmentId, enrollmentId))
      .limit(1);

    if (!escrow.length) {
      return NextResponse.json(
        { error: 'Escrow not found for this enrollment' },
        { status: 404 }
      );
    }

    const escrowData = escrow[0];

    // 4. Lấy danh sách sessions đã hoàn thành
    const sessions = await db
      .select()
      .from(sessionRecords)
      .where(eq(sessionRecords.enrollmentId, enrollmentId));

    const completedSessions = sessions.filter((s) => s.status === 'completed');

    // 5. Tính toán số tiền hoàn lại
    const totalPaid = paymentData.amount;
    const pricePerSession = enrollmentData.pricePerSession;
    const completedCount = completedSessions.length;

    // Tiền của các buổi đã học
    const amountForCompletedSessions = pricePerSession * completedCount;

    // Phí nền tảng cho các buổi đã học
    const commissionRate = escrowData.commissionRate;
    const platformFeeForCompleted = Math.floor(
      (amountForCompletedSessions * commissionRate) / 100
    );

    // Số tiền hoàn lại = Tổng tiền đã trả - Tiền buổi đã học - Phí nền tảng
    const refundAmount = Math.max(
      0,
      totalPaid - amountForCompletedSessions - platformFeeForCompleted
    );

    // Kiểm tra nếu không có tiền hoàn lại
    if (refundAmount <= 0) {
      return NextResponse.json(
        {
          error: 'No refund available',
          message:
            'Số buổi đã học tương ứng với số tiền đã thanh toán. Không có tiền hoàn lại.',
        },
        { status: 400 }
      );
    }

    // 6. Thực hiện hoàn tiền trong transaction
    await db.transaction(async (tx) => {
      // 6.1. Cập nhật enrollment status
      await tx
        .update(classEnrollments)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(classEnrollments.id, enrollmentId));

      // 6.2. Cập nhật payment status
      await tx
        .update(payments)
        .set({
          status: 'refunded',
          refundedAt: new Date(),
          refundReason: reason || 'Admin approved refund',
          updatedAt: new Date(),
        })
        .where(eq(payments.id, paymentData.id));

      // 6.3. Cập nhật escrow status
      await tx
        .update(escrowPayments)
        .set({
          status: 'refunded',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(escrowPayments.id, escrowData.id));

      if (refundType === 'credit') {
        // 6.4a. Tạo student credit
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 6); // Hết hạn sau 6 tháng

        await tx.insert(studentCredits).values({
          studentId: enrollmentData.studentId,
          sourceEnrollmentId: enrollmentId,
          amount: refundAmount,
          usedAmount: 0,
          remainingAmount: refundAmount,
          status: 'active',
          expiresAt: expiryDate,
          reason: reason || 'Hoàn tiền từ lớp bị hủy',
        });
      } else if (refundType === 'direct') {
        // 6.4b. Hoàn tiền trực tiếp (ghi nhận vào audit log)
        // Trong thực tế, cần tích hợp với cổng thanh toán để hoàn tiền
        // Ở đây chỉ ghi nhận log
        await tx.insert(auditLogs).values({
          userId: adminUserId,
          action: 'direct_refund',
          entityType: 'payment',
          entityId: paymentData.id,
          changes: JSON.stringify({
            enrollmentId,
            refundAmount,
            reason,
            refundType: 'direct',
          }),
        });
      }

      // 6.5. Tạo audit log
      await tx.insert(auditLogs).values({
        userId: adminUserId,
        action: 'enrollment_refunded',
        entityType: 'enrollment',
        entityId: enrollmentId,
        changes: JSON.stringify({
          totalPaid,
          completedSessions: completedCount,
          amountForCompletedSessions,
          platformFeeForCompleted,
          refundAmount,
          refundType,
          reason,
        }),
      });

      // 6.6. Trả lại tiền chưa release cho platform wallet
      const unreleasedAmount = escrowData.totalAmount - escrowData.releasedAmount;
      if (unreleasedAmount > 0) {
        // Lấy platform wallet
        const platformWallet = await tx
          .select()
          .from(wallets)
          .where(
            and(eq(wallets.ownerId, 0), eq(wallets.ownerType, 'platform'))
          )
          .limit(1);

        if (platformWallet.length) {
          const wallet = platformWallet[0];

          // Cập nhật platform wallet (trả lại tiền vào available)
          await tx
            .update(wallets)
            .set({
              availableBalance: wallet.availableBalance - unreleasedAmount,
              updatedAt: new Date(),
            })
            .where(eq(wallets.id, wallet.id));

          // Ghi nhận transaction
          await tx.insert(walletTransactions).values({
            walletId: wallet.id,
            type: 'refund',
            amount: -unreleasedAmount,
            balanceBefore: wallet.availableBalance,
            balanceAfter: wallet.availableBalance - unreleasedAmount,
            relatedId: enrollmentId,
            relatedType: 'enrollment',
            description: `Refund for enrollment #${enrollmentId}`,
            performedBy: adminUserId,
          });
        }
      }
    });

    // 7. Trả về response
    return NextResponse.json({
      success: true,
      message: `Refund processed successfully`,
      data: {
        enrollmentId,
        refundAmount,
        refundType,
        completedSessions: completedSessions.length,
        totalPaid,
        amountForCompletedSessions: pricePerSession * completedSessions.length,
        platformFee: platformFeeForCompleted,
      },
    });
  } catch (error: any) {
    console.error('[API Error] POST /api/admin/refund/[id]:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
