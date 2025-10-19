import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { insertReviewSchema } from '@/lib/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/reviews - Create a new review
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = insertReviewSchema.parse(body);

    // Verify the lesson exists and student is the reviewer
    const lesson = await storage.getLessonById(data.lessonId);

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    if (lesson.studentId !== session.user.id.toString()) {
      return NextResponse.json(
        { error: 'Only the student can review this lesson' },
        { status: 403 }
      );
    }

    if (lesson.status !== 'completed') {
      return NextResponse.json(
        { error: 'Can only review completed lessons' },
        { status: 400 }
      );
    }

    // Create the review (this also updates tutor rating automatically)
    const review = await storage.createReview(data);

    // Get tutor info
    const tutor = await storage.getTutorById(data.tutorId);

    // Create notification for tutor
    if (tutor) {
      const tutorUser = await storage.getUserById(tutor.userId);
      if (tutorUser) {
        await storage.createNotification({
          userId: tutorUser.id,
          type: 'review_received',
          title: 'Bạn nhận được đánh giá mới',
          message: `Học sinh đã đánh giá ${data.rating} sao cho buổi học ${lesson.subject}`,
          link: `/tutor/feedback`,
          isRead: 0
        });
      }
    }

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 400 }
    );
  }
}

// GET /api/reviews?tutorId=X - Get reviews for a tutor
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tutorId = searchParams.get('tutorId');
    const studentId = searchParams.get('studentId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    if (tutorId) {
      const reviews = await storage.getReviewsByTutor(parseInt(tutorId), limit);
      return NextResponse.json(reviews, {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      });
    }

    if (studentId) {
      const reviews = await storage.getReviewsByStudent(parseInt(studentId));
      return NextResponse.json(reviews, {
        status: 200,
        headers: {
          'Cache-Control': 'private, s-maxage=60'
        }
      });
    }

    return NextResponse.json(
      { error: 'tutorId or studentId parameter required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
