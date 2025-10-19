import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { withCache, CACHE_TTL } from '@/lib/cache';

// GET /api/grade-levels - Get all grade levels (with in-memory cache + CDN cache)
export async function GET() {
  try {
    // OPTIMIZED: Use in-memory cache to avoid DB queries for static data
    const gradeLevels = await withCache(
      'gradeLevels:all',
      CACHE_TTL.GRADE_LEVELS,
      () => storage.getAllGradeLevels()
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
