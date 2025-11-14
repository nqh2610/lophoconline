import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { insertTutorSchema, addRole, users } from '@/lib/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';

// Enable ISR for GET requests
export const revalidate = 60; // Revalidate every 60 seconds

// GET /api/tutors - Get all tutors with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // ✅ PERFORMANCE: Default limit prevents loading too many tutors
    const DEFAULT_PAGE_SIZE = 12;

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
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : DEFAULT_PAGE_SIZE,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    // If tutorId is specified, fetch single tutor
    const tutorId = searchParams.get('tutorId');
    if (tutorId) {
      const tutor = await storage.getTutorByIdEnriched(parseInt(tutorId));
      if (!tutor) {
        return NextResponse.json([], { status: 200 });
      }
      return NextResponse.json([tutor], {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
        }
      });
    }

    // If userId is specified, fetch tutor by userId
    const userId = searchParams.get('userId');
    if (userId) {
      const tutor = await storage.getTutorByUserId(parseInt(userId));
      if (!tutor) {
        return NextResponse.json([], { status: 200 });
      }
      return NextResponse.json([tutor], {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
        }
      });
    }

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
    console.log('[API POST /tutors] Received data:', body);

    // Remove fields that don't belong to tutors table
    // Keep 'subjects' as it's part of tutors table (JSON cache field)
    const { availableDays, availableTime, subjectGrades, gradeCategory, grades, ...tutorData } = body;

    // Validate the request body
    const validationResult = insertTutorSchema.safeParse(tutorData);

    if (!validationResult.success) {
      console.error('[API POST /tutors] Validation failed:', validationResult.error.errors);
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Check if tutor profile already exists for this user
    const existingTutor = await storage.getTutorByUserId(body.userId);
    if (existingTutor) {
      console.log('[API POST /tutors] Tutor already exists for userId:', body.userId);
      return NextResponse.json(
        { error: 'Tutor profile already exists for this user' },
        { status: 409 }
      );
    }

    const newTutor = await storage.createTutor(validationResult.data);
    console.log('[API POST /tutors] ✅ Tutor created successfully:', newTutor.id);

    // Add "tutor" role to user
    try {
      const user = await storage.getUserById(body.userId);
      if (user) {
        const updatedRoles = addRole(user.role, 'tutor');
        await db.update(users)
          .set({ role: updatedRoles })
          .where(eq(users.id, body.userId));
        console.log('[API POST /tutors] ✅ Added "tutor" role to user:', body.userId);
      }
    } catch (roleError) {
      console.error('[API POST /tutors] ⚠️ Failed to add tutor role:', roleError);
      // Non-critical error - tutor profile was created successfully
    }

    return NextResponse.json(newTutor, { status: 201 });
  } catch (error) {
    console.error('Error creating tutor:', error);
    return NextResponse.json(
      { error: 'Failed to create tutor profile' },
      { status: 500 }
    );
  }
}
