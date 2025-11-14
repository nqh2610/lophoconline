import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

// ✅ PERFORMANCE: Enable ISR + stale-while-revalidate for better performance
export const revalidate = 60; // Revalidate every 60 seconds
export const dynamic = 'force-dynamic'; // Always run dynamically to respect cache headers

// GET /api/tutors/enriched - Get all tutors with their subjects, grade levels, and time slots in ONE request
// This is optimized to reduce database connections from O(n) to O(1)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // ✅ PERFORMANCE: Default limit for initial page load
    const DEFAULT_PAGE_SIZE = 12; // Good for grid layout (3x4 or 4x3)

    const filters = {
      searchText: searchParams.get('searchText') || undefined,
      subject: searchParams.get('subject') || undefined,
      subjectId: searchParams.get('subjectId') ? parseInt(searchParams.get('subjectId')!) : undefined,
      gradeLevel: searchParams.get('gradeLevel') || undefined,
      gradeLevelId: searchParams.get('gradeLevelId') ? parseInt(searchParams.get('gradeLevelId')!) : undefined,
      category: searchParams.get('category') || undefined,
      minRate: searchParams.get('minRate') ? parseInt(searchParams.get('minRate')!) : undefined,
      maxRate: searchParams.get('maxRate') ? parseInt(searchParams.get('maxRate')!) : undefined,
      experience: searchParams.get('experience') ? parseInt(searchParams.get('experience')!) : undefined,
      shiftType: (searchParams.get('shiftType') as 'morning' | 'afternoon' | 'evening') || undefined,
      dayOfWeek: searchParams.get('dayOfWeek') ? parseInt(searchParams.get('dayOfWeek')!) : undefined,
      sortBy: (searchParams.get('sortBy') as 'rating' | 'price' | 'experience' | 'reviews') || undefined,
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : DEFAULT_PAGE_SIZE,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    const tutors = await storage.getTutorsEnriched(filters);

    // Collect gradeLevelIds that may be missing their joined gradeLevel object
    const missingGradeIds = new Set<number>();
    tutors.forEach((t: any) => {
      (t.tutorSubjects || []).forEach((ts: any) => {
        if (!ts.gradeLevel && ts.gradeLevelId) {
          missingGradeIds.add(ts.gradeLevelId);
        }
      });
    });

    // Fetch missing grade level records in batch and map by id
    let gradeMap: Record<number, any> = {};
    if (missingGradeIds.size > 0) {
      const ids = Array.from(missingGradeIds.values());
      const gradeLevels = await storage.getGradeLevelsByIds(ids);
      gradeMap = Object.fromEntries((gradeLevels || []).map((g: any) => [g.id, g]));
    }

    // Ensure each tutor contains a top-level `subjects` array (grouped by subject name + grades)
    const transformed = tutors.map((t: any) => {
      let subjects: Array<{ name: string; grades: string }> = [];

      // Try to build from tutorSubjects first (normalized data)
      if (t.tutorSubjects && t.tutorSubjects.length > 0) {
        // Group by subject name and collect all grades
        const subjectGroups: Record<string, Set<string>> = {};
        t.tutorSubjects.forEach((ts: any) => {
          const subjectName = ts?.subject?.name || ts.subjectName || '';
          if (!subjectName) return;
          
          const gradeName = ts?.gradeLevel?.name || ts.gradeLevelName || (ts.gradeLevelId ? (gradeMap[ts.gradeLevelId]?.name || '') : '');
          
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

      // Fallback to legacy JSON subjects field if tutorSubjects is empty
      if (subjects.length === 0 && t.subjects) {
        try {
          const legacySubjects = typeof t.subjects === 'string' ? JSON.parse(t.subjects) : t.subjects;
          if (Array.isArray(legacySubjects) && legacySubjects.length > 0) {
            subjects = legacySubjects.map((s: any) => ({
              name: s.subject || s.name || '',
              grades: Array.isArray(s.grades) ? s.grades.join(', ') : (s.grades || '')
            })).filter((s: any) => s.name);
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }

      return {
        ...t,
        subjects,
        occupation: (t as any).occupation, // Explicitly include occupation
      };
    });

    // Add cache headers for better performance
    return NextResponse.json(transformed, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (error) {
    console.error('Error fetching enriched tutors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tutors' },
      { status: 500 }
    );
  }
}
