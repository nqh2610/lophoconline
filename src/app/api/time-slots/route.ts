import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { insertTimeSlotSchema } from '@/lib/schema';

// GET /api/time-slots?tutorId=123 - Get time slots for a tutor
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tutorId = searchParams.get('tutorId');

    if (!tutorId) {
      return NextResponse.json(
        { error: 'tutorId is required' },
        { status: 400 }
      );
    }

    const timeSlots = await storage.getTimeSlotsByTutorId(parseInt(tutorId));
    return NextResponse.json(timeSlots);
  } catch (error) {
    console.error('Error fetching time slots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time slots' },
      { status: 500 }
    );
  }
}

// POST /api/time-slots - Create time slot
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = insertTimeSlotSchema.parse(body);

    // Create the time slot
    const timeSlot = await storage.createTimeSlot(validatedData);

    return NextResponse.json(timeSlot, { status: 201 });
  } catch (error) {
    console.error('Error creating time slot:', error);

    if (error instanceof Error && error.message.includes('parse')) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create time slot' },
      { status: 500 }
    );
  }
}
