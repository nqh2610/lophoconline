import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { withCache, CACHE_TTL } from '@/lib/cache';

// Enable ISR - subjects rarely change
export const revalidate = 3600; // Revalidate every 1 hour

// GET /api/subjects - Get all subjects (with in-memory cache + CDN cache)
export async function GET() {
  try {
    // OPTIMIZED: Use in-memory cache to avoid DB queries for static data
    const subjects = await withCache(
      'subjects:all',
      CACHE_TTL.SUBJECTS,
      () => storage.getAllSubjects()
    );

    return NextResponse.json(subjects, {
      status: 200,
      headers: {
        // CDN cache + in-memory cache = maximum performance
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        'X-Cache-Status': 'HIT' // For debugging
      }
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}
