import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tutorAvailability } from '@/lib/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/tutor-availability/bulk - Bulk insert tutor availability
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tutorId, slots } = body;

    if (!tutorId || !Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json(
        { error: 'Invalid input: tutorId and slots array required' },
        { status: 400 }
      );
    }

    // Validate all slots have required fields
    for (const slot of slots) {
      if (!slot.recurringDays || !slot.startTime || !slot.endTime || !slot.shiftType) {
        return NextResponse.json(
          { error: 'Invalid input: each slot must have recurringDays, startTime, endTime, and shiftType' },
          { status: 400 }
        );
      }
    }

    // Bulk insert all availability slots in ONE query
    const values = slots.map(s => ({
      tutorId: tutorId,
      recurringDays: typeof s.recurringDays === 'string'
        ? s.recurringDays
        : JSON.stringify(s.recurringDays),
      startTime: s.startTime,
      endTime: s.endTime,
      shiftType: s.shiftType,
      sessionType: s.sessionType || null,
      isActive: 1,
    }));

    await db.insert(tutorAvailability).values(values);

    return NextResponse.json(
      {
        message: 'Availability slots inserted successfully',
        count: values.length
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error bulk inserting tutor availability:', error);
    return NextResponse.json(
      { error: 'Failed to insert availability slots' },
      { status: 500 }
    );
  }
}
