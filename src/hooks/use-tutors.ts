import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import type { Tutor, Subject, GradeLevel, TutorSubject, TimeSlot } from '@/lib/schema';

// Extended tutor type with related data
export interface EnrichedTutor extends Tutor {
  tutorSubjects?: Array<TutorSubject & { subject: Subject; gradeLevel: GradeLevel }>;
  timeSlots?: TimeSlot[];
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

  return response.json();
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
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
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
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
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

// Hook to fetch grade levels
export function useGradeLevels() {
  return useQuery<GradeLevel[], Error>({
    queryKey: ['gradeLevels'],
    queryFn: async () => {
      const response = await fetch('/api/grade-levels');
      if (!response.ok) throw new Error('Failed to fetch grade levels');
      return response.json();
    },
    staleTime: 1000 * 60 * 60, // 1 hour (grade levels don't change often)
    gcTime: 1000 * 60 * 120, // 2 hours
  });
}
