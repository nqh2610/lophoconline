/**
 * ESCROW PAYMENT SYSTEM
 *
 * Hệ thống giữ tiền an toàn và phân phối tự động
 * - Giữ tiền học sinh trong escrow
 * - Tự động chia tiền sau mỗi buổi học
 * - Tính phí nền tảng chính xác
 * - Transaction atomicity (đảm bảo tính toàn vẹn)
 */

import { db } from './db';
import {
  escrowPayments,
  wallets,
  walletTransactions,
  sessionRecords,
  classEnrollments,
  payments,
  auditLogs,
  type EscrowPayment,
  type Wallet,
  type InsertWalletTransaction,
  type InsertAuditLog,
} from './schema';
import { eq, and, sql } from 'drizzle-orm';

// ==================== ESCROW CREATION ====================

/**
 * Tạo escrow payment sau khi thanh toán thành công
 * Gọi khi payment.status = 'holding'
 */
export async function createEscrow(params: {
  paymentId: number;
  enrollmentId: number;
  totalAmount: number;
  commissionRate?: number;
}): Promise<{ success: boolean; escrowId?: number; error?: string }> {
  const { paymentId, enrollmentId, totalAmount, commissionRate = 15 } = params;

  try {
    // Kiểm tra escrow đã tồn tại chưa
    const existingEscrow = await db
      .select()
      .from(escrowPayments)
      .where(eq(escrowPayments.paymentId, paymentId))
      .limit(1);

    if (existingEscrow.length > 0) {
      return {
        success: false,
        error: 'Escrow đã tồn tại cho payment này',
      };
    }

    // Tạo escrow
    const result = await db.insert(escrowPayments).values({
      paymentId,
      enrollmentId,
      totalAmount,
      commissionRate,
      releasedAmount: 0,
      platformFee: 0,
      status: 'holding',
    });

    const escrowId = Number(result[0].insertId);

    // Ghi audit log
    await logAudit({
      action: 'escrow_created',
      entityType: 'escrow_payment',
      entityId: escrowId,
      changes: JSON.stringify({
        paymentId,
        enrollmentId,
        totalAmount,
        commissionRate,
      }),
    });

    return {
      success: true,
      escrowId,
    };
  } catch (error) {
    console.error('Error creating escrow:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi tạo escrow',
    };
  }
}

// ==================== RELEASE PAYMENT ====================

/**
 * Giải ngân tiền sau buổi học
 * Tự động chia: tiền gia sư + phí nền tảng
 */
