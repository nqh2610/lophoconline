import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { payments, escrowPayments, wallets, walletTransactions, sessionRecords } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

/**
 * API: Admin duyệt thanh toán cho enrollment
 * POST /api/admin/enrollments/[id]/process-payout
 *
 * QUAN TRỌNG:
 * - Chỉ admin mới được phép
 * - Tính tiền dựa trên số buổi học THỰC TẾ đã hoàn thành
 * - Tự động tính phí hoa hồng cho nền tảng
 * - Chia tiền cho gia sư
 * - Ghi đầy đủ audit logs
 *
 * Flow:
 * 1. Admin xem danh sách từ /api/admin/enrollments/eligible-for-payout
 * 2. Admin review từng trường hợp
 * 3. Admin duyệt thanh toán
 * 4. Hệ thống tự động:
 *    - Tính số tiền dựa trên buổi thực tế
 *    - Trừ phí nền tảng (commission_rate%)
 *    - Cộng vào wallet gia sư (pending hoặc available)
 *    - Cộng vào wallet platform
 *    - Ghi wallet transactions
 *    - Cập nhật escrow status
 */

const processPayoutSchema = z.object({
  releaseToAvailable: z.boolean().optional(), // true = available ngay, false = pending 30 ngày
  adminNote: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Xác thực admin
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Vui lòng đăng nhập' },
        { status: 401 }
      );
    }

    const user = await storage.getUserById(session.user.id);

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Chỉ admin mới có quyền duyệt thanh toán' },
        { status: 403 }
      );
    }

    // 2. Parse input
    const enrollmentId = parseInt(params.id);
    const body = await request.json();
    const { releaseToAvailable = false, adminNote } = processPayoutSchema.parse(body);

    // 3. Lấy enrollment
    const enrollment = await storage.getEnrollmentById(enrollmentId);

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment không tồn tại' },
        { status: 404 }
      );
    }

    // 4. Lấy escrow payment
    const payment = await db
      .select()
      .from(payments)
      .where(eq(payments.enrollmentId, enrollmentId))
      .limit(1);

    if (payment.length === 0) {
      return NextResponse.json(
        { error: 'Payment không tồn tại - Lớp chưa được thanh toán' },
        { status: 404 }
      );
    }

    const escrow = await storage.getEscrowByPaymentId(payment[0].id);

    if (!escrow) {
      return NextResponse.json(
        { error: 'Escrow không tồn tại' },
        { status: 404 }
      );
    }

    // 5. Lấy sessions đã hoàn thành
    const sessions = await storage.getSessionsByEnrollment(enrollmentId);
    const completedSessions = sessions.filter(s => s.status === 'completed');

    if (completedSessions.length === 0) {
      return NextResponse.json(
        { error: 'Chưa có buổi học nào hoàn thành' },
        { status: 400 }
      );
    }

    // 6. Tính toán số tiền
    const completedCount = completedSessions.length;
    const amountPerSession = Math.floor(enrollment.totalAmount / enrollment.totalSessions);
    const totalAmountForCompletedSessions = amountPerSession * completedCount;

    // Số tiền đã release trước đó
    const alreadyReleased = escrow.releasedAmount || 0;
    const amountToRelease = totalAmountForCompletedSessions - alreadyReleased;

    if (amountToRelease <= 0) {
      return NextResponse.json(
        { error: 'Không còn số tiền nào để release (đã release hết)' },
        { status: 400 }
      );
    }

    // Tính phí nền tảng và tiền gia sư
    const commissionRate = escrow.commissionRate || 15;
    const platformFee = Math.floor((amountToRelease * commissionRate) / 100);
    const tutorAmount = amountToRelease - platformFee;

    // 7. ATOMIC TRANSACTION - Chia tiền
    await db.transaction(async (tx) => {
      // 7.1. Cập nhật escrow
      await tx
        .update(escrowPayments)
        .set({
          releasedAmount: escrow.releasedAmount + amountToRelease,
          platformFee: escrow.platformFee + platformFee,
          lastReleaseDate: new Date(),
          status: (escrow.releasedAmount + amountToRelease >= escrow.totalAmount)
            ? 'completed'
            : 'in_progress',
        })
        .where(eq(escrowPayments.id, escrow.id));

      // 7.2. Lấy hoặc tạo wallet gia sư
      let tutorWallet = await storage.getWalletByOwner(enrollment.tutorId, 'tutor');

      if (!tutorWallet) {
        tutorWallet = await storage.createWallet({
          ownerId: enrollment.tutorId,
          ownerType: 'tutor',
        });
      }

      // 7.3. Cập nhật wallet gia sư
      if (releaseToAvailable) {
        // Thêm vào available ngay (admin tin tưởng)
        await tx
          .update(wallets)
          .set({
            availableBalance: tutorWallet.availableBalance + tutorAmount,
            totalEarned: tutorWallet.totalEarned + tutorAmount,
            lastPayoutDate: new Date(),
          })
          .where(eq(wallets.id, tutorWallet.id));
      } else {
        // Thêm vào pending (chờ 30 ngày)
        await tx
          .update(wallets)
          .set({
            pendingBalance: tutorWallet.pendingBalance + tutorAmount,
            totalEarned: tutorWallet.totalEarned + tutorAmount,
          })
          .where(eq(wallets.id, tutorWallet.id));
      }

      // 7.4. Ghi wallet transaction (tutor)
      await tx.insert(walletTransactions).values({
        walletId: tutorWallet.id,
        type: 'escrow_release',
        amount: tutorAmount,
        balanceBefore: releaseToAvailable
          ? tutorWallet.availableBalance
          : tutorWallet.pendingBalance,
        balanceAfter: releaseToAvailable
          ? tutorWallet.availableBalance + tutorAmount
          : tutorWallet.pendingBalance + tutorAmount,
        relatedId: enrollmentId,
        relatedType: 'enrollment',
        description: `Thanh toán ${completedCount} buổi học - ${adminNote || 'Admin approved'}`,
        performedBy: session.user.id,
      });

      // 7.5. Lấy hoặc tạo wallet platform
      let platformWallet = await storage.getWalletByOwner(0, 'platform');

      if (!platformWallet) {
        platformWallet = await storage.createWallet({
          ownerId: 0,
          ownerType: 'platform',
        });
      }

      // 7.6. Cập nhật wallet platform
      await tx
        .update(wallets)
        .set({
          availableBalance: platformWallet.availableBalance + platformFee,
          totalEarned: platformWallet.totalEarned + platformFee,
        })
        .where(eq(wallets.id, platformWallet.id));

      // 7.7. Ghi wallet transaction (platform)
      await tx.insert(walletTransactions).values({
        walletId: platformWallet.id,
        type: 'commission',
        amount: platformFee,
        balanceBefore: platformWallet.availableBalance,
        balanceAfter: platformWallet.availableBalance + platformFee,
        relatedId: enrollmentId,
        relatedType: 'enrollment',
        description: `Phí nền tảng ${commissionRate}% - ${completedCount} buổi học`,
        performedBy: session.user.id,
      });

      // 7.8. Cập nhật session records
      for (const session of completedSessions) {
        if (!session.releasedAmount || session.releasedAmount === 0) {
          await tx
            .update(sessionRecords)
            .set({
              releasedAmount: amountPerSession,
            })
            .where(eq(sessionRecords.id, session.id));
        }
      }
    });

    // 8. Gửi notification cho gia sư
    const tutor = await storage.getTutorById(enrollment.tutorId);

    if (tutor) {
      await storage.createNotification({
        userId: tutor.userId,
        type: 'payment',
        title: 'Admin đã duyệt thanh toán',
        message: `Bạn nhận được ${tutorAmount.toLocaleString('vi-VN')}đ cho ${completedCount} buổi học. ${
          releaseToAvailable
            ? 'Tiền đã vào số dư khả dụng, bạn có thể rút ngay.'
            : 'Tiền đang chờ 30 ngày trước khi có thể rút.'
        }`,
        link: `/tutor/wallet`,
        isRead: 0,
      });
    }

    // 9. Ghi audit log
    await storage.createAuditLog({
      userId: session.user.id,
      action: 'enrollment_payout_processed',
      entityType: 'enrollment',
      entityId: enrollmentId,
      changes: JSON.stringify({
        completedSessions: completedCount,
        amountToRelease,
        platformFee,
        tutorAmount,
        releaseToAvailable,
        adminNote,
      }),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      payout: {
        enrollmentId,
        completedSessions: completedCount,
        totalSessions: enrollment.totalSessions,
        amountPerSession,
        totalAmountReleased: amountToRelease,
        platformFee,
        tutorAmount,
        commissionRate,
        releaseToAvailable,
      },
      escrow: {
        totalAmount: escrow.totalAmount,
        releasedAmount: escrow.releasedAmount + amountToRelease,
        remainingAmount: escrow.totalAmount - (escrow.releasedAmount + amountToRelease),
        status: (escrow.releasedAmount + amountToRelease >= escrow.totalAmount)
          ? 'completed'
          : 'in_progress',
      },
      message: `Đã duyệt thanh toán thành công cho ${completedCount} buổi học`,
    }, { status: 200 });

  } catch (error) {
    console.error('Error processing payout:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Lỗi xử lý thanh toán' },
      { status: 500 }
    );
  }
}
