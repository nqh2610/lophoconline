import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { insertLessonSchema } from "@/lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Create lesson with transaction and notifications
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = insertLessonSchema.parse(body);

    // Check for tutor conflict
    const tutorConflict = await storage.checkLessonConflict(
      data.tutorId,
      data.date,
      data.startTime,
      data.endTime,
      'tutor'
    );

    if (tutorConflict) {
      return NextResponse.json(
        { error: "Gia sư đã có lớp khác trong khung giờ này" },
        { status: 409 }
      );
    }

    // Check for student conflict
    const studentConflict = await storage.checkLessonConflict(
      data.studentId,
      data.date,
      data.startTime,
      data.endTime,
      'student'
    );

    if (studentConflict) {
      return NextResponse.json(
        { error: "Học sinh đã có lớp khác trong khung giờ này" },
        { status: 409 }
      );
    }

    // OPTIMIZED: Execute lesson creation and tutor fetch in parallel
    const [lesson, tutor] = await Promise.all([
      storage.createLesson(data),
      storage.getTutorById(parseInt(data.tutorId))
    ]);

    const tutorUser = tutor ? await storage.getUserById(tutor.userId) : null;

    // OPTIMIZED: Execute transaction and notifications creation in parallel
    const [transaction] = await Promise.all([
      storage.createTransaction({
        lessonId: lesson.id,
        studentId: parseInt(data.studentId),
        tutorId: parseInt(data.tutorId),
        amount: data.price,
        method: 'cash',
        status: data.isTrial ? 'completed' : 'pending',
        paymentData: JSON.stringify({
          subject: data.subject,
          date: data.date,
          time: `${data.startTime} - ${data.endTime}`,
          isTrial: data.isTrial
        })
      }),
      // Create both notifications in parallel
      tutorUser ? storage.createNotification({
        userId: tutorUser.id,
        type: 'booking',
        title: data.isTrial ? 'Yêu cầu học thử mới' : 'Đặt lịch học mới',
        message: `Học sinh đã đặt lịch học ${data.subject} vào ${data.date} lúc ${data.startTime}`,
        link: `/tutor/dashboard?tab=upcoming`,
        isRead: 0
      }) : Promise.resolve(),
      storage.createNotification({
        userId: parseInt(data.studentId),
        type: 'booking',
        title: data.isTrial ? 'Đã gửi yêu cầu học thử' : 'Đặt lịch thành công',
        message: data.isTrial
          ? `Yêu cầu học thử ${data.subject} với ${tutor?.fullName || 'gia sư'} vào ${data.date} đã được gửi. Vui lòng chờ xác nhận.`
          : `Bạn đã đặt lịch học ${data.subject} với ${tutor?.fullName || 'gia sư'} vào ${data.date} lúc ${data.startTime}`,
        link: `/dashboard?tab=upcoming`,
        isRead: 0
      })
    ]);

    return NextResponse.json({
      lesson,
      transaction,
      message: data.isTrial
        ? 'Yêu cầu học thử đã được gửi. Gia sư sẽ xác nhận sớm!'
        : 'Đặt lịch thành công! Vui lòng thanh toán để hoàn tất.'
    }, { status: 201 });
  } catch (error) {
    console.error('Create lesson error:', error);
    return NextResponse.json(
      { error: "Invalid data" },
      { status: 400 }
    );
  }
}
