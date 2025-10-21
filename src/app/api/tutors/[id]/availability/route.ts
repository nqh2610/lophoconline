import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tutorId = params.id;

    if (!tutorId) {
      return NextResponse.json(
        { error: 'Tutor ID is required' },
        { status: 400 }
      );
    }

    // Get tutor time slots from storage (ca dạy gia sư đã tạo)
    const timeSlots = await storage.getTutorTimeSlots(parseInt(tutorId));

    // Filter only available time slots
    const availableSlots = timeSlots.filter(slot => slot.isAvailable === 1);

    return NextResponse.json(availableSlots, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('[API Error] GET /api/tutors/[id]/availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tutor availability' },
      { status: 500 }
    );
  }
}
