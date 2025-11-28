/**
 * ✅ REFACTORING HELPERS
 * Helper methods để hỗ trợ refactoring lessons → bookings
 * và thêm validation cho self-booking, trial constraints
 */

import { db } from "./db";
import { bookings, students, tutors, users } from "./schema";
import { eq, and, sql } from "drizzle-orm";

export class BookingValidation {
  /**
   * ✅ SECURITY: Check if student is trying to book themselves as tutor
   * Prevents self-booking when user has both student and tutor roles
   */
  static async checkSelfBooking(studentId: number, tutorId: number): Promise<void> {
    const [student] = await db
      .select({ userId: students.userId })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    const [tutor] = await db
      .select({ userId: tutors.userId })
      .from(tutors)
      .where(eq(tutors.id, tutorId))
      .limit(1);

    if (student && tutor && student.userId === tutor.userId) {
      throw new Error("Bạn không thể đặt lịch học với chính mình");
    }
  }

  /**
   * ✅ CONSTRAINT: Check if student already has trial booking with this tutor
   * Enforces 1 trial booking per student-tutor pair
   */
  static async checkTrialBookingExists(
    studentId: number,
    tutorId: number
  ): Promise<boolean> {
    const [existing] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.studentId, studentId),
          eq(bookings.tutorId, tutorId)
          // All bookings in trial_bookings table are trials
        )
      )
      .limit(1);

    return !!existing;
  }

  /**
   * ✅ VALIDATION: Get trial booking count for student
   */
  static async getTrialBookingCount(studentId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bookings)
      .where(
        // All bookings in trial_bookings table are trials
        eq(bookings.studentId, studentId)
      );

    return result[0]?.count || 0;
  }

  /**
   * ✅ COMPREHENSIVE: Validate booking before creation
   */
  static async validateBooking(params: {
    studentId: number;
    tutorId: number;
    isTrial: boolean;
  }): Promise<{ valid: boolean; error?: string }> {
    const { studentId, tutorId, isTrial } = params;

    // Check 1: Self-booking
    try {
      await this.checkSelfBooking(studentId, tutorId);
    } catch (error: any) {
      return { valid: false, error: error.message };
    }

    // Check 2: Trial booking constraints
    if (isTrial) {
      // Check if already has trial with this tutor
      const hasTrialWithTutor = await this.checkTrialBookingExists(studentId, tutorId);
      if (hasTrialWithTutor) {
        return {
          valid: false,
          error: "Bạn đã có buổi học thử với giáo viên này rồi",
        };
      }

      // Check max 3 trials total
      const trialCount = await this.getTrialBookingCount(studentId);
      if (trialCount >= 3) {
        return {
          valid: false,
          error: "Bạn đã sử dụng hết 3 lượt học thử miễn phí",
        };
      }
    }

    return { valid: true };
  }
}

/**
 * ✅ SYNC: Helpers để đồng bộ tutors.subjects (JSON) với tutor_subjects table
 */
export class SubjectSync {
  /**
   * Rebuild tutors.subjects JSON from tutor_subjects table
   */
  static async syncJsonFromTable(tutorId: number): Promise<void> {
    // This will be handled by MySQL triggers in production
    // This method is for manual sync or initial migration
    
    const result = await db.execute(sql`
      UPDATE tutors 
      SET subjects = (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'subjectId', ts.subject_id,
            'subjectName', s.name,
            'grades', (
              SELECT JSON_ARRAYAGG(gl.name)
              FROM tutor_subjects ts2
              INNER JOIN grade_levels gl ON ts2.grade_level_id = gl.id
              WHERE ts2.tutor_id = ${tutorId}
              AND ts2.subject_id = ts.subject_id
              AND ts2.is_active = 1
            )
          )
        )
        FROM tutor_subjects ts
        INNER JOIN subjects s ON ts.subject_id = s.id
        WHERE ts.tutor_id = ${tutorId}
        AND ts.is_active = 1
        GROUP BY ts.subject_id, s.name
      )
      WHERE id = ${tutorId}
    `);
  }

  /**
   * Parse tutors.subjects JSON and rebuild tutor_subjects table
   * @param tutorId - ID of tutor
   * @param subjectsJson - JSON string from tutors.subjects column
   */
  static async syncTableFromJson(tutorId: number, subjectsJson: string): Promise<void> {
    // Parse JSON
    let subjects: any[];
    try {
      subjects = JSON.parse(subjectsJson);
    } catch {
      console.error(`Failed to parse subjects JSON for tutor ${tutorId}`);
      return;
    }

    // This should be done at application layer when updating tutor profile
    // Not recommended to do frequently as it's managed by triggers
    
    // Delete existing tutor_subjects
    await db.execute(sql`
      DELETE FROM tutor_subjects WHERE tutor_id = ${tutorId}
    `);

    // Insert new records
    for (const subject of subjects) {
      const subjectId = subject.subjectId;
      const grades = subject.grades || [];

      for (const gradeName of grades) {
        // Get grade_level_id from grade name
        const [gradeLevel] = await db.execute(sql`
          SELECT id FROM grade_levels WHERE name = ${gradeName} LIMIT 1
        `);

        if (gradeLevel) {
          await db.execute(sql`
            INSERT INTO tutor_subjects (tutor_id, subject_id, grade_level_id, is_active)
            VALUES (${tutorId}, ${subjectId}, ${(gradeLevel as any).id}, 1)
            ON DUPLICATE KEY UPDATE is_active = 1
          `);
        }
      }
    }
  }
}

/**
 * ✅ HELPER: Get user with full profile (joins users + tutors/students)
 */
export async function getUserWithFullProfile(userId: number) {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      fullName: users.fullName, // ✅ NEW: from users table
      phone: users.phone,
      avatar: users.avatar,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;

  // Get tutor profile if exists
  const [tutorProfile] = await db
    .select()
    .from(tutors)
    .where(eq(tutors.userId, userId))
    .limit(1);

  // Get student profile if exists
  const [studentProfile] = await db
    .select()
    .from(students)
    .where(eq(students.userId, userId))
    .limit(1);

  return {
    ...user,
    tutorProfile: tutorProfile || null,
    studentProfile: studentProfile || null,
  };
}
