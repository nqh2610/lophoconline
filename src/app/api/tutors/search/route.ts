import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

// GET /api/tutors/search - Quick search for autocomplete
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    // Return empty if query is too short
    if (query.trim().length < 2) {
      return NextResponse.json([], { status: 200 });
    }

    // Get tutors with search text, limit to 8 results for autocomplete
    const tutors = await storage.getAllTutors({
      searchText: query,
      limit: 8,
      sortBy: 'rating',
      sortOrder: 'desc',
    });

    // Return simplified tutor data for autocomplete
    const suggestions = tutors.map(tutor => ({
      id: tutor.id,
      name: tutor.fullName,
      avatar: tutor.avatar,
      rating: tutor.rating,
      hourlyRate: tutor.hourlyRate,
      occupation: tutor.occupation,
      verified: tutor.verificationStatus === 'verified',
      // Include a preview of subjects (will be in tutorSubjects)
      subjects: [] as string[],
    }));

    return NextResponse.json(suggestions, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    });
  } catch (error) {
    console.error('Error searching tutors:', error);
    return NextResponse.json(
      { error: 'Failed to search tutors' },
      { status: 500 }
    );
  }
}
