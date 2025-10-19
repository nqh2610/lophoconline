import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { insertTutorSchema } from '@/lib/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/tutors - Get all tutors with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters = {
      searchText: searchParams.get('searchText') || undefined,
      subject: searchParams.get('subject') || undefined,
      subjectId: searchParams.get('subjectId') ? parseInt(searchParams.get('subjectId')!) : undefined,
      gradeLevel: searchParams.get('gradeLevel') || undefined,
      gradeLevelId: searchParams.get('gradeLevelId') ? parseInt(searchParams.get('gradeLevelId')!) : undefined,
      category: searchParams.get('category') || undefined,
      minRate: searchParams.get('minRate') ? parseInt(searchParams.get('minRate')!) : undefined,
      maxRate: searchParams.get('maxRate') ? parseInt(searchParams.get('maxRate')!) : undefined,
      experience: searchParams.get('experience') ? parseInt(searchParams.get('experience')!) : undefined,
      shiftType: (searchParams.get('shiftType') as 'morning' | 'afternoon' | 'evening') || undefined,
      dayOfWeek: searchParams.get('dayOfWeek') ? parseInt(searchParams.get('dayOfWeek')!) : undefined,
      sortBy: (searchParams.get('sortBy') as 'rating' | 'price' | 'experience' | 'reviews') || undefined,
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    const tutors = await storage.getAllTutors(filters);

    // Add cache headers for better performance
    return NextResponse.json(tutors, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (error) {
    console.error('Error fetching tutors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tutors' },
      { status: 500 }
    );
  }
}

// POST /api/tutors - Create new tutor profile (requires authentication)
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

    // Validate the request body
    const validationResult = insertTutorSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Check if tutor profile already exists for this user
    const existingTutor = await storage.getTutorByUserId(body.userId);
    if (existingTutor) {
      return NextResponse.json(
        { error: 'Tutor profile already exists for this user' },
        { status: 409 }
      );
    }

    const newTutor = await storage.createTutor(validationResult.data);

    return NextResponse.json(newTutor, { status: 201 });
  } catch (error) {
    console.error('Error creating tutor:', error);
    return NextResponse.json(
      { error: 'Failed to create tutor profile' },
      { status: 500 }
    );
  }
}
