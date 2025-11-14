import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { insertTutorSchema } from '@/lib/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Enable ISR for better performance
export const revalidate = 60; // Revalidate every 60 seconds

// GET /api/tutors/[id] - Get tutor by ID with subjects and time slots
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

    // Use the new enriched method - fetches all data in optimized queries
    const enrichedTutor = await storage.getTutorByIdEnriched(tutorId);

    if (!enrichedTutor) {
      return NextResponse.json(
        { error: 'Tutor not found' },
        { status: 404 }
      );
    }

    // If any tutorSubject is missing gradeLevel but has gradeLevelId, batch fetch those grade levels
    const missingGradeIds = new Set<number>();
    (enrichedTutor.tutorSubjects || []).forEach((ts: any) => {
      if (!ts.gradeLevel && ts.gradeLevelId) missingGradeIds.add(ts.gradeLevelId);
    });

    let gradeMap: Record<number, any> = {};
    if (missingGradeIds.size > 0) {
      const ids = Array.from(missingGradeIds.values());
      const gradeLevels = await storage.getGradeLevelsByIds(ids);
      gradeMap = Object.fromEntries((gradeLevels || []).map((g: any) => [g.id, g]));
    }

    // Build subjects array for backward compatibility
    let subjects: Array<{ name: string; grades: string }> = [];
    
    // Try from tutorSubjects first
    if (enrichedTutor.tutorSubjects && enrichedTutor.tutorSubjects.length > 0) {
      const subjectGroups: Record<string, Set<string>> = {};
      enrichedTutor.tutorSubjects.forEach((ts: any) => {
        const subjectName = ts?.subject?.name || ts.subjectName || '';
        if (!subjectName) return;
        
        const gradeName = ts?.gradeLevel?.name || ts.gradeLevelName || (ts.gradeLevelId && gradeMap[ts.gradeLevelId]?.name) || '';
        
        if (!subjectGroups[subjectName]) {
          subjectGroups[subjectName] = new Set();
        }
        if (gradeName) {
          subjectGroups[subjectName].add(gradeName);
        }
      });

      subjects = Object.entries(subjectGroups).map(([name, gradesSet]) => ({
        name,
        grades: Array.from(gradesSet).join(', ')
      }));
    }

    // Fallback to legacy JSON if tutorSubjects is empty
    if (subjects.length === 0 && enrichedTutor.subjects) {
      try {
        const legacySubjects = typeof enrichedTutor.subjects === 'string' 
          ? JSON.parse(enrichedTutor.subjects) 
          : enrichedTutor.subjects;
        if (Array.isArray(legacySubjects) && legacySubjects.length > 0) {
          subjects = legacySubjects.map((s: any) => ({
            name: s.subject || s.name || '',
            grades: Array.isArray(s.grades) ? s.grades.join(', ') : (s.grades || '')
          })).filter((s: any) => s.name);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Return enriched tutor with tutorSubjects for frontend compatibility
    const transformedTutor = {
      id: enrichedTutor.id,
      userId: enrichedTutor.userId,
      fullName: (enrichedTutor as any).fullName,
      phone: (enrichedTutor as any).phone,
      avatar: (enrichedTutor as any).avatar,
      bio: enrichedTutor.bio,
      teachingMethod: enrichedTutor.teachingMethod,
      experience: enrichedTutor.experience,
      hourlyRate: enrichedTutor.hourlyRate,
      rating: enrichedTutor.rating,
      totalReviews: enrichedTutor.totalReviews,
      totalStudents: enrichedTutor.totalStudents,
      occupation: (enrichedTutor as any).occupation,
      education: enrichedTutor.education,
      certifications: enrichedTutor.certifications,
      achievements: enrichedTutor.achievements,
      verificationStatus: enrichedTutor.verificationStatus,
      videoIntro: enrichedTutor.videoIntro,
      // Add subjects array for TutorCard compatibility
      subjects,
      // Keep tutorSubjects with full subject & gradeLevel objects for frontend
      tutorSubjects: (enrichedTutor.tutorSubjects || []).map(ts => {
        const tsAny = ts as any;
        return {
          ...ts,
          subject: ts.subject || { id: 0, name: tsAny.subjectName || '', category: tsAny.category || '', description: null, isActive: 1, createdAt: new Date() },
          gradeLevel: ts.gradeLevel || (ts.gradeLevelId && gradeMap[ts.gradeLevelId]) || { id: 0, name: tsAny.gradeLevelName || '', category: tsAny.category || '', isActive: 1, createdAt: new Date(), subjectId: null }
        };
      }),
      // ✅ FIX: Return full timeSlots data including id for booking
      timeSlots: enrichedTutor.timeSlots || []
    };

    return NextResponse.json(transformedTutor, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (error) {
    console.error('Error fetching tutor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tutor' },
      { status: 500 }
    );
  }
}

// PUT /api/tutors/[id] - Update tutor profile (requires authentication)
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

    const tutor = await storage.getTutorById(tutorId);

    if (!tutor) {
      return NextResponse.json(
        { error: 'Tutor not found' },
        { status: 404 }
      );
    }

    console.log('[PUT /api/tutors/[id]] Checking ownership:');
    console.log('- Tutor ID:', tutorId);
    console.log('- Tutor userId:', tutor.userId);
    console.log('- Session user ID:', session.user.id);
    console.log('- Session user ID (parsed):', parseInt(session.user.id));

    // Check if user owns this tutor profile
    if (tutor.userId !== parseInt(session.user.id)) {
      console.error('[PUT /api/tutors/[id]] Forbidden: userId mismatch');
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate the update data (partial)
    const validationResult = insertTutorSchema.partial().safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const updatedTutor = await storage.updateTutor(tutorId, validationResult.data);

    return NextResponse.json(updatedTutor, { status: 200 });
  } catch (error) {
    console.error('Error updating tutor:', error);
    return NextResponse.json(
      { error: 'Failed to update tutor profile' },
      { status: 500 }
    );
  }
}
