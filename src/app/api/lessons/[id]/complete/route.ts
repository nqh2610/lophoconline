import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/lessons/[id]/complete - Mark lesson as completed
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
        { error: 'Unauthorized - Only the assigned tutor can complete this lesson' },
        { status: 403 }
      );
    }

    // Check if lesson is in confirmed status
    if (lesson.status !== 'confirmed') {
      return NextResponse.json(
        { error: `Lesson cannot be completed. Current status: ${lesson.status}` },
        { status: 400 }
      );
    }

    // Check if lesson date has passed
    const lessonDateTime = new Date(`${lesson.date} ${lesson.startTime}`);
    const now = new Date();

    if (lessonDateTime > now) {
      return NextResponse.json(
        { error: 'Cannot complete a lesson that hasn\'t started yet' },
        { status: 400 }
      );
    }

    // Update lesson status to completed
    const updatedLesson = await storage.updateLesson(lessonId, {
      status: 'completed',
      completedAt: new Date(),
    });

    // Update transaction status to completed (release payment to tutor)
    const transaction = await storage.getTransactionByLesson(lessonId);
    if (transaction && transaction.status === 'pending') {
      await storage.updateTransaction(transaction.id, {
        status: 'completed',
      });
    }

    // Create notification for student (ask for review)
    const student = await storage.getStudentById(parseInt(lesson.studentId));
    const tutorUser = await storage.getUserById(tutor.userId);
    const tutorFullName = tutorUser?.fullName || tutor.userId.toString();

    if (student) {
      // Check if this was a trial lesson
      const isTrial = lesson.meetingLink && lesson.meetingLink.includes('trial');

      if (isTrial) {
        // For trial lessons, suggest enrolling in paid lessons
        await storage.createNotification({
          userId: student.userId,
          type: 'review_request',
          title: '✅ Buổi học thử đã hoàn thành',
          message: `Buổi học thử với giáo viên ${tutorFullName} đã hoàn thành. Bạn có muốn đăng ký học chính thức với giáo viên này không?`,
          link: `/tutor/${tutor.id}?enroll=true`,
          isRead: 0,
        });
      } else {
        // For regular lessons, ask for review
        await storage.createNotification({
          userId: student.userId,
          type: 'review_request',
          title: 'Buổi học đã hoàn thành',
          message: `Buổi học với giáo viên ${tutorFullName} đã hoàn thành. Hãy đánh giá để giúp các học sinh khác!`,
          link: `/tutor/${tutor.id}?review=true`,
          isRead: 0,
        });
      }
    }

    // Update tutor completion rate
    const allLessons = await storage.getLessonsByTutor(tutor.id.toString());
    const completedCount = allLessons.filter(l => l.status === 'completed').length;
    const completionRate = (completedCount / allLessons.length) * 100;

    await storage.updateTutor(tutor.id, {
      completionRate: Math.round(completionRate),
    });

    return NextResponse.json({
      lesson: updatedLesson,
      message: 'Đã đánh dấu buổi học hoàn thành',
    }, { status: 200 });
  } catch (error) {
    console.error('Error completing lesson:', error);
    return NextResponse.json(
      { error: 'Failed to complete lesson' },
      { status: 500 }
    );
  }
}
