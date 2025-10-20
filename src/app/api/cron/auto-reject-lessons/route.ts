import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

/**
 * AUTO-REJECT LESSONS CRON JOB
 *
 * This endpoint should be called periodically (e.g., every hour) to automatically
 * reject lessons that have been pending for more than 24 hours.
 *
 * Setup:
 * 1. Vercel Cron: Add to vercel.json
 * 2. External Cron: Use services like cron-job.org or EasyCron
 * 3. Local Dev: Can be called manually for testing
 *
 * Security: In production, add authorization header verification
 */

export async function POST(request: NextRequest) {
  try {
    // Security: Verify cron secret in production
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get all pending lessons
    const allLessons = await storage.getAllLessons();
    const pendingLessons = allLessons.filter(lesson => lesson.status === 'pending');

    const rejectedLessons = [];

    for (const lesson of pendingLessons) {
      const createdAt = new Date(lesson.createdAt);

      // Check if lesson has been pending for more than 24 hours
      if (createdAt < twentyFourHoursAgo) {
        try {
          // Update lesson status to cancelled
          await storage.updateLesson(lesson.id, {
            status: 'cancelled',
            cancelledBy: 0, // 0 represents system
            cancellationReason: 'Gia sư không phản hồi trong vòng 24 giờ. Hệ thống tự động hủy và hoàn tiền.',
          });

          // Get transaction for refund (if exists)
          const transaction = await storage.getTransactionByLesson(lesson.id);
          if (transaction && transaction.status === 'completed') {
            // Mark transaction as refunded
            await storage.updateTransaction(transaction.id, {
              status: 'refunded',
            });
          }

          // Get tutor and student for notifications
          const [tutor, student] = await Promise.all([
            storage.getTutorById(parseInt(lesson.tutorId)),
            storage.getStudentById(parseInt(lesson.studentId)),
          ]);

          // Create notification for student
          if (student) {
            await storage.createNotification({
              userId: student.userId,
              type: 'cancellation',
              title: 'Lịch học đã bị hủy tự động',
              message: `Lịch học vào ${new Date(lesson.date).toLocaleDateString('vi-VN')} đã bị hủy do gia sư không phản hồi trong 24 giờ. ${transaction ? 'Học phí sẽ được hoàn lại trong 3-5 ngày làm việc.' : ''}`,
              link: `/dashboard`,
              isRead: 0,
            });
          }

          // Create notification for tutor (warning about missed opportunity)
          if (tutor) {
            const tutorUser = await storage.getUserById(tutor.userId);
            if (tutorUser) {
              await storage.createNotification({
                userId: tutorUser.id,
                type: 'cancellation',
                title: 'Đã bỏ lỡ yêu cầu đặt lịch',
                message: `Yêu cầu đặt lịch vào ${new Date(lesson.date).toLocaleDateString('vi-VN')} đã bị hủy do không phản hồi trong 24 giờ. Điều này ảnh hưởng đến tỷ lệ phản hồi của bạn.`,
                link: `/tutor/dashboard`,
                isRead: 0,
              });
            }

            // Update tutor response rate (negative impact)
            const tutorLessons = await storage.getLessonsByTutor(tutor.id.toString());
            const missedCount = tutorLessons.filter(
              l => l.status === 'cancelled' && l.cancelledBy === 0
            ).length;
            const totalRequests = tutorLessons.length;
            const responseRate = ((totalRequests - missedCount) / totalRequests) * 100;

            await storage.updateTutor(tutor.id, {
              responseRate: Math.round(responseRate),
            });
          }

          rejectedLessons.push({
            lessonId: lesson.id,
            tutorId: lesson.tutorId,
            studentId: lesson.studentId,
            date: lesson.date,
            refunded: !!transaction,
          });
        } catch (error) {
          console.error(`Failed to auto-reject lesson ${lesson.id}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      processedAt: now.toISOString(),
      totalPending: pendingLessons.length,
      rejectedCount: rejectedLessons.length,
      rejectedLessons,
    }, { status: 200 });
  } catch (error) {
    console.error('Error in auto-reject cron job:', error);
    return NextResponse.json(
      {
        error: 'Failed to process auto-reject',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// For manual testing via GET
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'GET method not allowed in production' },
      { status: 405 }
    );
  }

  return POST(request);
}
