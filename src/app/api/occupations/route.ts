import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { occupations } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// Enable ISR - rarely changes
export const revalidate = 3600; // 1 hour

// GET /api/occupations - Get all occupations
export async function GET() {
  try {
    const allOccupations = await db
      .select()
      .from(occupations)
      .where(eq(occupations.isActive, 1))
      .orderBy(occupations.sortOrder);

    return NextResponse.json(allOccupations, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      }
    });
  } catch (error) {
    console.error('Error fetching occupations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch occupations' },
      { status: 500 }
    );
  }
}
