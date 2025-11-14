import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// DELETE /api/tutors/[id]/availability/clear - Delete all availabilities for a tutor (requires authentication)
export async function DELETE(
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
    if (tutor.userId !== parseInt(session.user.id)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Delete all tutor availabilities
    await storage.deleteTutorAvailabilityByTutorId(tutorId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting tutor availability:', error);
    return NextResponse.json(
      { error: 'Failed to delete tutor availability' },
      { status: 500 }
    );
  }
}
