import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/reviews/[id]/reply - Tutor replies to a review
export async function POST(
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

    const reviewId = parseInt(params.id);
    const review = await storage.getReviewById(reviewId);

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Verify the user is the tutor being reviewed
    const tutor = await storage.getTutorById(review.tutorId);
    if (!tutor || tutor.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the tutor can reply to this review' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { reply } = body;

    if (!reply || typeof reply !== 'string' || reply.trim().length === 0) {
      return NextResponse.json(
        { error: 'Reply text is required' },
        { status: 400 }
      );
    }

    const updatedReview = await storage.addReviewReply(reviewId, reply);

    // Create notification for student
    await storage.createNotification({
      userId: review.studentId,
      type: 'review_received',
      title: 'Gia sư đã phản hồi đánh giá của bạn',
      message: `${tutor.fullName} đã phản hồi đánh giá của bạn`,
      link: `/dashboard?tab=reviews`,
      isRead: 0
    });

    return NextResponse.json(updatedReview, { status: 200 });
  } catch (error) {
    console.error('Error replying to review:', error);
    return NextResponse.json(
      { error: 'Failed to reply to review' },
      { status: 500 }
    );
  }
}
