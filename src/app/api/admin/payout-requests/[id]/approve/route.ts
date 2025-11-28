/**
 * API: Admin duyệt yêu cầu rút tiền của giáo viên
 * POST /api/admin/payout-requests/[id]/approve
 *
 * Admin xác nhận đã chuyển tiền cho giáo viên
 * Cập nhật wallet, tạo transaction, đánh dấu payout request completed
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  payoutRequests,
  wallets,
  walletTransactions,
  auditLogs,
  users,
  tutors,
} from '@/lib/schema';
import { eq } from 'drizzle-orm';

// Middleware: Kiểm tra admin authentication
function getAdminUserIdFromRequest(request: NextRequest): number | null {
  const userId = request.headers.get('x-user-id');
  if (!userId) return null;
  return parseInt(userId);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payoutRequestId = parseInt(params.id);
    const { adminNote, transactionProof } = await request.json();

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

    // 2. Lấy thông tin payout request
    const payoutRequest = await db
      .select()
      .from(payoutRequests)
      .where(eq(payoutRequests.id, payoutRequestId))
      .limit(1);

    if (!payoutRequest.length) {
      return NextResponse.json(
        { error: 'Payout request not found' },
        { status: 404 }
      );
    }

    const request_data = payoutRequest[0];

    // Kiểm tra status
    if (request_data.status !== 'pending') {
      return NextResponse.json(
        { error: 'Payout request is not pending' },
        { status: 400 }
      );
    }

    // 3. Lấy thông tin wallet
    const wallet = await db
      .select()
      .from(wallets)
      .where(eq(wallets.id, request_data.walletId))
      .limit(1);

    if (!wallet.length) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const walletData = wallet[0];

    // Kiểm tra số dư available
    if (walletData.availableBalance < request_data.amount) {
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          message: `Wallet has ${walletData.availableBalance} VND, but payout request is ${request_data.amount} VND`,
        },
        { status: 400 }
      );
    }

    // 4. Thực hiện approve trong transaction
    await db.transaction(async (tx) => {
      // 4.1. Cập nhật payout request
      await tx
        .update(payoutRequests)
        .set({
          status: 'completed',
          adminNote: adminNote || null,
          transactionProof: transactionProof || null,
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payoutRequests.id, payoutRequestId));

      // 4.2. Cập nhật wallet (trừ available, cộng withdrawn)
      const newAvailableBalance =
        walletData.availableBalance - request_data.amount;
      const newWithdrawnBalance =
        walletData.withdrawnBalance + request_data.amount;

      await tx
        .update(wallets)
        .set({
          availableBalance: newAvailableBalance,
          withdrawnBalance: newWithdrawnBalance,
          lastPayoutDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, walletData.id));

      // 4.3. Tạo wallet transaction
      await tx.insert(walletTransactions).values({
        walletId: walletData.id,
        type: 'withdrawal',
        amount: -request_data.amount, // Số âm vì rút tiền
        balanceBefore: walletData.availableBalance,
        balanceAfter: newAvailableBalance,
        relatedId: payoutRequestId,
        relatedType: 'payout_request',
        description: `Payout to ${request_data.bankAccountName} - ${request_data.bankName} - ${request_data.bankAccount}`,
        performedBy: adminUserId,
      });

      // 4.4. Tạo audit log
      await tx.insert(auditLogs).values({
        userId: adminUserId,
        action: 'payout_approved',
        entityType: 'payout_request',
        entityId: payoutRequestId,
        changes: JSON.stringify({
          tutorId: request_data.tutorId,
          amount: request_data.amount,
          bankName: request_data.bankName,
          bankAccount: request_data.bankAccount,
          adminNote,
          transactionProof,
        }),
      });
    });

    // 5. Trả về response
    return NextResponse.json({
      success: true,
      message: 'Payout approved successfully',
      data: {
        payoutRequestId,
        tutorId: request_data.tutorId,
        amount: request_data.amount,
        bankInfo: {
          bankName: request_data.bankName,
          bankAccount: request_data.bankAccount,
          bankAccountName: request_data.bankAccountName,
        },
      },
    });
  } catch (error: any) {
    console.error(
      '[API Error] POST /api/admin/payout-requests/[id]/approve:',
      error
    );
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
