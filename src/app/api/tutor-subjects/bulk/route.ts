import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tutorSubjects } from '@/lib/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/tutor-subjects/bulk - Bulk insert tutor subjects
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
    const { tutorId, subjects } = body;

    if (!tutorId || !Array.isArray(subjects) || subjects.length === 0) {
      return NextResponse.json(
        { error: 'Invalid input: tutorId and subjects array required' },
        { status: 400 }
      );
    }

    // Validate all subjects have required fields
    for (const subject of subjects) {
      if (!subject.subjectId || !subject.gradeLevelId) {
        return NextResponse.json(
          { error: 'Invalid input: each subject must have subjectId and gradeLevelId' },
          { status: 400 }
        );
      }
    }

    // Bulk insert all subjects in ONE query
    const values = subjects.map(s => ({
      tutorId: tutorId,
      subjectId: s.subjectId,
      gradeLevelId: s.gradeLevelId,
    }));

    await db.insert(tutorSubjects).values(values);

    return NextResponse.json(
      {
        message: 'Subjects inserted successfully',
        count: values.length
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error bulk inserting tutor subjects:', error);
    return NextResponse.json(
      { error: 'Failed to insert subjects' },
      { status: 500 }
    );
  }
}
