/**
 * Sync Tutor Subjects - Hybrid Storage Approach
 * 
 * Source of Truth: tutor_subjects table (normalized)
 * Cache: tutors.subjects JSON field (for fast display)
 * 
 * This utility ensures data consistency between both storage methods.
 */

import { db } from './db';
import { tutors, tutorSubjects, subjects, gradeLevels } from './schema';
import { eq } from 'drizzle-orm';

/**
 * Sync tutor subjects from tutor_subjects table to tutors.subjects JSON field
 * 
 * @param tutorId - The tutor ID to sync
 * @returns Promise<void>
 */
export async function syncTutorSubjectsToJSON(tutorId: number): Promise<void> {
  try {
    console.log(`[Sync] Starting sync for tutor ${tutorId}...`);

    // 1. Query từ tutor_subjects (source of truth)
    const tutorSubjectsData = await db
      .select({
        subjectName: subjects.name,
        gradeName: gradeLevels.name,
      })
      .from(tutorSubjects)
      .innerJoin(subjects, eq(subjects.id, tutorSubjects.subjectId))
      .innerJoin(gradeLevels, eq(gradeLevels.id, tutorSubjects.gradeLevelId))
      .where(eq(tutorSubjects.tutorId, tutorId));

    console.log(`[Sync] Found ${tutorSubjectsData.length} tutor_subjects records`);

    // 2. Group by subject
    const groupedBySubject = tutorSubjectsData.reduce((acc, item) => {
      if (!acc[item.subjectName]) {
        acc[item.subjectName] = new Set<string>();
      }
      acc[item.subjectName].add(item.gradeName);
      return acc;
    }, {} as Record<string, Set<string>>);

    // 3. Build JSON format
    const jsonData = Object.entries(groupedBySubject).map(([subject, gradesSet]) => ({
      subject,
      grades: Array.from(gradesSet).sort(), // Sort for consistent ordering
    }));

    // Sort subjects alphabetically for consistent ordering
    jsonData.sort((a, b) => a.subject.localeCompare(b.subject, 'vi'));

    const jsonString = JSON.stringify(jsonData);

    console.log(`[Sync] Grouped into ${jsonData.length} subjects:`, 
      jsonData.map(s => `${s.subject} (${s.grades.length} grades)`).join(', ')
    );

    // 4. Update tutors.subjects JSON field
    await db.update(tutors)
      .set({ subjects: jsonString })
      .where(eq(tutors.id, tutorId));

    console.log(`[Sync] ✅ Successfully synced tutor ${tutorId} subjects to JSON`);
  } catch (error) {
    console.error(`[Sync] ❌ Error syncing tutor ${tutorId}:`, error);
    throw new Error(`Failed to sync tutor ${tutorId} subjects: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Batch sync multiple tutors
 * 
 * @param tutorIds - Array of tutor IDs to sync
 * @returns Promise with results
 */
export async function syncMultipleTutorsToJSON(
  tutorIds: number[]
): Promise<{ success: number[]; failed: number[] }> {
  const results = { success: [] as number[], failed: [] as number[] };

  for (const tutorId of tutorIds) {
    try {
      await syncTutorSubjectsToJSON(tutorId);
      results.success.push(tutorId);
    } catch (error) {
      console.error(`Failed to sync tutor ${tutorId}:`, error);
      results.failed.push(tutorId);
    }
  }

  console.log(`[Batch Sync] Completed: ${results.success.length} success, ${results.failed.length} failed`);
  return results;
}

/**
 * Sync all tutors in the system
 * Useful for initial migration or bulk operations
 * 
 * @returns Promise with total count
 */
export async function syncAllTutorsToJSON(): Promise<{
  total: number;
  success: number;
  failed: number;
}> {
  console.log('[Sync All] Starting full sync...');

  // Get all tutor IDs
  const allTutors = await db.select({ id: tutors.id }).from(tutors);
  const tutorIds = allTutors.map(t => t.id);

  console.log(`[Sync All] Found ${tutorIds.length} tutors to sync`);

  const results = await syncMultipleTutorsToJSON(tutorIds);

  return {
    total: tutorIds.length,
    success: results.success.length,
    failed: results.failed.length,
  };
}

/**
 * Verify sync integrity - check if JSON matches tutor_subjects table
 * 
 * @param tutorId - The tutor ID to verify
 * @returns Promise<boolean> - true if synced, false if mismatch
 */
export async function verifySyncIntegrity(tutorId: number): Promise<boolean> {
  try {
    // Get current JSON
    const [tutor] = await db.select({ subjects: tutors.subjects })
      .from(tutors)
      .where(eq(tutors.id, tutorId));

    if (!tutor) {
      console.warn(`[Verify] Tutor ${tutorId} not found`);
      return false;
    }

    // Get tutor_subjects data
    const tutorSubjectsData = await db
      .select({
        subjectName: subjects.name,
        gradeName: gradeLevels.name,
      })
      .from(tutorSubjects)
      .innerJoin(subjects, eq(subjects.id, tutorSubjects.subjectId))
      .innerJoin(gradeLevels, eq(gradeLevels.id, tutorSubjects.gradeLevelId))
      .where(eq(tutorSubjects.tutorId, tutorId));

    // Build expected JSON
    const groupedBySubject = tutorSubjectsData.reduce((acc, item) => {
      if (!acc[item.subjectName]) {
        acc[item.subjectName] = new Set<string>();
      }
      acc[item.subjectName].add(item.gradeName);
      return acc;
    }, {} as Record<string, Set<string>>);

    const expectedJson = Object.entries(groupedBySubject)
      .map(([subject, gradesSet]) => ({
        subject,
        grades: Array.from(gradesSet).sort(),
      }))
      .sort((a, b) => a.subject.localeCompare(b.subject, 'vi'));

    const expectedJsonString = JSON.stringify(expectedJson);

    // Compare
    const isMatch = tutor.subjects === expectedJsonString;

    if (!isMatch) {
      console.warn(`[Verify] ⚠️ Tutor ${tutorId} JSON mismatch!`);
      console.warn('Expected:', expectedJsonString);
      console.warn('Actual:', tutor.subjects);
    } else {
      console.log(`[Verify] ✅ Tutor ${tutorId} JSON is in sync`);
    }

    return isMatch;
  } catch (error) {
    console.error(`[Verify] Error verifying tutor ${tutorId}:`, error);
    return false;
  }
}
