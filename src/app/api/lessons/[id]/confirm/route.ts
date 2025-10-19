import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/lessons/[id]/confirm - Tutor confirms lesson
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
    if (!tutor || tutor.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Only the assigned tutor can confirm this lesson' },
        { status: 403 }
      );
    }

    // Check if lesson is in pending status
    if (lesson.status !== 'pending') {
      return NextResponse.json(
        { error: `Lesson cannot be confirmed. Current status: ${lesson.status}` },
        { status: 400 }
      );
    }

    // Update lesson status to confirmed
    const updatedLesson = await storage.updateLesson(lessonId, {
      status: 'confirmed',
      tutorConfirmed: 1,
    });

    // Create notification for student
    const student = await storage.getStudentById(parseInt(lesson.studentId));
    if (student) {
      await storage.createNotification({
        userId: student.userId,
        type: 'lesson_confirmed',
        title: 'Lịch học đã được xác nhận',
        message: `Gia sư ${tutor.fullName} đã xác nhận lịch học của bạn vào ${new Date(lesson.date).toLocaleDateString('vi-VN')} lúc ${lesson.startTime}.`,
        link: `/dashboard`,
        isRead: 0,
      });
    }

    // Update tutor statistics
    await storage.updateTutor(tutor.id, {
      responseRate: tutor.responseRate ? tutor.responseRate : 100,
    });

    return NextResponse.json({
      lesson: updatedLesson,
      message: 'Đã xác nhận lịch học thành công',
    }, { status: 200 });
  } catch (error) {
    console.error('Error confirming lesson:', error);
    return NextResponse.json(
      { error: 'Failed to confirm lesson' },
      { status: 500 }
    );
  }
}
