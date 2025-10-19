import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { insertTutorSchema } from '@/lib/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/tutors/[id] - Get tutor by ID with subjects and time slots
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tutorId = parseInt(params.id);

    if (isNaN(tutorId)) {
      return NextResponse.json(
        { error: 'Invalid tutor ID' },
        { status: 400 }
      );
    }

    // Use the new enriched method - fetches all data in optimized queries
    const enrichedTutor = await storage.getTutorByIdEnriched(tutorId);

    if (!enrichedTutor) {
      return NextResponse.json(
        { error: 'Tutor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(enrichedTutor, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (error) {
    console.error('Error fetching tutor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tutor' },
      { status: 500 }
    );
  }
}

// PUT /api/tutors/[id] - Update tutor profile (requires authentication)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tutorId = parseInt(params.id);

    if (isNaN(tutorId)) {
      return NextResponse.json(
        { error: 'Invalid tutor ID' },
        { status: 400 }
      );
    }

    const tutor = await storage.getTutorById(tutorId);

    if (!tutor) {
      return NextResponse.json(
        { error: 'Tutor not found' },
        { status: 404 }
      );
    }

    // Check if user owns this tutor profile
    if (tutor.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate the update data (partial)
    const validationResult = insertTutorSchema.partial().safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const updatedTutor = await storage.updateTutor(tutorId, validationResult.data);

    return NextResponse.json(updatedTutor, { status: 200 });
  } catch (error) {
    console.error('Error updating tutor:', error);
    return NextResponse.json(
      { error: 'Failed to update tutor profile' },
      { status: 500 }
    );
  }
}
