import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

/**
 * API: Gia sư tạo yêu cầu rút tiền
 * POST /api/payouts/request
 *
 * Flow:
 * 1. Tutor nhập thông tin ngân hàng
 * 2. Hệ thống tạo payout request (status = 'pending')
 * 3. Admin review và duyệt
 * 4. Admin chuyển khoản và upload proof
 * 5. Status = 'completed'
 */

const createPayoutRequestSchema = z.object({
  amount: z.number().int().min(50000).max(50000000), // 50k - 50M
  bankName: z.string().min(1).max(100),
  bankAccount: z.string().min(1).max(50),
  bankAccountName: z.string().min(1).max(255),
  requestNote: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Xác thực
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Vui lòng đăng nhập' },
        { status: 401 }
      );
    }

    const tutor = await storage.getTutorByUserId(parseInt(session.user.id));

    if (!tutor) {
      return NextResponse.json(
        { error: 'Chỉ gia sư mới có thể rút tiền' },
        { status: 403 }
      );
    }

    // 2. Validate input
    const body = await request.json();
    const validatedData = createPayoutRequestSchema.parse(body);

    // 3. Lấy wallet
    const wallet = await storage.getWalletByOwner(tutor.id, 'tutor');

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet không tồn tại' },
        { status: 404 }
      );
    }

    // 4. Kiểm tra số dư available
    if (wallet.availableBalance < validatedData.amount) {
      return NextResponse.json(
        {
          error: 'Số dư khả dụng không đủ',
          availableBalance: wallet.availableBalance,
          requestedAmount: validatedData.amount,
        },
        { status: 400 }
      );
    }

    // 5. Kiểm tra có request pending nào không
    const pendingRequests = await storage.getPayoutRequestsByTutor(tutor.id);
    const hasPending = pendingRequests.some(r => r.status === 'pending');

    if (hasPending) {
      return NextResponse.json(
        { error: 'Bạn đã có yêu cầu rút tiền đang chờ duyệt. Vui lòng đợi admin xử lý.' },
        { status: 400 }
      );
    }

    // 6. Tạo payout request
    const payoutRequest = await storage.createPayoutRequest({
      tutorId: tutor.id,
      walletId: wallet.id,
      amount: validatedData.amount,
      bankName: validatedData.bankName,
      bankAccount: validatedData.bankAccount,
      bankAccountName: validatedData.bankAccountName,
      status: 'pending',
      requestNote: validatedData.requestNote || null,
    });

    // 7. Tạo notification cho admin
    // Get all admin users
    // TODO: Optimize this with a getAdminUsers method
    await storage.createAuditLog({
      userId: parseInt(session.user.id),
      action: 'payout_request_created',
      entityType: 'payout_request',
      entityId: payoutRequest.id,
      changes: JSON.stringify({
        tutorId: tutor.id,
        amount: validatedData.amount,
        bankName: validatedData.bankName,
      }),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      payoutRequest: {
        id: payoutRequest.id,
        amount: payoutRequest.amount,
        bankName: payoutRequest.bankName,
        bankAccount: payoutRequest.bankAccount,
        status: payoutRequest.status,
        createdAt: payoutRequest.createdAt,
      },
      message: 'Đã tạo yêu cầu rút tiền. Admin sẽ xử lý trong vòng 1-2 ngày làm việc.',
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating payout request:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Lỗi tạo yêu cầu rút tiền' },
      { status: 500 }
    );
  }
}

// GET: Lấy danh sách payout requests của tutor
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tutor = await storage.getTutorByUserId(parseInt(session.user.id));

    if (!tutor) {
      return NextResponse.json(
        { error: 'Tutor not found' },
        { status: 404 }
      );
    }

    const payoutRequests = await storage.getPayoutRequestsByTutor(tutor.id);

    return NextResponse.json({
      success: true,
      payoutRequests,
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching payout requests:', error);

    return NextResponse.json(
      { error: 'Lỗi lấy danh sách yêu cầu rút tiền' },
      { status: 500 }
    );
  }
}
