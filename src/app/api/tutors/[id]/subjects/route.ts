/**
 * API Route: /api/tutors/[id]/subjects
 * 
 * Manages tutor-subject relationships with automatic JSON sync (Hybrid approach)
 * Source of Truth: tutor_subjects table
 * Cache: tutors.subjects JSON field
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { tutorSubjects, tutors, subjects as subjectsTable, gradeLevels } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { syncTutorSubjectsToJSON } from '@/lib/sync-tutor-subjects';

/**
 * GET /api/tutors/[id]/subjects
 * Retrieve all subjects and grades for a tutor
 */
export async function GET(
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

    // Get tutor-subjects with subject and grade details
    const results = await db
      .select({
        id: tutorSubjects.id,
        tutorId: tutorSubjects.tutorId,
        subjectId: tutorSubjects.subjectId,
        subjectName: subjectsTable.name,
        gradeLevelId: tutorSubjects.gradeLevelId,
        gradeName: gradeLevels.name,
        gradeCategory: gradeLevels.category,
      })
      .from(tutorSubjects)
      .innerJoin(subjectsTable, eq(subjectsTable.id, tutorSubjects.subjectId))
      .innerJoin(gradeLevels, eq(gradeLevels.id, tutorSubjects.gradeLevelId))
      .where(eq(tutorSubjects.tutorId, tutorId));

    // Group by subject
    const grouped = results.reduce((acc, item) => {
      const key = item.subjectId;
      if (!acc[key]) {
        acc[key] = {
          subjectId: item.subjectId,
          subjectName: item.subjectName,
          grades: [],
        };
      }
      acc[key].grades.push({
        id: item.gradeLevelId,
        name: item.gradeName,
        category: item.gradeCategory,
      });
      return acc;
    }, {} as Record<number, any>);

    return NextResponse.json({
      tutorId,
      subjects: Object.values(grouped),
    });
  } catch (error) {
    console.error('Error fetching tutor subjects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tutor subjects' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tutors/[id]/subjects
 * Replace all subjects and grades for a tutor (authenticated)
 * 
 * Body: {
 *   subjects: [
 *     { subjectId: number, gradeIds: number[] },
 *     ...
 *   ]
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tutorId = parseInt(params.id);

    if (isNaN(tutorId)) {
      return NextResponse.json(
        { error: 'Invalid tutor ID' },
        { status: 400 }
      );
    }

    // Verify tutor exists and user has permission
    const [tutor] = await db
      .select({ userId: tutors.userId })
      .from(tutors)
      .where(eq(tutors.id, tutorId))
      .limit(1);

    if (!tutor) {
      return NextResponse.json(
        { error: 'Tutor not found' },
        { status: 404 }
      );
    }

    // Check authorization (user must own this tutor profile OR be admin)
    const userId = parseInt(session.user.id);
    const isAdmin = session.user.roles?.includes('admin');
    
    if (tutor.userId !== userId && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this tutor profile' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    if (!body.subjects || !Array.isArray(body.subjects)) {
      return NextResponse.json(
        { error: 'Invalid input: subjects must be an array' },
        { status: 400 }
      );
    }

    // Validate each subject entry
    for (const subject of body.subjects) {
      if (!subject.subjectId || !Array.isArray(subject.gradeIds) || subject.gradeIds.length === 0) {
        return NextResponse.json(
          { error: 'Invalid input: each subject must have subjectId and non-empty gradeIds array' },
          { status: 400 }
        );
      }
    }

    // 1. Delete existing tutor-subjects
    await db.delete(tutorSubjects).where(eq(tutorSubjects.tutorId, tutorId));

    // 2. Insert new tutor-subjects (Source of Truth)
    const records = body.subjects.flatMap((s: any) =>
      s.gradeIds.map((gradeId: number) => ({
        tutorId,
        subjectId: s.subjectId,
        gradeLevelId: gradeId,
      }))
    );

    if (records.length > 0) {
      await db.insert(tutorSubjects).values(records);
    }

    // 3. Sync to JSON cache (Hybrid approach)
    console.log(`[API PUT /tutors/${tutorId}/subjects] Syncing to JSON cache...`);
    try {
      await syncTutorSubjectsToJSON(tutorId);
      console.log(`[API PUT /tutors/${tutorId}/subjects] ✅ Sync successful`);
    } catch (syncError) {
      console.error(`[API PUT /tutors/${tutorId}/subjects] ⚠️ Sync failed (non-critical):`, syncError);
      // Continue - sync failure is non-critical
    }

    // 4. Return updated data
    const updated = await db
      .select({
        subjectId: tutorSubjects.subjectId,
        subjectName: subjectsTable.name,
        gradeLevelId: tutorSubjects.gradeLevelId,
        gradeName: gradeLevels.name,
      })
      .from(tutorSubjects)
      .innerJoin(subjectsTable, eq(subjectsTable.id, tutorSubjects.subjectId))
      .innerJoin(gradeLevels, eq(gradeLevels.id, tutorSubjects.gradeLevelId))
      .where(eq(tutorSubjects.tutorId, tutorId));

    return NextResponse.json({
      success: true,
      tutorId,
      count: updated.length,
      subjects: updated,
    });
  } catch (error) {
    console.error('Error updating tutor subjects:', error);
    return NextResponse.json(
      { error: 'Failed to update tutor subjects' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tutors/[id]/subjects
 * Remove all subjects for a tutor (authenticated)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tutorId = parseInt(params.id);

    if (isNaN(tutorId)) {
      return NextResponse.json(
        { error: 'Invalid tutor ID' },
        { status: 400 }
      );
    }

    // Verify authorization
    const [tutor] = await db
      .select({ userId: tutors.userId })
      .from(tutors)
      .where(eq(tutors.id, tutorId))
      .limit(1);

    if (!tutor) {
      return NextResponse.json(
        { error: 'Tutor not found' },
        { status: 404 }
      );
    }

    const userId = parseInt(session.user.id);
    const isAdmin = session.user.roles?.includes('admin');

    if (tutor.userId !== userId && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Delete all tutor-subjects
    await db.delete(tutorSubjects).where(eq(tutorSubjects.tutorId, tutorId));

    // Sync to JSON (empty array)
    try {
      await syncTutorSubjectsToJSON(tutorId);
    } catch (syncError) {
      console.error('Sync failed (non-critical):', syncError);
    }

    return NextResponse.json({
      success: true,
      message: 'All subjects removed',
    });
  } catch (error) {
    console.error('Error deleting tutor subjects:', error);
    return NextResponse.json(
      { error: 'Failed to delete tutor subjects' },
      { status: 500 }
      );
  }
}
