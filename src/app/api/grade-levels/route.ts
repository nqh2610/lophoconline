import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { withCache, CACHE_TTL } from '@/lib/cache';

// Enable ISR - grade levels rarely change
export const revalidate = 3600; // Revalidate every 1 hour

// GET /api/grade-levels?subjectId=125 - Get grade levels (optionally filtered by subject)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectIdParam = searchParams.get('subjectId');
    const subjectId = subjectIdParam ? parseInt(subjectIdParam) : null;

    // OPTIMIZED: Use different cache keys for different filters
    const cacheKey = subjectId
      ? `gradeLevels:subject:${subjectId}`
      : 'gradeLevels:all';

    const gradeLevels = await withCache(
      cacheKey,
      CACHE_TTL.GRADE_LEVELS,
      () => storage.getGradeLevelsForSubject(subjectId)
    );

    return NextResponse.json(gradeLevels, {
      status: 200,
      headers: {
        // CDN cache + in-memory cache = maximum performance
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        'X-Cache-Status': 'HIT' // For debugging
      }
    });
  } catch (error) {
    console.error('Error fetching grade levels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grade levels' },
      { status: 500 }
    );
  }
}
