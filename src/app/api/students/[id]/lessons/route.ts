import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/students/[id]/lessons - Get all lessons for a student
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

    const studentId = params.id;

    // Verify user is accessing their own data or is admin
    if (session.user.id.toString() !== studentId && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const lessons = await storage.getLessonsByStudent(studentId);

    if (lessons.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // OPTIMIZED: Batch fetch tutors and transactions in 2 queries instead of 2*n queries
    const tutorIds = [...new Set(lessons.map(l => parseInt(l.tutorId)))];
    const lessonIds = lessons.map(l => l.id);

    const [tutorsMap, transactionsMap] = await Promise.all([
      // Fetch all tutors in ONE query
      storage.getTutorsByIds(tutorIds).then(tutors =>
        new Map(tutors.map(t => [t.id, t]))
      ),
      // Fetch all transactions in ONE query
      storage.getTransactionsByLessonIds(lessonIds).then(txns =>
        new Map(txns.map(t => [t.lessonId, t]))
      )
    ]);

    // Map data without additional queries
    const enrichedLessons = lessons.map(lesson => {
      const tutor = tutorsMap.get(parseInt(lesson.tutorId));
      const transaction = transactionsMap.get(lesson.id);

      return {
        ...lesson,
        tutor: tutor ? {
          id: tutor.id,
          fullName: tutor.fullName,
          avatar: tutor.avatar,
          rating: tutor.rating
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
    console.error('Error fetching student lessons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lessons' },
      { status: 500 }
    );
  }
}
