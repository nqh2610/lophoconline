import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createVNPayPaymentUrl,
  createMomoPayment,
  generateTransactionCode,
} from '@/lib/payment-gateway';
import { z } from 'zod';

/**
 * API: Tạo payment URL
 * POST /api/payment/create
 *
 * Flow:
 * 1. Lấy enrollment info
 * 2. Tạo payment record (status = 'pending')
 * 3. Gọi payment gateway (VNPay/Momo)
 * 4. Trả về payment URL
 * 5. Redirect student sang gateway
 */

const createPaymentSchema = z.object({
  enrollmentId: z.number().int().positive(),
  gateway: z.enum(['vnpay', 'momo']),
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

    const student = await storage.getStudentByUserId(session.user.id);

    if (!student) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      );
    }

    // 2. Validate input
    const body = await request.json();
    const { enrollmentId, gateway } = createPaymentSchema.parse(body);

    // 3. Lấy enrollment
    const enrollment = await storage.getEnrollmentById(enrollmentId);

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền sở hữu
    if (enrollment.studentId !== student.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Bạn không có quyền thanh toán enrollment này' },
        { status: 403 }
      );
    }

    // Kiểm tra status
    if (enrollment.status !== 'pending') {
      return NextResponse.json(
        { error: `Enrollment đã được thanh toán hoặc hủy (status: ${enrollment.status})` },
        { status: 400 }
      );
    }

    // 4. Kiểm tra đã có payment chưa (simplified check)
    // In a real scenario, we would check DB for existing active payments
    // For now, we skip this check and rely on enrollment status

    // 5. Lấy thông tin gia sư và môn học để tạo order info
    const [tutor, subject] = await Promise.all([
      storage.getTutorById(enrollment.tutorId),
      storage.getSubjectById(enrollment.subjectId),
    ]);

    const orderInfo = `Thanh toan lop hoc ${subject?.name || 'Unknown'} - ${enrollment.totalSessions} buoi - GS: ${tutor?.fullName || 'Unknown'}`;

    // 6. Tạo payment record
    const transactionCode = generateTransactionCode('ENR');
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    const payment = await storage.createPayment({
      enrollmentId,
      studentId: student.id,
      amount: enrollment.totalAmount,
      method: gateway,
      gateway,
      status: 'pending',
      transactionCode,
      ipAddress,
    });

    // 7. Tạo payment URL tùy gateway
    let paymentUrl: string | undefined;
    let qrCodeUrl: string | undefined;
    let deeplink: string | undefined;

    if (gateway === 'vnpay') {
      paymentUrl = createVNPayPaymentUrl({
        enrollmentId: enrollment.id,
        amount: enrollment.totalAmount,
        orderInfo,
        ipAddress,
      });
    } else if (gateway === 'momo') {
      const momoResponse = await createMomoPayment({
        enrollmentId: enrollment.id,
        amount: enrollment.totalAmount,
        orderInfo,
      });

      if (!momoResponse.success) {
        // Cập nhật payment status sang failed
        await storage.updatePayment(payment.id, {
          status: 'failed',
        });

        return NextResponse.json(
          { error: momoResponse.error || 'Lỗi tạo thanh toán Momo' },
          { status: 500 }
        );
      }

      paymentUrl = momoResponse.payUrl;
      qrCodeUrl = momoResponse.qrCodeUrl;
      deeplink = momoResponse.deeplink;
    }

    // 8. Ghi audit log
    await storage.createAuditLog({
      userId: session.user.id,
      action: 'payment_created',
      entityType: 'payment',
      entityId: payment.id,
      changes: JSON.stringify({
        enrollmentId,
        amount: enrollment.totalAmount,
        gateway,
        transactionCode,
      }),
      ipAddress,
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        enrollmentId: payment.enrollmentId,
        amount: payment.amount,
        gateway: payment.gateway,
        transactionCode: payment.transactionCode,
        status: payment.status,
      },
      paymentUrl,
      qrCodeUrl,
      deeplink,
      message: 'Đã tạo payment. Vui lòng tiến hành thanh toán.',
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating payment:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Lỗi tạo payment' },
      { status: 500 }
    );
  }
}
