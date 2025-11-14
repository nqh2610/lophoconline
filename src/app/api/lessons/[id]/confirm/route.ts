import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateScheduleTime } from '@/lib/timezone';

// POST /api/lessons/[id]/confirm - Tutor confirms trial lesson and schedules specific time
// OPTIMIZED: Reduced from 9-10 queries to 2 queries (1 SELECT with JOINs + 3 parallel writes)
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

    // Get request body for scheduled date and time
    const body = await request.json();
    const { date, startTime, endTime } = body;

    // Validate scheduled date and time using timezone helper
    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Vui lòng chỉ định ngày và giờ học cụ thể' },
        { status: 400 }
      );
    }

    // Use timezone helper for comprehensive validation
    const validation = validateScheduleTime(date, startTime, endTime, {
      businessHoursOnly: true, // 6:00 - 22:00
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.errors[0] }, // Return first error
        { status: 400 }
      );
    }

    // OPTIMIZED: Use single function that does everything in 2 queries instead of 9-10
    const result = await storage.confirmTrialLesson({
      lessonId,
      tutorUserId: Number(session.user.id),
      date,
      startTime,
      endTime,
    });

    return NextResponse.json({
      lesson: result.lesson,
      videoSession: result.videoSession,
      message: 'Đã xác nhận và lên lịch học thử thành công',
    }, { status: 200 });
  } catch (error) {
    console.error('Error confirming lesson:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to confirm lesson';

    // Return appropriate status code based on error
    const status = errorMessage.includes('Unauthorized') ? 403
                 : errorMessage.includes('not found') ? 404
                 : errorMessage.includes('cannot be confirmed') ? 400
                 : 500;

    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
}
