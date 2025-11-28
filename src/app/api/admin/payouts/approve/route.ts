import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { approvePayout } from '@/lib/escrow';
import { z } from 'zod';

/**
 * API: Admin duyệt chuyển tiền từ pending → available
 * POST /api/admin/payouts/approve
 *
 * QUAN TRỌNG:
 * - Chỉ admin mới được phép
 * - Sau 30 ngày kể từ buổi học cuối
 * - Hoặc khi enrollment hoàn thành
 *
 * Flow:
 * 1. Admin xem danh sách payouts đủ điều kiện
 * 2. Admin duyệt
 * 3. Chuyển từ pending → available
 * 4. Giáo viên có thể rút tiền
 */

const approvePayoutSchema = z.object({
  tutorId: z.number().int().positive(),
  amount: z.number().int().min(1),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Xác thực admin
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Vui lòng đăng nhập' },
        { status: 401 }
      );
    }

    // Kiểm tra role admin
    const user = await storage.getUserById(parseInt(session.user.id));

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Chỉ admin mới có quyền duyệt thanh toán' },
        { status: 403 }
      );
    }

    // 2. Validate input
    const body = await request.json();
    const { tutorId, amount } = approvePayoutSchema.parse(body);

    // 3. Lấy wallet của giáo viên
    const wallet = await storage.getWalletByOwner(tutorId, 'tutor');

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet không tồn tại' },
        { status: 404 }
      );
    }

    // 4. Kiểm tra số dư pending
    if (wallet.pendingBalance < amount) {
      return NextResponse.json(
        {
          error: 'Số dư pending không đủ',
          pendingBalance: wallet.pendingBalance,
          requestedAmount: amount,
        },
        { status: 400 }
      );
    }

    // 5. Thực hiện approve payout
    const result = await approvePayout({
      tutorId,
      amount,
      performedBy: parseInt(session.user.id),
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Lỗi duyệt thanh toán' },
        { status: 500 }
      );
    }

    // 6. Lấy thông tin giáo viên để gửi notification
    const tutor = await storage.getTutorById(tutorId);

    if (tutor) {
      await storage.createNotification({
        userId: tutor.userId,
        type: 'payment',
        title: 'Thanh toán đã được duyệt',
        message: `${amount.toLocaleString('vi-VN')}đ đã được chuyển vào số dư khả dụng. Bạn có thể rút tiền ngay bây giờ.`,
        link: `/tutor/wallet`,
        isRead: 0,
      });
    }

    // 7. Lấy wallet mới sau khi update
    const updatedWallet = await storage.getWalletByOwner(tutorId, 'tutor');

    return NextResponse.json({
      success: true,
      wallet: {
        pendingBalance: updatedWallet.pendingBalance,
        availableBalance: updatedWallet.availableBalance,
        totalEarned: updatedWallet.totalEarned,
      },
      message: `Đã duyệt thanh toán ${amount.toLocaleString('vi-VN')}đ cho giáo viên`,
    }, { status: 200 });

  } catch (error) {
    console.error('Error approving payout:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Lỗi duyệt thanh toán' },
      { status: 500 }
    );
  }
}

// GET: Danh sách tutors đủ điều kiện nhận tiền
export async function GET(request: NextRequest) {
  try {
    // 1. Xác thực admin
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await storage.getUserById(parseInt(session.user.id));

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 2. Lấy tất cả tutors có pending balance > 0
    // TODO: Add method to storage to get this efficiently
    // For now, return basic info

    return NextResponse.json({
      message: 'Use admin dashboard to view eligible payouts',
      endpoint: '/admin/payouts',
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching eligible payouts:', error);

    return NextResponse.json(
      { error: 'Lỗi lấy danh sách payouts' },
      { status: 500 }
    );
  }
}
