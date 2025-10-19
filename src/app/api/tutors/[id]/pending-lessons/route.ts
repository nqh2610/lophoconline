import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/tutors/[id]/pending-lessons - Get tutor's pending lesson requests
export async function GET(
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

    const tutorId = parseInt(params.id);
    const tutor = await storage.getTutorById(tutorId);

    if (!tutor) {
      return NextResponse.json(
        { error: 'Tutor not found' },
        { status: 404 }
      );
    }

    // Verify that the current user is the tutor
    if (tutor.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only view your own pending lessons' },
        { status: 403 }
      );
    }

    // Get all lessons for this tutor
    const allLessons = await storage.getLessonsByTutor(tutorId);

    // Filter for pending lessons only
    const pendingLessons = allLessons.filter(lesson => lesson.status === 'pending');

    if (pendingLessons.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Get student details for each pending lesson (using batch query to avoid N+1)
    const studentIds = [...new Set(pendingLessons.map(l => parseInt(l.studentId)))];
    const lessonIds = pendingLessons.map(l => l.id);

    const [students, transactions] = await Promise.all([
      storage.getStudentsByIds(studentIds),
      storage.getTransactionsByLessonIds(lessonIds),
    ]);

    // Create maps for quick lookup
    const studentsMap = new Map(students.map(s => [s.id, s]));
    const transactionsMap = new Map(transactions.map(t => [t.lessonId, t]));

    // Enrich pending lessons with student and transaction data
    const enrichedPendingLessons = pendingLessons.map(lesson => {
      const student = studentsMap.get(parseInt(lesson.studentId));
      const transaction = transactionsMap.get(lesson.id);

      // Calculate how long the request has been pending
      const createdAt = new Date(lesson.createdAt);
      const now = new Date();
      const hoursWaiting = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));

      return {
        ...lesson,
        student: student ? {
          id: student.id,
          fullName: student.fullName,
          avatar: student.avatar,
          gradeLevel: student.gradeLevelId,
        } : null,
        transaction: transaction ? {
          id: transaction.id,
          amount: transaction.amount,
          status: transaction.status,
          method: transaction.method,
        } : null,
        hoursWaiting,
        isUrgent: hoursWaiting >= 20, // Flag if close to 24h auto-reject deadline
      };
    });

    // Sort by creation time (oldest first - most urgent)
    enrichedPendingLessons.sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return NextResponse.json(enrichedPendingLessons, { status: 200 });
  } catch (error) {
    console.error('Error fetching pending lessons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending lessons' },
      { status: 500 }
    );
  }
}
