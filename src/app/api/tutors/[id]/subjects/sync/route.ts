/**
 * API Route: /api/tutors/[id]/subjects/sync
 * 
 * Sync tutor subjects from tutor_subjects table to JSON cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncTutorSubjectsToJSON } from '@/lib/sync-tutor-subjects';

/**
 * POST /api/tutors/[id]/subjects/sync
 * Sync tutor subjects to JSON cache
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tutorId = parseInt(params.id);

    if (isNaN(tutorId)) {
      return NextResponse.json(
        { error: 'Invalid tutor ID' },
        { status: 400 }
      );
    }

    // Sync to JSON cache
    console.log(`[API POST /tutors/${tutorId}/subjects/sync] Starting sync...`);
    await syncTutorSubjectsToJSON(tutorId);
    console.log(`[API POST /tutors/${tutorId}/subjects/sync] ✅ Sync successful`);

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      tutorId,
    });
  } catch (error) {
    console.error('Error syncing tutor subjects:', error);
    return NextResponse.json(
      { error: 'Failed to sync tutor subjects' },
      { status: 500 }
    );
  }
}
