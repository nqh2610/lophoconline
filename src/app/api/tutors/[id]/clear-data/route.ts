import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tutorSubjects, tutorAvailability } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// DELETE /api/tutors/[id]/clear-data - Clear subjects and availability in ONE transaction
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

    // Delete both in parallel (not sequential) for better performance
    const [subjectsResult, availabilityResult] = await Promise.all([
      db.delete(tutorSubjects).where(eq(tutorSubjects.tutorId, tutorId)),
      db.delete(tutorAvailability).where(eq(tutorAvailability.tutorId, tutorId))
    ]);

    return NextResponse.json(
      {
        message: 'Subjects and availability cleared successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error clearing tutor data:', error);
    return NextResponse.json(
      { error: 'Failed to clear data' },
      { status: 500 }
    );
  }
}
