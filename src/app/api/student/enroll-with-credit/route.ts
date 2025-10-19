/**
 * API: Học viên đăng ký lớp mới và sử dụng credit
 * POST /api/student/enroll-with-credit
 *
 * Cho phép học viên:
 * - Sử dụng credit (tiền hoàn lại) để thanh toán cho lớp mới
 * - Nếu credit không đủ, thanh toán phần còn lại qua cổng
 * - Tự động áp dụng credit có sớm nhất (FIFO)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  classEnrollments,
  payments,
  escrowPayments,
  studentCredits,
  students,
  users,
  auditLogs,
} from '@/lib/schema';
import { eq, and, sql, lt } from 'drizzle-orm';

// Middleware: Kiểm tra authentication
function getUserIdFromRequest(request: NextRequest): number | null {
  const userId = request.headers.get('x-user-id');
  return userId ? parseInt(userId) : null;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Xác thực user
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Lấy thông tin student
    const student = await db
      .select()
      .from(students)
      .where(eq(students.userId, userId))
      .limit(1);

    if (!student.length) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      );
    }

    const studentId = student[0].id;

    // 3. Parse request body
    const {
      tutorId,
      subjectId,
      gradeLevelId,
      totalSessions,
      pricePerSession,
      startDate,
      endDate,
      schedule,
      notes,
      useCreditAmount, // Số credit muốn sử dụng (optional, nếu không có thì tự động dùng hết)
    } = await request.json();

    // Validate
    if (
      !tutorId ||
      !subjectId ||
      !gradeLevelId ||
      !totalSessions ||
      !pricePerSession
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const totalAmount = totalSessions * pricePerSession;

    // 4. Lấy danh sách credits của student (active, chưa hết hạn, sắp xếp theo ngày tạo)
    const now = new Date();
    const availableCredits = await db
      .select()
      .from(studentCredits)
      .where(
        and(
          eq(studentCredits.studentId, studentId),
          eq(studentCredits.status, 'active'),
          sql`${studentCredits.remainingAmount} > 0`,
          sql`(${studentCredits.expiresAt} IS NULL OR ${studentCredits.expiresAt} > ${now})`
        )
      )
      .orderBy(studentCredits.createdAt); // FIFO - dùng credit cũ trước

    // Tổng credit khả dụng
    const totalAvailableCredit = availableCredits.reduce(
      (sum, c) => sum + (c.remainingAmount || 0),
      0
    );

    // 5. Tính toán credit sẽ sử dụng
    let creditToUse = 0;
    if (useCreditAmount && useCreditAmount > 0) {
      // User chỉ định số credit muốn dùng
      creditToUse = Math.min(useCreditAmount, totalAvailableCredit, totalAmount);
    } else {
      // Tự động dùng hết credit (nhưng không vượt quá totalAmount)
      creditToUse = Math.min(totalAvailableCredit, totalAmount);
    }

    const amountToPay = totalAmount - creditToUse;

    // 6. Tạo enrollment trong transaction
    let newEnrollmentId: number;
    let creditsUsed: Array<{ creditId: number; amountUsed: number }> = [];

    await db.transaction(async (tx) => {
      // 6.1. Tạo enrollment
      const [enrollment] = await tx.insert(classEnrollments).values({
        studentId,
        tutorId,
        subjectId,
        gradeLevelId,
        totalSessions,
        completedSessions: 0,
        pricePerSession,
        totalAmount,
        status: amountToPay > 0 ? 'pending' : 'active', // Nếu còn phải trả thì pending
        startDate: startDate || null,
        endDate: endDate || null,
        schedule: schedule ? JSON.stringify(schedule) : null,
        notes: notes || null,
      });

      newEnrollmentId = enrollment.insertId;

      // 6.2. Áp dụng credits (FIFO)
      let remainingCreditToUse = creditToUse;
      for (const credit of availableCredits) {
        if (remainingCreditToUse <= 0) break;

        const creditRemaining = credit.remainingAmount || 0;
        const amountFromThisCredit = Math.min(
          creditRemaining,
          remainingCreditToUse
        );

        // Cập nhật credit
        const newUsedAmount = (credit.usedAmount || 0) + amountFromThisCredit;
        const newRemainingAmount = creditRemaining - amountFromThisCredit;
        const newStatus =
          newRemainingAmount <= 0
            ? 'used'
            : credit.status;

        await tx
          .update(studentCredits)
          .set({
            usedAmount: newUsedAmount,
            remainingAmount: newRemainingAmount,
            status: newStatus,
            usedForEnrollmentId: newEnrollmentId, // Ghi nhận đã dùng cho lớp nào
            updatedAt: new Date(),
          })
          .where(eq(studentCredits.id, credit.id));

        creditsUsed.push({
          creditId: credit.id,
          amountUsed: amountFromThisCredit,
        });

        remainingCreditToUse -= amountFromThisCredit;
      }

      // 6.3. Nếu đã thanh toán đủ bằng credit (amountToPay = 0)
      if (amountToPay === 0) {
        // Tạo payment record (status = completed, không cần qua cổng)
        const [payment] = await tx.insert(payments).values({
          enrollmentId: newEnrollmentId,
          studentId,
          amount: totalAmount,
          method: 'credit',
          gateway: 'internal',
          status: 'completed',
          transactionCode: `CREDIT-${Date.now()}`,
          signatureVerified: 1,
          paidAt: new Date(),
        });

        // Tạo escrow
        await tx.insert(escrowPayments).values({
          paymentId: payment.insertId,
          enrollmentId: newEnrollmentId,
          totalAmount,
          releasedAmount: 0,
          platformFee: 0,
          commissionRate: 15,
          status: 'holding',
        });

        // Cập nhật enrollment sang active
        await tx
          .update(classEnrollments)
          .set({ status: 'active' })
          .where(eq(classEnrollments.id, newEnrollmentId));
      } else {
        // Tạo payment record (status = pending, cần thanh toán phần còn lại)
        await tx.insert(payments).values({
          enrollmentId: newEnrollmentId,
          studentId,
          amount: amountToPay, // Chỉ cần trả phần còn lại
          method: 'pending',
          gateway: 'pending',
          status: 'pending',
          transactionCode: `PENDING-${Date.now()}`,
        });
      }

      // 6.4. Tạo audit log
      await tx.insert(auditLogs).values({
        userId,
        action: 'enrollment_created_with_credit',
        entityType: 'enrollment',
        entityId: newEnrollmentId,
        changes: JSON.stringify({
          totalAmount,
          creditUsed: creditToUse,
          amountToPay,
          creditsUsed,
        }),
      });
    });

    // 7. Trả về response
    return NextResponse.json({
      success: true,
      message:
        amountToPay > 0
          ? 'Enrollment created. Please complete payment.'
          : 'Enrollment created and paid with credit.',
      data: {
        enrollmentId: newEnrollmentId!,
        totalAmount,
        creditUsed: creditToUse,
        amountToPay,
        creditsUsed,
        status: amountToPay > 0 ? 'pending' : 'active',
        // Nếu amountToPay > 0, frontend cần redirect đến payment gateway
        needsPayment: amountToPay > 0,
      },
    });
  } catch (error: any) {
    console.error('[API Error] POST /api/student/enroll-with-credit:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
