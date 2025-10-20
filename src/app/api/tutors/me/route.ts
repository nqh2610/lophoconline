import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/tutors/me - Get current user's tutor profile
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login' },
        { status: 401 }
      );
    }

    // Get tutor by user ID
    const tutor = await storage.getTutorByUserId(parseInt(session.user.id));

    if (!tutor) {
      return NextResponse.json(
        { error: 'Tutor profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(tutor, { status: 200 });
  } catch (error) {
    console.error('Error fetching tutor profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tutor profile' },
      { status: 500 }
    );
  }
}
