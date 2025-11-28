import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/lessons/[id]/reject - Tutor rejects lesson
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login' },
        { status: 401 }
      );
    }

    const lessonId = parseInt(params.id);
    const lesson = await storage.getLessonById(lessonId);

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Verify that the current user is the tutor for this lesson
    const tutor = await storage.getTutorById(parseInt(lesson.tutorId));
    if (!tutor || tutor.userId !== parseInt(session.user.id)) {
      return NextResponse.json(
        { error: 'Unauthorized - Only the assigned tutor can reject this lesson' },
        { status: 403 }
      );
    }

    // Check if lesson is in pending status
    if (lesson.status !== 'pending') {
      return NextResponse.json(
        { error: `Lesson cannot be rejected. Current status: ${lesson.status}` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'Rejection reason is required (minimum 10 characters)' },
        { status: 400 }
      );
    }

    // Update lesson status to cancelled
    const updatedLesson = await storage.updateLesson(lessonId, {
      status: 'cancelled',
      cancelledBy: tutor.userId,
      cancellationReason: reason,
    });

    // Get transaction for refund (if exists)
    const transaction = await storage.getTransactionByLesson(lessonId);
    if (transaction && transaction.status === 'completed') {
      // Mark transaction as refunded
      await storage.updateTransaction(transaction.id, {
        status: 'refunded',
      });
    }

    // Create notification for student
    const student = await storage.getStudentById(parseInt(lesson.studentId));
    if (student) {
      await storage.createNotification({
        userId: student.userId,
        type: 'cancellation',
        title: 'Lịch học đã bị từ chối',
        message: `Giáo viên ${tutor.fullName} đã từ chối lịch học vào ${new Date(lesson.date).toLocaleDateString('vi-VN')}. Lý do: ${reason}. ${transaction ? 'Học phí sẽ được hoàn lại trong 3-5 ngày làm việc.' : ''}`,
        link: `/dashboard`,
        isRead: 0,
      });
    }

    // Update tutor cancellation rate
    const allLessons = await storage.getLessonsByTutor(tutor.id.toString());
    const cancelledCount = allLessons.filter(l => l.status === 'cancelled' && l.cancelledBy === tutor.userId).length;
    const cancellationRate = (cancelledCount / allLessons.length) * 100;

    await storage.updateTutor(tutor.id, {
      cancellationRate: Math.round(cancellationRate),
    });

    return NextResponse.json({
      lesson: updatedLesson,
      message: 'Đã từ chối lịch học và hoàn tiền cho học sinh',
      refunded: !!transaction,
    }, { status: 200 });
  } catch (error) {
    console.error('Error rejecting lesson:', error);
    return NextResponse.json(
      { error: 'Failed to reject lesson' },
      { status: 500 }
    );
  }
}