export async function releaseEscrow(params: {
  sessionId: number;
  performedBy?: number;
}): Promise<{
  success: boolean;
  tutorAmount?: number;
  platformFee?: number;
  error?: string;
}> {
  const { sessionId, performedBy } = params;

  try {
    // 1. Lấy thông tin session
    const session = await db
      .select()
      .from(sessionRecords)
      .where(eq(sessionRecords.id, sessionId))
      .limit(1);

    if (session.length === 0) {
      return { success: false, error: 'Session không tồn tại' };
    }

    const sessionData = session[0];

    // Kiểm tra session đã completed chưa
    if (sessionData.status !== 'completed') {
      return { success: false, error: 'Session chưa hoàn thành' };
    }

    // Kiểm tra đã release chưa
    if (sessionData.releasedAmount && sessionData.releasedAmount > 0) {
      return { success: false, error: 'Session đã được giải ngân' };
    }

    // 2. Lấy enrollment và escrow
    const enrollment = await db
      .select()
      .from(classEnrollments)
      .where(eq(classEnrollments.id, sessionData.enrollmentId))
      .limit(1);

    if (enrollment.length === 0) {
      return { success: false, error: 'Enrollment không tồn tại' };
    }

    const enrollmentData = enrollment[0];

    // 3. Lấy payment và escrow
    const payment = await db
      .select()
      .from(payments)
      .where(eq(payments.enrollmentId, enrollmentData.id))
      .limit(1);

    if (payment.length === 0) {
      return { success: false, error: 'Payment không tồn tại' };
    }

    const escrow = await db
      .select()
      .from(escrowPayments)
      .where(eq(escrowPayments.paymentId, payment[0].id))
      .limit(1);

    if (escrow.length === 0) {
      return { success: false, error: 'Escrow không tồn tại' };
    }

    const escrowData = escrow[0];

    // 4. Tính toán số tiền
    const amountPerSession = Math.floor(
      escrowData.totalAmount / enrollmentData.totalSessions
    );
    const platformFee = Math.floor((amountPerSession * escrowData.commissionRate) / 100);
    const tutorAmount = amountPerSession - platformFee;

    // Kiểm tra còn đủ tiền không
    const remainingAmount = escrowData.totalAmount - escrowData.releasedAmount;
    if (remainingAmount < amountPerSession) {
      return {
        success: false,
        error: 'Escrow không đủ số dư',
      };
    }

    // 5. Thực hiện TRANSACTION để đảm bảo atomic
    await db.transaction(async (tx) => {
      // 5.1. Cập nhật escrow
      await tx
        .update(escrowPayments)
        .set({
          releasedAmount: escrowData.releasedAmount + amountPerSession,
          platformFee: escrowData.platformFee + platformFee,
          lastReleaseDate: new Date(),
          status: 'in_progress',
        })
        .where(eq(escrowPayments.id, escrowData.id));

      // 5.2. Cập nhật session record
      await tx
        .update(sessionRecords)
        .set({
          releasedAmount: amountPerSession,
        })
        .where(eq(sessionRecords.id, sessionId));

      // 5.3. Cập nhật wallet gia sư (pending balance)
      const tutorWallet = await getOrCreateWallet(enrollmentData.tutorId, 'tutor');

      await tx
        .update(wallets)
        .set({
          pendingBalance: tutorWallet.pendingBalance + tutorAmount,
          totalEarned: tutorWallet.totalEarned + tutorAmount,
        })
        .where(eq(wallets.id, tutorWallet.id));

      // 5.4. Ghi wallet transaction (tutor)
      await tx.insert(walletTransactions).values({
        walletId: tutorWallet.id,
        type: 'escrow_release',
        amount: tutorAmount,
        balanceBefore: tutorWallet.pendingBalance,
        balanceAfter: tutorWallet.pendingBalance + tutorAmount,
        relatedId: sessionId,
        relatedType: 'session',
        description: `Giải ngân buổi học #${sessionData.sessionNumber}`,
        performedBy: performedBy || null,
      });

      // 5.5. Cập nhật wallet platform (commission)
      const platformWallet = await getOrCreateWallet(0, 'platform');

      await tx
        .update(wallets)
        .set({
          availableBalance: platformWallet.availableBalance + platformFee,
          totalEarned: platformWallet.totalEarned + platformFee,
        })
        .where(eq(wallets.id, platformWallet.id));

      // 5.6. Ghi wallet transaction (platform)
      await tx.insert(walletTransactions).values({
        walletId: platformWallet.id,
        type: 'commission',
        amount: platformFee,
        balanceBefore: platformWallet.availableBalance,
        balanceAfter: platformWallet.availableBalance + platformFee,
        relatedId: sessionId,
        relatedType: 'session',
        description: `Phí nền tảng ${escrowData.commissionRate}% - buổi #${sessionData.sessionNumber}`,
        performedBy: performedBy || null,
      });

      // 5.7. Kiểm tra nếu đã giải ngân hết
      const newReleasedAmount = escrowData.releasedAmount + amountPerSession;
      if (newReleasedAmount >= escrowData.totalAmount) {
        await tx
          .update(escrowPayments)
          .set({
            status: 'completed',
            completedAt: new Date(),
          })
          .where(eq(escrowPayments.id, escrowData.id));
      }
    });

    // 6. Ghi audit log
    await logAudit({
      userId: performedBy,
      action: 'escrow_released',
      entityType: 'session',
      entityId: sessionId,
      changes: JSON.stringify({
        escrowId: escrowData.id,
        amountPerSession,
        tutorAmount,
        platformFee,
      }),
    });

    return {
      success: true,
      tutorAmount,
      platformFee,
    };
  } catch (error) {
    console.error('Error releasing escrow:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi giải ngân',
    };
  }
}

// ==================== REFUND ====================

/**
 * Hoàn tiền khi hủy lớp
 * Hoàn phần chưa học
 */
export async function refundEscrow(params: {
  enrollmentId: number;
  reason: string;
  performedBy?: number;
}): Promise<{
  success: boolean;
  refundAmount?: number;
  error?: string;
}> {
  const { enrollmentId, reason, performedBy } = params;

  try {
    // 1. Lấy enrollment
    const enrollment = await db
      .select()
      .from(classEnrollments)
      .where(eq(classEnrollments.id, enrollmentId))
      .limit(1);

    if (enrollment.length === 0) {
      return { success: false, error: 'Enrollment không tồn tại' };
    }

    const enrollmentData = enrollment[0];

    // 2. Lấy payment và escrow
    const payment = await db
      .select()
      .from(payments)
      .where(eq(payments.enrollmentId, enrollmentId))
      .limit(1);

    if (payment.length === 0) {
      return { success: false, error: 'Payment không tồn tại' };
    }

    const escrow = await db
      .select()
      .from(escrowPayments)
      .where(eq(escrowPayments.paymentId, payment[0].id))
      .limit(1);

    if (escrow.length === 0) {
      return { success: false, error: 'Escrow không tồn tại' };
    }

    const escrowData = escrow[0];

    // 3. Tính số tiền hoàn lại = totalAmount - releasedAmount
    const refundAmount = escrowData.totalAmount - escrowData.releasedAmount;

    if (refundAmount <= 0) {
      return {
        success: false,
        error: 'Không còn số dư để hoàn',
      };
    }

    // 4. Thực hiện refund trong transaction
    await db.transaction(async (tx) => {
      // 4.1. Cập nhật escrow
      await tx
        .update(escrowPayments)
        .set({
          status: 'refunded',
          completedAt: new Date(),
        })
        .where(eq(escrowPayments.id, escrowData.id));

      // 4.2. Cập nhật payment
      await tx
        .update(payments)
        .set({
          status: 'refunded',
          refundedAt: new Date(),
          refundReason: reason,
        })
        .where(eq(payments.id, payment[0].id));

      // 4.3. Cập nhật enrollment
      await tx
        .update(classEnrollments)
        .set({
          status: 'cancelled',
        })
        .where(eq(classEnrollments.id, enrollmentId));
    });

    // 5. Ghi audit log
    await logAudit({
      userId: performedBy,
      action: 'escrow_refunded',
      entityType: 'escrow_payment',
      entityId: escrowData.id,
      changes: JSON.stringify({
        enrollmentId,
        refundAmount,
        reason,
      }),
    });

    return {
      success: true,
      refundAmount,
    };
  } catch (error) {
    console.error('Error refunding escrow:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi hoàn tiền',
    };
  }
}

