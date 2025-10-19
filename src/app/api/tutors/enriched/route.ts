import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

// GET /api/tutors/enriched - Get all tutors with their subjects, grade levels, and time slots in ONE request
// This is optimized to reduce database connections from O(n) to O(1)
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

    const tutors = await storage.getTutorsEnriched(filters);

    // Add cache headers for better performance
    return NextResponse.json(tutors, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (error) {
    console.error('Error fetching enriched tutors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tutors' },
      { status: 500 }
    );
  }
}
