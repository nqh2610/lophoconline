import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

/**
 * API: Tạo đăng ký lớp học (gói nhiều buổi)
 * POST /api/enrollments/create
 *
 * Flow:
 * 1. Student chọn gia sư, môn học, số buổi
 * 2. Tạo enrollment (status = 'pending')
 * 3. Redirect sang payment gateway
 * 4. Sau khi thanh toán thành công → status = 'active'
 */

const createEnrollmentSchema = z.object({
  tutorId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  gradeLevelId: z.number().int().positive(),
  totalSessions: z.number().int().min(1).max(100),
  pricePerSession: z.number().int().min(50000), // Tối thiểu 50k/buổi
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  schedule: z.string().optional(), // JSON: [{"day": 2, "time": "18:00-19:30"}]
  notes: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Xác thực người dùng
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Vui lòng đăng nhập' },
        { status: 401 }
      );
    }

    // 2. Lấy student profile
    const student = await storage.getStudentByUserId(session.user.id);

    if (!student) {
      return NextResponse.json(
        { error: 'Bạn cần tạo hồ sơ học sinh trước khi đăng ký lớp' },
        { status: 400 }
      );
    }

    // 3. Validate input
    const body = await request.json();
    const validatedData = createEnrollmentSchema.parse(body);

    // 4. Kiểm tra tutor tồn tại và đã verified
    const tutor = await storage.getTutorById(validatedData.tutorId);

    if (!tutor) {
      return NextResponse.json(
        { error: 'Gia sư không tồn tại' },
        { status: 404 }
      );
    }

    if (tutor.verificationStatus !== 'verified') {
      return NextResponse.json(
        { error: 'Gia sư chưa được xác minh' },
        { status: 400 }
      );
    }

    // 5. Kiểm tra môn học và cấp độ
    const subject = await storage.getSubjectById(validatedData.subjectId);
    const gradeLevel = await storage.getGradeLevelById(validatedData.gradeLevelId);

    if (!subject || !gradeLevel) {
      return NextResponse.json(
        { error: 'Môn học hoặc cấp độ không tồn tại' },
        { status: 404 }
      );
    }

    // 6. Tính toán tổng tiền
    const totalAmount = validatedData.totalSessions * validatedData.pricePerSession;

    // 7. Tính ngày kết thúc dự kiến (giả sử mỗi tuần học 2 buổi)
    const startDate = new Date(validatedData.startDate);
    const weeksNeeded = Math.ceil(validatedData.totalSessions / 2);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + weeksNeeded * 7);

    // 8. Tạo enrollment
    const enrollment = await storage.createEnrollment({
      studentId: student.id,
      tutorId: validatedData.tutorId,
      subjectId: validatedData.subjectId,
      gradeLevelId: validatedData.gradeLevelId,
      totalSessions: validatedData.totalSessions,
      pricePerSession: validatedData.pricePerSession,
      totalAmount,
      status: 'pending', // Chờ thanh toán
      startDate: validatedData.startDate,
      endDate: endDate.toISOString().split('T')[0],
      schedule: validatedData.schedule || null,
      notes: validatedData.notes || null,
    });

    // 9. Tạo notification cho gia sư
    await storage.createNotification({
      userId: tutor.userId,
      type: 'booking',
      title: 'Yêu cầu đăng ký lớp mới',
      message: `Học sinh ${student.fullName} muốn đăng ký lớp ${subject.name} (${validatedData.totalSessions} buổi). Bạn sẽ nhận được thông báo sau khi học sinh thanh toán.`,
      link: `/tutor/enrollments/${enrollment.id}`,
      isRead: 0,
    });

    // 10. Ghi audit log
    await storage.createAuditLog({
      userId: session.user.id,
      action: 'enrollment_created',
      entityType: 'enrollment',
      entityId: enrollment.id,
      changes: JSON.stringify({
        tutorId: validatedData.tutorId,
        totalSessions: validatedData.totalSessions,
        totalAmount,
      }),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      enrollment: {
        id: enrollment.id,
        tutorId: enrollment.tutorId,
        tutorName: tutor.fullName,
        subjectName: subject.name,
        totalSessions: enrollment.totalSessions,
        pricePerSession: enrollment.pricePerSession,
        totalAmount: enrollment.totalAmount,
        status: enrollment.status,
      },
      message: 'Đã tạo đăng ký lớp học. Vui lòng tiến hành thanh toán.',
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating enrollment:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Lỗi tạo đăng ký lớp học' },
      { status: 500 }
    );
  }
}