// ==================== PAYOUT ====================

/**
 * Chuyển tiền từ pending sang available (30 ngày sau buổi học cuối)
 * Hoặc khi admin approve payout request
 */
export async function approvePayout(params: {
  tutorId: number;
  amount: number;
  performedBy: number;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  const { tutorId, amount, performedBy } = params;

  try {
    const wallet = await getOrCreateWallet(tutorId, 'tutor');

    // Kiểm tra số dư
    if (wallet.pendingBalance < amount) {
      return {
        success: false,
        error: 'Số dư pending không đủ',
      };
    }

    // Thực hiện trong transaction
    await db.transaction(async (tx) => {
      // Cập nhật wallet
      await tx
        .update(wallets)
        .set({
          pendingBalance: wallet.pendingBalance - amount,
          availableBalance: wallet.availableBalance + amount,
          lastPayoutDate: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      // Ghi wallet transaction
      await tx.insert(walletTransactions).values({
        walletId: wallet.id,
        type: 'payout',
        amount: amount,
        balanceBefore: wallet.pendingBalance,
        balanceAfter: wallet.pendingBalance - amount,
        description: `Chuyển từ pending sang available`,
        performedBy,
      });
    });

    // Ghi audit log
    await logAudit({
      userId: performedBy,
      action: 'payout_approved',
      entityType: 'wallet',
      entityId: wallet.id,
      changes: JSON.stringify({
        tutorId,
        amount,
      }),
    });

    return { success: true };
  } catch (error) {
    console.error('Error approving payout:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi duyệt thanh toán',
    };
  }
}

/**
 * Rút tiền từ available balance
 */
export async function processWithdrawal(params: {
  tutorId: number;
  amount: number;
  performedBy: number;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  const { tutorId, amount, performedBy } = params;

  try {
    const wallet = await getOrCreateWallet(tutorId, 'tutor');

    // Kiểm tra số dư
    if (wallet.availableBalance < amount) {
      return {
        success: false,
        error: 'Số dư available không đủ',
      };
    }

    // Thực hiện trong transaction
    await db.transaction(async (tx) => {
      // Cập nhật wallet
      await tx
        .update(wallets)
        .set({
          availableBalance: wallet.availableBalance - amount,
          withdrawnBalance: wallet.withdrawnBalance + amount,
        })
        .where(eq(wallets.id, wallet.id));

      // Ghi wallet transaction
      await tx.insert(walletTransactions).values({
        walletId: wallet.id,
        type: 'withdrawal',
        amount: -amount, // Số âm vì rút tiền
        balanceBefore: wallet.availableBalance,
        balanceAfter: wallet.availableBalance - amount,
        description: `Rút tiền về tài khoản ngân hàng`,
        performedBy,
      });
    });

    // Ghi audit log
    await logAudit({
      userId: performedBy,
      action: 'withdrawal_completed',
      entityType: 'wallet',
      entityId: wallet.id,
      changes: JSON.stringify({
        tutorId,
        amount,
      }),
    });

    return { success: true };
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi rút tiền',
    };
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Lấy hoặc tạo wallet
 */
async function getOrCreateWallet(
  ownerId: number,
  ownerType: 'tutor' | 'platform'
): Promise<Wallet> {
  const existing = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.ownerId, ownerId), eq(wallets.ownerType, ownerType)))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Tạo mới
  const result = await db.insert(wallets).values({
    ownerId,
    ownerType,
  });

  const newWallet = await db
    .select()
    .from(wallets)
    .where(eq(wallets.id, Number(result[0].insertId)))
    .limit(1);

  return newWallet[0];
}

/**
 * Ghi audit log
 */
async function logAudit(params: Omit<InsertAuditLog, 'createdAt'>) {
  try {
    await db.insert(auditLogs).values({
      ...params,
      userId: params.userId || null,
    });
  } catch (error) {
    console.error('Error logging audit:', error);
  }
}
