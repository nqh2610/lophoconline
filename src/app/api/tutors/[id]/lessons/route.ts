import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/tutors/[id]/lessons - Get all lessons for a tutor
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tutorId = params.id;
    const tutor = await storage.getTutorById(parseInt(tutorId));

    if (!tutor) {
      return NextResponse.json(
        { error: 'Tutor not found' },
        { status: 404 }
      );
    }

    // Verify user is the tutor or is admin
    if (tutor.userId !== parseInt(session.user.id) && !session.user.roles?.includes('admin')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const lessons = await storage.getLessonsByTutor(tutorId);

    if (lessons.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // OPTIMIZED: Batch fetch students and transactions in 2 queries instead of 2*n queries
    const studentUserIds = [...new Set(lessons.map(l => parseInt(l.studentId)))];
    const lessonIds = lessons.map(l => l.id);

    const [studentsMap, transactionsMap] = await Promise.all([
      // Fetch all students in ONE query
      storage.getStudentsByUserIds(studentUserIds).then(students =>
        new Map(students.map(s => [s.userId, s]))
      ),
      // Fetch all transactions in ONE query
      storage.getTransactionsByLessonIds(lessonIds).then(txns =>
        new Map(txns.map(t => [t.lessonId, t]))
      )
    ]);

    // Map data without additional queries
    const enrichedLessons = lessons.map(lesson => {
      const student = studentsMap.get(parseInt(lesson.studentId));
      const transaction = transactionsMap.get(lesson.id);

      return {
        ...lesson,
        student: student ? {
          id: student.id,
          fullName: student.fullName,
          avatar: student.avatar,
          phone: student.phone
        } : null,
        transaction
      };
    });

    return NextResponse.json(enrichedLessons, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Error fetching tutor lessons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lessons' },
      { status: 500 }
    );
  }
}
