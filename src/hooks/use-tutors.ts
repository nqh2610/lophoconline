import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import type { Tutor, Subject, GradeLevel, TutorSubject, TutorAvailability, Occupation } from '@/lib/schema';

// Extended tutor type with related data
export interface EnrichedTutor extends Tutor {
  occupation?: Occupation;
  tutorSubjects?: Array<TutorSubject & { subject: Subject; gradeLevel: GradeLevel }>;
  timeSlots?: TutorAvailability[];
  avatar?: string | null; // ✅ From users table JOIN
  fullName?: string | null; // ✅ From users table JOIN
  phone?: string | null; // ✅ From users table JOIN
}

interface TutorFilters {
  searchText?: string;
  subject?: string;
  subjectId?: number;
  gradeLevel?: string;
  gradeLevelId?: number;
  category?: string;
  minRate?: number;
  maxRate?: number;
  experience?: number;
  shiftType?: 'morning' | 'afternoon' | 'evening';
  dayOfWeek?: number;
  sortBy?: 'rating' | 'price' | 'experience' | 'reviews';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Fetch all tutors with filters (using ENRICHED endpoint for better performance)
async function fetchTutors(filters?: TutorFilters): Promise<EnrichedTutor[]> {
  const params = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
  }

  // Use enriched endpoint to get all data in ONE request - reduces DB connections dramatically
  const url = `/api/tutors/enriched${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch tutors');
  }

  const data = await response.json();

  // Transform tutorSubjects to subjects format for easier consumption
  return data.map((tutor: any) => {
    // If backend returned joined tutorSubjects, prefer that
    const tutorSubjectData = Array.isArray(tutor.tutorSubjects) ? tutor.tutorSubjects : [];

    let subjects: Array<{ name: string; grades?: string }> = [];

    if (tutorSubjectData.length > 0) {
      // Map joined rows to simple subjects list (dedupe by subject + join grade names)
      const groups: Record<string, Set<string>> = {};
      tutorSubjectData.forEach((ts: any) => {
        const subjectName = ts?.subject?.name || ts.subjectName;
        const gradeName = ts?.gradeLevel?.name || ts.gradeLevelName || '';
        if (!subjectName) return;
        groups[subjectName] = groups[subjectName] || new Set<string>();
        if (gradeName) groups[subjectName].add(gradeName);
      });

      subjects = Object.entries(groups).map(([name, gradesSet]) => ({
        name,
        grades: Array.from(gradesSet).join(', ')
      }));
    }

    // Fallback: some tutors may still have legacy `subjects` JSON stored on tutors.subjects
    // which has shape [{ subject, grades: string[] }]
    if (subjects.length === 0 && tutor.subjects) {
      try {
        const parsed = typeof tutor.subjects === 'string' ? JSON.parse(tutor.subjects) : tutor.subjects;
        if (Array.isArray(parsed) && parsed.length > 0) {
          subjects = parsed.map((s: any) => ({ name: s.subject || s.name || '', grades: Array.isArray(s.grades) ? s.grades.join(', ') : s.grades || '' }));
        }
      } catch (e) {
        // ignore parse errors and keep subjects empty
      }
    }

    return {
      ...tutor,
      subjects,
    };
  });
}

// Fetch single tutor by ID (returns enriched data with subjects and time slots)
async function fetchTutorById(id: number | string): Promise<EnrichedTutor> {
  const response = await fetch(`/api/tutors/${id}`);

  if (!response.ok) {
    throw new Error('Failed to fetch tutor');
  }

  return response.json();
}

// Hook to fetch all tutors (now returns enriched data)
export function useTutors(
  filters?: TutorFilters,
  options?: Omit<UseQueryOptions<EnrichedTutor[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<EnrichedTutor[], Error>({
    queryKey: ['tutors', filters],
    queryFn: () => fetchTutors(filters),
    staleTime: 1000 * 60, // OPTIMIZED: 60 seconds (tutor list doesn't change often)
    gcTime: 1000 * 60 * 5, // OPTIMIZED: 5 minutes (keep longer in memory)
    ...options,
  });
}

// Hook to fetch single tutor (returns enriched data)
export function useTutor(
  id: number | string | undefined,
  options?: Omit<UseQueryOptions<EnrichedTutor, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<EnrichedTutor, Error>({
    queryKey: ['tutor', id],
    queryFn: () => fetchTutorById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes - tutor info doesn't change often
    gcTime: 1000 * 60 * 30, // 30 minutes
    ...options,
  });
}

// Hook to fetch subjects
export function useSubjects() {
  return useQuery<Subject[], Error>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await fetch('/api/subjects');
      if (!response.ok) throw new Error('Failed to fetch subjects');
      return response.json();
    },
    staleTime: 1000 * 60 * 60, // 1 hour (subjects don't change often)
    gcTime: 1000 * 60 * 120, // 2 hours
  });
}

// Hook to fetch grade levels (optionally filtered by subjectId)
export function useGradeLevels(subjectId?: number | null) {
  return useQuery<GradeLevel[], Error>({
    queryKey: ['gradeLevels', subjectId],
    queryFn: async () => {
      const url = subjectId
        ? `/api/grade-levels?subjectId=${subjectId}`
        : '/api/grade-levels';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch grade levels');
      return response.json();
    },
    staleTime: 1000 * 60 * 60, // 1 hour (grade levels don't change often)
    gcTime: 1000 * 60 * 120, // 2 hours
  });
}

// Hook to fetch occupations
export function useOccupations() {
  return useQuery<Occupation[], Error>({
    queryKey: ['occupations'],
    queryFn: async () => {
      const response = await fetch('/api/occupations');
      if (!response.ok) throw new Error('Failed to fetch occupations');
      return response.json();
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 120, // 2 hours
  });
}
