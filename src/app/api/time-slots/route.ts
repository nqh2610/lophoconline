import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import type { InsertTimeSlot } from '@/lib/storage';
import { z } from 'zod';

/**
 * @deprecated This endpoint is deprecated. Use /api/tutor-availability instead.
 * 
 * Legacy API for backward compatibility only.
 * Internally converts time_slots format to tutor_availability.
 * 
 * Migration guide:
 * - GET /api/time-slots?tutorId=X → GET /api/tutor-availability/tutor/{tutorId}
 * - POST /api/time-slots → POST /api/tutor-availability
 * 
 * New format uses:
 * - recurringDays: "[1,3,5]" (JSON array) instead of dayOfWeek: 1
 * - Returns full tutor_availability objects with more fields
 */

// Validation schema for time slot (backward compatibility API)
const insertTimeSlotSchema = z.object({
  tutorId: z.number().int().positive(),
  dayOfWeek: z.number().int().min(0).max(6),
  shiftType: z.enum(["morning", "afternoon", "evening"]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  isAvailable: z.number().int().min(0).max(1).optional(),
});

/**
 * GET /api/time-slots?tutorId=123 - Get time slots for a tutor
 * @deprecated Use GET /api/tutor-availability/tutor/{tutorId} instead
 */
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

    // Add deprecation warning header
    const response = NextResponse.json(
      await storage.getTutorTimeSlots(parseInt(tutorId))
    );
    response.headers.set('X-API-Deprecated', 'true');
    response.headers.set('X-API-Deprecation-Info', 'Use /api/tutor-availability/tutor/{tutorId} instead');
    
    return response;
  } catch (error) {
    console.error('Error fetching time slots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time slots' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/time-slots - Create time slot (legacy API, converts to tutor_availability)
 * @deprecated Use POST /api/tutor-availability instead with recurringDays format
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = insertTimeSlotSchema.parse(body);

    // Create the time slot (internally saved to tutor_availability)
    const timeSlot = await storage.createTimeSlot(validatedData);

    // Add deprecation warning header
    const response = NextResponse.json(timeSlot, { status: 201 });
    response.headers.set('X-API-Deprecated', 'true');
    response.headers.set('X-API-Deprecation-Info', 'Use POST /api/tutor-availability instead');
    
    return response;
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
