import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { db } from '@/lib/db';
import { payments, classEnrollments } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import {
  verifyVNPayCallback,
  parseVNPayResponseCode,
  parseEnrollmentIdFromOrderId,
} from '@/lib/payment-gateway';
import { createEscrow } from '@/lib/escrow';

/**
 * API: VNPay Payment Callback
 * GET /api/payment/vnpay/callback
 *
 * QUAN TRỌNG: Endpoint này nhận callback từ VNPay
 * - PHẢI verify HMAC signature
 * - KHÔNG được tin tưởng data mà không verify
 * - Ghi log đầy đủ mọi request
 *
 * Flow:
 * 1. Nhận callback từ VNPay
 * 2. Verify HMAC-SHA512 signature
 * 3. Kiểm tra response code
 * 4. Cập nhật payment status
 * 5. Tạo escrow payment
 * 6. Gửi notification
 * 7. Redirect về success/fail page
 */

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Lấy query parameters
    const searchParams = request.nextUrl.searchParams;
    const callbackParams: { [key: string]: string } = {};

    searchParams.forEach((value, key) => {
      callbackParams[key] = value;
    });

    // Log callback nhận được (để debug và audit)
    console.log('[VNPay Callback] Received:', {
      timestamp: new Date().toISOString(),
      params: callbackParams,
    });

    // 2. VERIFY SIGNATURE - QUAN TRỌNG NHẤT
    const verification = verifyVNPayCallback(callbackParams);

    if (!verification.isValid) {
      // CẢNH BÁO: Signature không hợp lệ - có thể bị tấn công
      console.error('[VNPay Callback] INVALID SIGNATURE:', callbackParams);

      await storage.createAuditLog({
        action: 'payment_callback_invalid_signature',
        entityType: 'payment',
        entityId: 0,
        changes: JSON.stringify({
          error: 'Invalid signature',
          params: callbackParams,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });

      // Redirect về fail page
      return NextResponse.redirect(
        new URL('/payment/failed?error=invalid_signature', request.url)
      );
    }

    // 3. Parse dữ liệu từ callback
    const {
      vnp_TxnRef: orderId,
      vnp_Amount: amountStr,
      vnp_ResponseCode: responseCode,
      vnp_TransactionNo: gatewayTransactionId,
      vnp_BankCode: bankCode,
      vnp_PayDate: payDate,
    } = callbackParams;

    const amount = parseInt(amountStr) / 100; // VNPay trả về amount * 100

    // Parse enrollment ID từ order ID
    const enrollmentId = parseEnrollmentIdFromOrderId(orderId);

    if (!enrollmentId) {
      console.error('[VNPay Callback] Invalid order ID:', orderId);

      return NextResponse.redirect(
        new URL('/payment/failed?error=invalid_order_id', request.url)
      );
    }

    // 4. Lấy payment từ DB
    const payment = await db
      .select()
      .from(payments)
      .where(and(
        eq(payments.enrollmentId, enrollmentId),
        eq(payments.status, 'pending')
      ))
      .limit(1);

    if (payment.length === 0) {
      console.error('[VNPay Callback] Payment not found:', enrollmentId);

      return NextResponse.redirect(
        new URL('/payment/failed?error=payment_not_found', request.url)
      );
    }

    const paymentData = payment[0];

    // 5. Parse response code
    const { success, message } = parseVNPayResponseCode(responseCode);

    // 6. Xử lý kết quả thanh toán
    if (success) {
      // THANH TOÁN THÀNH CÔNG

      // 6.1. Cập nhật payment
      await storage.updatePayment(paymentData.id, {
        status: 'holding', // Giữ tiền trong escrow
        gatewayTransactionId,
        gatewayResponse: JSON.stringify(callbackParams),
        signature: callbackParams['vnp_SecureHash'],
        signatureVerified: 1, // Đã verify
        paidAt: new Date(),
      });

      // 6.2. Tạo escrow payment
      const escrowResult = await createEscrow({
        paymentId: paymentData.id,
        enrollmentId: paymentData.enrollmentId,
        totalAmount: paymentData.amount,
        commissionRate: 15, // 15% phí nền tảng
      });

      if (!escrowResult.success) {
        console.error('[VNPay Callback] Escrow creation failed:', escrowResult.error);
        // Vẫn coi như thanh toán thành công, escrow sẽ được tạo lại sau
      }

      // 6.3. Cập nhật enrollment status
      await storage.updateEnrollment(paymentData.enrollmentId, {
        status: 'active', // Kích hoạt enrollment
      });

      // 6.4. Lấy enrollment và thông tin liên quan
      const [enrollment, student, tutor] = await Promise.all([
        storage.getEnrollmentById(paymentData.enrollmentId),
        storage.getStudentById(paymentData.studentId),
        db
          .select()
          .from(classEnrollments)
          .where(eq(classEnrollments.id, paymentData.enrollmentId))
          .limit(1)
          .then(async (enrollments) => {
            if (enrollments.length > 0) {
              return storage.getTutorById(enrollments[0].tutorId);
            }
            return null;
          }),
      ]);

      // 6.5. Tạo notification cho học sinh
      if (student) {
        await storage.createNotification({
          userId: student.userId,
          type: 'payment',
          title: 'Thanh toán thành công',
          message: `Bạn đã thanh toán thành công ${paymentData.amount.toLocaleString('vi-VN')}đ cho lớp học. Gia sư sẽ liên hệ bạn sớm để bắt đầu học.`,
          link: `/dashboard/enrollments/${paymentData.enrollmentId}`,
          isRead: 0,
        });
      }

      // 6.6. Tạo notification cho gia sư
      if (tutor) {
        await storage.createNotification({
          userId: tutor.userId,
          type: 'booking',
          title: 'Học sinh đã thanh toán',
          message: `${student?.fullName || 'Học sinh'} đã thanh toán thành công cho lớp học. Vui lòng liên hệ học sinh để bắt đầu dạy.`,
          link: `/tutor/enrollments/${paymentData.enrollmentId}`,
          isRead: 0,
        });
      }

      // 6.7. Ghi audit log
      await storage.createAuditLog({
        userId: student?.userId || null,
        action: 'payment_success',
        entityType: 'payment',
        entityId: paymentData.id,
        changes: JSON.stringify({
          enrollmentId: paymentData.enrollmentId,
          amount: paymentData.amount,
          gateway: 'vnpay',
          gatewayTransactionId,
          responseCode,
          processingTime: Date.now() - startTime,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });

      console.log('[VNPay Callback] Payment successful:', {
        paymentId: paymentData.id,
        enrollmentId: paymentData.enrollmentId,
        amount: paymentData.amount,
        processingTime: Date.now() - startTime,
      });

      // Redirect về success page
      return NextResponse.redirect(
        new URL(`/payment/success?enrollmentId=${paymentData.enrollmentId}`, request.url)
      );

    } else {
      // THANH TOÁN THẤT BẠI

      // 6.1. Cập nhật payment
      await storage.updatePayment(paymentData.id, {
        status: 'failed',
        gatewayResponse: JSON.stringify(callbackParams),
        signature: callbackParams['vnp_SecureHash'],
        signatureVerified: 1,
      });

      // 6.2. Ghi audit log
      await storage.createAuditLog({
        userId: null,
        action: 'payment_failed',
        entityType: 'payment',
        entityId: paymentData.id,
        changes: JSON.stringify({
          enrollmentId: paymentData.enrollmentId,
          responseCode,
          message,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });

      console.log('[VNPay Callback] Payment failed:', {
        paymentId: paymentData.id,
        responseCode,
        message,
      });

      // Redirect về fail page
      return NextResponse.redirect(
        new URL(`/payment/failed?reason=${encodeURIComponent(message)}`, request.url)
      );
    }

  } catch (error) {
    console.error('[VNPay Callback] Error:', error);

    // Ghi audit log cho lỗi
    try {
      await storage.createAuditLog({
        action: 'payment_callback_error',
        entityType: 'payment',
        entityId: 0,
        changes: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });
    } catch (logError) {
      console.error('[VNPay Callback] Failed to log error:', logError);
    }

    // Redirect về error page
    return NextResponse.redirect(
      new URL('/payment/failed?error=system_error', request.url)
    );
  }
}
