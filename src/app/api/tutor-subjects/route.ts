import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { insertTutorSubjectSchema } from '@/lib/schema';
import { db } from '@/lib/db';
import { tutorSubjects, subjects, gradeLevels } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// GET /api/tutor-subjects?tutorId=123 - Get tutor-subject relationships with details
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tutorId = searchParams.get('tutorId');

    if (!tutorId) {
      return NextResponse.json(
        { error: 'tutorId is required' },
        { status: 400 }
      );
    }

    // Get tutor-subject relationships with subject and grade level details
    const relationships = await db
      .select({
        id: tutorSubjects.id,
        tutorId: tutorSubjects.tutorId,
        subjectId: tutorSubjects.subjectId,
        subjectName: subjects.name,
        gradeLevelId: tutorSubjects.gradeLevelId,
        gradeLevelName: gradeLevels.name,
        category: gradeLevels.category,
      })
      .from(tutorSubjects)
      .innerJoin(subjects, eq(subjects.id, tutorSubjects.subjectId))
      .innerJoin(gradeLevels, eq(gradeLevels.id, tutorSubjects.gradeLevelId))
      .where(eq(tutorSubjects.tutorId, parseInt(tutorId)));

    return NextResponse.json(relationships);
  } catch (error) {
    console.error('Error fetching tutor-subject relationships:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tutor-subject relationships' },
      { status: 500 }
    );
  }
}

// POST /api/tutor-subjects - Create tutor-subject relationship
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = insertTutorSubjectSchema.parse(body);

    // Create the tutor-subject relationship
    const tutorSubject = await storage.createTutorSubject(validatedData);

    return NextResponse.json(tutorSubject, { status: 201 });
  } catch (error) {
    console.error('Error creating tutor-subject relationship:', error);

    if (error instanceof Error && error.message.includes('parse')) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create tutor-subject relationship' },
      { status: 500 }
    );
  }
}
