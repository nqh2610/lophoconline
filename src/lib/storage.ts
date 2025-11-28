import { db } from './db';
import { withCache, CACHE_TTL } from './cache'; // ✅ PERFORMANCE: Import cache helpers
import { parseVNDateTime, addHours } from './timezone'; // ✅ TIMEZONE: Vietnam timezone helpers
import {
  users,
  tutorAvailability,
  bookings, // ✅ Trial bookings table (alias: lessons)
  tutors,
  subjects,
  gradeLevels,
  tutorSubjects,
  transactions,
  reviews,
  notifications,
  students,
  classEnrollments,
  payments,
  escrowPayments,
  sessionRecords,
  wallets,
  walletTransactions,
  payoutRequests,
  auditLogs,
  loginAttempts,
  occupations
} from './schema';
import type {
  User,
  InsertUser,
  TutorAvailability,
  InsertTutorAvailability,
  Booking,
  InsertBooking,
  Tutor,
  InsertTutor,
  Subject,
  GradeLevel,
  TutorSubject,
  InsertTutorSubject,
  Transaction,
  InsertTransaction,
  Review,
  InsertReview,
  Notification,
  InsertNotification,
  Student,
  InsertStudent,
  ClassEnrollment,
  InsertClassEnrollment,
  LoginAttempt
} from './schema';
import { eq, and, sql, like, desc, asc, inArray, gte, or, isNull, not } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// Backward compatibility types for legacy time_slots API
// These are converted to/from tutor_availability internally
export type TimeSlot = {
  id: number;
  tutorId: number;
  dayOfWeek: number; // 0-6
  shiftType: string; // morning/afternoon/evening
  startTime: string;
  endTime: string;
  isAvailable: number; // 1 or 0
  createdAt?: Date;
  updatedAt?: Date;
};

export type InsertTimeSlot = {
  tutorId: number;
  dayOfWeek: number;
  shiftType: string;
  startTime: string;
  endTime: string;
  isAvailable?: number;
};

export class DatabaseStorage {
  // ==================== USER METHODS ====================

  async getUserById(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);

    // ✅ FIX: Explicitly construct values object with required role field
    const values: any = {
      username: insertUser.username,
      password: hashedPassword,
      role: insertUser.role || JSON.stringify(['student']),
    };

    // Add optional fields
    if (insertUser.email) values.email = insertUser.email;
    if (insertUser.fullName) values.fullName = insertUser.fullName;
    if (insertUser.phone) values.phone = insertUser.phone;
    if (insertUser.avatar) values.avatar = insertUser.avatar;
    if (insertUser.isActive !== undefined) values.isActive = insertUser.isActive;

    const result = await db.insert(users).values(values);

    const newUser = await this.getUserById(Number(result[0].insertId));
    if (!newUser) throw new Error('Failed to create user');
    return newUser;
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async addUserRole(userId: number, newRole: 'student' | 'tutor' | 'admin'): Promise<User | undefined> {
    const user = await this.getUserById(userId);
    if (!user) return undefined;

    // Parse current roles
    let currentRoles: string[] = [];
    try {
      currentRoles = user.role ? JSON.parse(user.role) : [];
    } catch {
      currentRoles = [];
    }

    // Add new role if not already present
    if (!currentRoles.includes(newRole)) {
      currentRoles.push(newRole);
      
      // Update user with new roles
      await db.update(users)
        .set({ role: JSON.stringify(currentRoles) })
        .where(eq(users.id, userId));
    }

    return this.getUserById(userId);
  }

  // ==================== TUTOR PROFILE METHODS ====================

  async createTutor(insertTutor: InsertTutor): Promise<Tutor> {
    const result = await db.insert(tutors).values(insertTutor);
    const newTutor = await this.getTutorById(Number(result[0].insertId));
    if (!newTutor) throw new Error('Failed to create tutor');
    return newTutor;
  }

  async getTutorById(id: number): Promise<Tutor | undefined> {
    const result = await db
      .select({
        tutor: tutors,
        occupation: occupations,
        user: users // ✅ JOIN with users for avatar, fullName
      })
      .from(tutors)
      .leftJoin(occupations, eq(occupations.id, tutors.occupationId))
      .innerJoin(users, eq(users.id, tutors.userId)) // ✅ JOIN users
      .where(eq(tutors.id, id))
      .limit(1);
    
    if (!result[0]) return undefined;
    
    return {
      ...result[0].tutor,
      occupation: result[0].occupation || undefined,
      avatar: result[0].user?.avatar || null, // ✅ From users
      fullName: result[0].user?.fullName || result[0].user?.username || 'Giáo viên', // ✅ From users
      phone: result[0].user?.phone || null, // ✅ From users
    } as any;
  }

  // OPTIMIZED: Batch fetch tutors by IDs in ONE query
  async getTutorsByIds(ids: number[]): Promise<Tutor[]> {
    if (ids.length === 0) return [];
    return db.select().from(tutors).where(inArray(tutors.id, ids));
  }

  async getTutorByUserId(userId: number): Promise<Tutor | undefined> {
    const result = await db
      .select({
        tutor: tutors,
        occupation: occupations,
        user: users // ✅ JOIN with users
      })
      .from(tutors)
      .leftJoin(occupations, eq(occupations.id, tutors.occupationId))
      .innerJoin(users, eq(users.id, tutors.userId)) // ✅ JOIN users
      .where(eq(tutors.userId, userId))
      .limit(1);
    
    if (!result[0]) return undefined;
    
    return {
      ...result[0].tutor,
      occupation: result[0].occupation || undefined,
      avatar: result[0].user?.avatar || null, // ✅ From users
      fullName: result[0].user?.fullName || result[0].user?.username || 'Giáo viên', // ✅ From users
      phone: result[0].user?.phone || null, // ✅ From users
    } as any;
  }

  // Get single tutor with all related data
  // ✅ PERFORMANCE: Cache for 2 minutes (tutors can update profile)
  async getTutorByIdEnriched(id: number): Promise<(Tutor & {
    tutorSubjects: Array<TutorSubject & { subject: Subject; gradeLevel: GradeLevel }>;
    timeSlots: any[]; // expanded availability rows with dayOfWeek
  }) | undefined> {
    return withCache(
      `tutor:enriched:${id}`,
      2 * 60 * 1000, // 2 minutes TTL
      async () => {
        const tutor = await this.getTutorById(id);

        if (!tutor) {
          return undefined;
        }

        // ✅ OPTIMIZATION: Fetch subjects and availability in PARALLEL
        const [tutorSubjectsData, availabilityData] = await Promise.all([
          // Fetch tutor subjects with related data
          db
            .select({
              tutorSubject: tutorSubjects,
              subject: subjects,
              gradeLevel: gradeLevels,
            })
            .from(tutorSubjects)
            .leftJoin(subjects, eq(subjects.id, tutorSubjects.subjectId))
            .leftJoin(gradeLevels, eq(gradeLevels.id, tutorSubjects.gradeLevelId))
            .where(eq(tutorSubjects.tutorId, id)),

          // Fetch availability slots
          db
            .select()
            .from(tutorAvailability)
            .where(
              and(
                eq(tutorAvailability.tutorId, id),
                eq(tutorAvailability.isActive, 1)
              )
            )
            .orderBy(asc(tutorAvailability.startTime))
        ]);

        // Expand rows with recurringDays JSON into per-day entries for frontend compatibility
        const expandedAvailability: any[] = [];
        for (const slot of availabilityData) {
          try {
            if (slot.recurringDays) {
              const days = typeof slot.recurringDays === 'string' ? JSON.parse(slot.recurringDays) : slot.recurringDays;
              if (Array.isArray(days)) {
                for (const d of days) {
                  expandedAvailability.push({
                    id: slot.id,
                    tutorId: slot.tutorId,
                    dayOfWeek: Number(d),
                    shiftType: slot.shiftType,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isActive: slot.isActive,
                    createdAt: slot.createdAt,
                    updatedAt: slot.updatedAt,
                  });
                }
                continue;
              }
            }
          } catch (e) {
            console.error('Failed to parse recurringDays for slot', slot.id, e);
          }

          // If no recurring_days or parsing failed, skip this slot (data integrity issue)
          // All slots should now have recurring_days after migration
          console.warn('Skipping slot with missing or invalid recurring_days:', slot.id);
        }

        return {
          ...tutor,
          tutorSubjects: tutorSubjectsData
            .filter(row => row.subject && row.gradeLevel)
            .map(row => ({
              ...row.tutorSubject,
              subject: row.subject as Subject,
              gradeLevel: row.gradeLevel as GradeLevel,
            })),
          timeSlots: expandedAvailability,
        };
      }
    );
  }

  async getAllTutors(filters?: {
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
  }): Promise<Tutor[]> {
    // ✅ PERFORMANCE: Default limit prevents loading too many tutors at once
    const DEFAULT_LIMIT = 20;
    const effectiveLimit = filters?.limit ?? DEFAULT_LIMIT;

    // Base conditions - only show approved and active tutors to public
    const conditions = [
      eq(tutors.isActive, 1),
      eq(tutors.verificationStatus, 'verified'),
      eq(tutors.approvalStatus, 'approved') // SECURITY: Only show approved tutors
    ];

    // ✅ ALWAYS JOIN with users (for avatar, fullName) and occupations
    let baseQuery = db
      .select({ tutors, occupation: occupations, user: users })
      .from(tutors)
      .leftJoin(occupations, eq(occupations.id, tutors.occupationId))
      .innerJoin(users, eq(users.id, tutors.userId));

    // If filtering by subject or grade level, use JOIN with tutor_subjects
    if (filters?.subjectId || filters?.gradeLevelId || filters?.subject || filters?.gradeLevel) {
      baseQuery = db
        .selectDistinct({ tutors, occupation: occupations, user: users })
        .from(tutors)
        .leftJoin(occupations, eq(occupations.id, tutors.occupationId))
        .innerJoin(users, eq(users.id, tutors.userId))
        .innerJoin(tutorSubjects, eq(tutorSubjects.tutorId, tutors.id)) as any;

      if (filters.subjectId) {
        conditions.push(eq(tutorSubjects.subjectId, filters.subjectId));
      }

      if (filters.gradeLevelId) {
        conditions.push(eq(tutorSubjects.gradeLevelId, filters.gradeLevelId));
      }

      // If filtering by subject/gradeLevel name, need to join with those tables
      if (filters.subject) {
        baseQuery = baseQuery.innerJoin(subjects, eq(subjects.id, tutorSubjects.subjectId)) as any;
        conditions.push(eq(subjects.name, filters.subject));
      }

      if (filters.gradeLevel) {
        baseQuery = baseQuery.innerJoin(gradeLevels, eq(gradeLevels.id, tutorSubjects.gradeLevelId)) as any;
        conditions.push(eq(gradeLevels.name, filters.gradeLevel));
      }
    }

    // If filtering by time availability, join with tutor_availability
    if (filters?.shiftType || filters?.dayOfWeek !== undefined) {
      baseQuery = db
        .selectDistinct({ tutors, occupation: occupations, user: users })
        .from(tutors)
        .leftJoin(occupations, eq(occupations.id, tutors.occupationId))
        .innerJoin(users, eq(users.id, tutors.userId))
        .innerJoin(tutorAvailability, eq(tutorAvailability.tutorId, tutors.id)) as any;

      conditions.push(eq(tutorAvailability.isActive, 1));

      if (filters.shiftType) {
        conditions.push(eq(tutorAvailability.shiftType, filters.shiftType));
      }

      if (filters.dayOfWeek !== undefined) {
        // Filter by day using JSON_CONTAINS on recurring_days
        conditions.push(sql`JSON_CONTAINS(${tutorAvailability.recurringDays}, ${JSON.stringify(filters.dayOfWeek.toString())})`);
      }
    }

    // Price range filters
    if (filters?.minRate !== undefined) {
      conditions.push(sql`${tutors.hourlyRate} >= ${filters.minRate}`);
    }

    if (filters?.maxRate !== undefined) {
      conditions.push(sql`${tutors.hourlyRate} <= ${filters.maxRate}`);
    }

    // Experience filter
    if (filters?.experience !== undefined) {
      conditions.push(sql`${tutors.experience} >= ${filters.experience}`);
    }

    // Search by tutor name (✅ Already joined with users above)
    if (filters?.searchText) {
      conditions.push(like(users.fullName, `%${filters.searchText}%`));
    }

    // Filter by category (need to join gradeLevels if not already joined)
    if (filters?.category) {
      // Check if we already joined with gradeLevels
      const hasGradeLevelJoin = filters?.gradeLevel;

      if (!hasGradeLevelJoin) {
        // Need to ensure we have tutor_subjects join first
        const hasTutorSubjectsJoin = filters?.subjectId || filters?.gradeLevelId || filters?.subject;

        if (!hasTutorSubjectsJoin) {
          baseQuery = db
            .selectDistinct({ tutors, occupation: occupations, user: users })
            .from(tutors)
            .leftJoin(occupations, eq(occupations.id, tutors.occupationId))
            .innerJoin(users, eq(users.id, tutors.userId))
            .innerJoin(tutorSubjects, eq(tutorSubjects.tutorId, tutors.id))
            .innerJoin(gradeLevels, eq(gradeLevels.id, tutorSubjects.gradeLevelId)) as any;
        } else {
          // Already have tutor_subjects, just add gradeLevels
          baseQuery = baseQuery.innerJoin(gradeLevels, eq(gradeLevels.id, tutorSubjects.gradeLevelId)) as any;
        }
      }

      conditions.push(eq(gradeLevels.category, filters.category));
    }

    // Apply all conditions
    let finalQuery = baseQuery.where(and(...conditions)) as any;

    // Apply sorting
    if (filters?.sortBy) {
      const sortField = {
        rating: tutors.rating,
        price: tutors.hourlyRate,
        experience: tutors.experience,
        reviews: tutors.totalReviews
      }[filters.sortBy];

      finalQuery = filters.sortOrder === 'asc'
        ? finalQuery.orderBy(asc(sortField))
        : finalQuery.orderBy(desc(sortField));
    } else {
      // Default sort by rating desc
      finalQuery = finalQuery.orderBy(desc(tutors.rating));
    }

    // ✅ PERFORMANCE: Always apply limit (default or custom)
    finalQuery = finalQuery.limit(effectiveLimit);
    if (filters?.offset) {
      finalQuery = finalQuery.offset(filters.offset);
    }

    // Execute query and extract tutors with occupations and users (already JOINed)
    const results = await finalQuery;

    // ✅ Extract tutors, occupations, and user data (avatar, fullName)
    return results.map((r: any) => ({
      ...(r.tutors || r),
      occupation: r.occupation || undefined,
      // ✅ Add avatar and fullName from users table
      avatar: r.user?.avatar || null,
      fullName: r.user?.fullName || r.user?.username || 'Giáo viên',
    }));
  }

  // OPTIMIZED: Get tutors with all related data in PARALLEL queries (2 queries instead of 3)
  // This dramatically reduces database connections and latency
  async getTutorsEnriched(filters?: {
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
  }): Promise<Array<Tutor & {
    tutorSubjects: Array<TutorSubject & { subject: Subject; gradeLevel: GradeLevel }>;
    timeSlots: TutorAvailability[];
  }>> {
    // First, get the filtered tutor IDs (already optimized with occupation JOIN)
    const filteredTutors = await this.getAllTutors(filters);

    if (filteredTutors.length === 0) {
      return [];
    }

    const tutorIds = filteredTutors.map(t => t.id);

    // OPTIMIZED: Fetch tutorSubjects and availability in PARALLEL (not sequential)
    const [allTutorSubjects, allAvailabilitySlots] = await Promise.all([
      // Query 1: Fetch all tutor subjects with JOINs
      db
        .select({
          tutorSubject: tutorSubjects,
          subject: subjects,
          gradeLevel: gradeLevels,
        })
        .from(tutorSubjects)
        .leftJoin(subjects, eq(subjects.id, tutorSubjects.subjectId))
        .leftJoin(gradeLevels, eq(gradeLevels.id, tutorSubjects.gradeLevelId))
        .where(inArray(tutorSubjects.tutorId, tutorIds)),

      // Query 2: Fetch all availability slots
      db
        .select()
        .from(tutorAvailability)
        .where(
          and(
            inArray(tutorAvailability.tutorId, tutorIds),
            eq(tutorAvailability.isActive, 1)
          )
        )
        .orderBy(asc(tutorAvailability.startTime))
    ]);

    // Group the data by tutor ID
    const tutorSubjectsMap = new Map<number, Array<TutorSubject & { subject: Subject; gradeLevel: GradeLevel }>>();
    const availabilitySlotsMap = new Map<number, TutorAvailability[]>();

    allTutorSubjects.forEach(row => {
      if (!row.subject || !row.gradeLevel) return; // Skip if missing relations
      const tutorId = row.tutorSubject.tutorId;
      if (!tutorSubjectsMap.has(tutorId)) {
        tutorSubjectsMap.set(tutorId, []);
      }
      tutorSubjectsMap.get(tutorId)!.push({
        ...row.tutorSubject,
        subject: row.subject as Subject,
        gradeLevel: row.gradeLevel as GradeLevel,
      });
    });

    allAvailabilitySlots.forEach(slot => {
      const tutorId = slot.tutorId;
      if (!availabilitySlotsMap.has(tutorId)) {
        availabilitySlotsMap.set(tutorId, []);
      }
      
      // Expand recurring_days into individual day objects for frontend compatibility
      try {
        if (slot.recurringDays) {
          const days = typeof slot.recurringDays === 'string' ? JSON.parse(slot.recurringDays) : slot.recurringDays;
          if (Array.isArray(days)) {
            days.forEach(d => {
              availabilitySlotsMap.get(tutorId)!.push({
                ...slot,
                dayOfWeek: Number(d), // Add virtual dayOfWeek field
              } as any);
            });
            return;
          }
        }
      } catch (e) {
        console.error('Failed to parse recurringDays for slot', slot.id, e);
      }
      
      // If no recurring_days or parsing failed, skip this slot
      console.warn('Skipping slot with missing or invalid recurring_days:', slot.id);
    });

    // Combine everything
    return filteredTutors.map(tutor => ({
      ...tutor,
      tutorSubjects: tutorSubjectsMap.get(tutor.id) || [],
      timeSlots: availabilitySlotsMap.get(tutor.id) || [],
      // occupation is already in filteredTutors from getAllTutors
    }));
  }

  async updateTutor(id: number, updates: Partial<InsertTutor>): Promise<Tutor | undefined> {
    await db.update(tutors).set(updates).where(eq(tutors.id, id));
    return this.getTutorById(id);
  }

  async updateTutorRating(tutorId: number, newRating: number): Promise<void> {
    const tutor = await this.getTutorById(tutorId);
    if (!tutor) return;

    const totalRatings = tutor.totalReviews || 0;
    const currentRating = tutor.rating || 0;
    const newTotalReviews = totalRatings + 1;
    const newAvgRating = Math.round(((currentRating * totalRatings) + newRating) / newTotalReviews);

    await db.update(tutors)
      .set({
        rating: newAvgRating,
        totalReviews: newTotalReviews
      })
      .where(eq(tutors.id, tutorId));
  }

  // ==================== SUBJECT METHODS ====================

  // ✅ PERFORMANCE: Cache subjects for 1 hour (they rarely change)
  async getAllSubjects(): Promise<Subject[]> {
    return withCache(
      'subjects:all',
      CACHE_TTL.SUBJECTS,
      async () => db.select().from(subjects).where(eq(subjects.isActive, 1))
    );
  }

  async getSubjectById(id: number): Promise<Subject | undefined> {
    const result = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
    return result[0];
  }

  async getSubjectByName(name: string): Promise<Subject | undefined> {
    const result = await db.select().from(subjects).where(eq(subjects.name, name)).limit(1);
    return result[0];
  }

  // ==================== GRADE LEVEL METHODS ====================

  // ✅ PERFORMANCE: Cache grade levels for 1 hour (they rarely change)
  async getAllGradeLevels(): Promise<GradeLevel[]> {
    return withCache(
      'grade_levels:all',
      CACHE_TTL.GRADE_LEVELS,
      async () => db.select().from(gradeLevels).where(eq(gradeLevels.isActive, 1)).orderBy(asc(gradeLevels.sortOrder))
    );
  }

  async getGradeLevelById(id: number): Promise<GradeLevel | undefined> {
    const result = await db.select().from(gradeLevels).where(eq(gradeLevels.id, id)).limit(1);
    return result[0];
  }

  // Batch fetch grade levels by IDs
  async getGradeLevelsByIds(ids: number[]): Promise<GradeLevel[]> {
    if (!ids || ids.length === 0) return [];
    const results = await db.select().from(gradeLevels).where(inArray(gradeLevels.id, ids));
    return results;
  }

  /**
   * Map a numeric grade (e.g. 8, 9) or a possible grade_level id to the canonical GradeLevel row.
   * This lets the backend accept frontend payloads that send simple grade numbers while
   * still using the DB's canonical grade_level.id for foreign keys.
   *
   * Strategy:
   * 1. If the incoming number matches an existing grade_levels.id, return it.
   * 2. Try to match by sortOrder (some grade_levels use sortOrder = school grade number).
   * 3. Try to match by name patterns (e.g. "Lớp 8", "Class 8", etc.).
   */
  async getGradeLevelByNumber(n: number): Promise<GradeLevel | undefined> {
    if (!n && n !== 0) return undefined;

    // 1) If this looks like a canonical id, try that first
    const byId = await this.getGradeLevelById(n);
    if (byId) return byId;

    // 2) Try matching by sortOrder field (common mapping to school grade numbers)
    try {
      const bySort = await db.select().from(gradeLevels).where(and(eq(gradeLevels.sortOrder, n), eq(gradeLevels.isActive, 1))).limit(1);
      if (bySort[0]) return bySort[0];
    } catch (e) {
      // ignore and continue to name-based matching
    }

    // 3) Name-based heuristics: look for common phrases containing the number
    const patterns = [
      `Lớp ${n}`,
      `Lop ${n}`,
      `Class ${n}`,
      `Grade ${n}`,
      `${n}`,
    ];

    const conditions: any[] = [eq(gradeLevels.isActive, 1)];
    const orConditions = patterns.map(p => like(gradeLevels.name, `%${p}%`));
    if (orConditions.length > 0) {
      conditions.push(or(...orConditions));
    }

    const results = await db.select().from(gradeLevels).where(and(...conditions)).orderBy(asc(gradeLevels.sortOrder));
    return results[0];
  }

  /**
   * Get grade levels for a specific subject (or all subjects if null)
   * @param subjectId - Subject ID or null for common grades
   * @returns Grade levels that are either common (subjectId = null) or specific to the subject
   * ✅ PERFORMANCE: Cache by subject ID for 1 hour
   */
  async getGradeLevelsForSubject(subjectId: number | null): Promise<GradeLevel[]> {
    if (subjectId === null) {
      // Return ALL grade levels (for backward compatibility)
      return this.getAllGradeLevels();
    }

    // ✅ PERFORMANCE: Cache grade levels per subject
    return withCache(
      `grade_levels:subject:${subjectId}`,
      CACHE_TTL.GRADE_LEVELS,
      async () => db
        .select()
        .from(gradeLevels)
        .where(
          and(
            eq(gradeLevels.isActive, 1),
            or(
              isNull(gradeLevels.subjectId), // Common grades
              eq(gradeLevels.subjectId, subjectId) // Specific to this subject
            )
          )
        )
        .orderBy(asc(gradeLevels.sortOrder))
    );
  }

  // ==================== TUTOR SUBJECTS METHODS ====================

  async getTutorSubjects(tutorId: number): Promise<Array<TutorSubject & { subject: Subject; gradeLevel: GradeLevel }>> {
    const results = await db
      .select({
        tutorSubject: tutorSubjects,
        subject: subjects,
        gradeLevel: gradeLevels,
      })
      .from(tutorSubjects)
      .innerJoin(subjects, eq(subjects.id, tutorSubjects.subjectId))
      .innerJoin(gradeLevels, eq(gradeLevels.id, tutorSubjects.gradeLevelId))
      .where(eq(tutorSubjects.tutorId, tutorId));

    return results.map(r => ({
      ...r.tutorSubject,
      subject: r.subject,
      gradeLevel: r.gradeLevel,
    }));
  }

  // ==================== TIME SLOTS METHODS ====================

  async getTutorTimeSlots(tutorId: number): Promise<TimeSlot[]> {
    // Read from tutor_availability and expand recurringDays into per-day rows for compatibility
    const rows = await db
      .select()
      .from(tutorAvailability)
      .where(
        and(
          eq(tutorAvailability.tutorId, tutorId),
          eq(tutorAvailability.isActive, 1)
        )
      )
      .orderBy(asc(tutorAvailability.startTime));

    const expanded: any[] = [];
    for (const slot of rows) {
      try {
        if (slot.recurringDays) {
          const days = typeof slot.recurringDays === 'string' ? JSON.parse(slot.recurringDays) : slot.recurringDays;
          if (Array.isArray(days)) {
            for (const d of days) {
              expanded.push({
                id: slot.id,
                tutorId: slot.tutorId,
                dayOfWeek: Number(d),
                shiftType: slot.shiftType,
                startTime: slot.startTime,
                endTime: slot.endTime,
                isAvailable: slot.isActive === 1 ? 1 : 0,
                createdAt: slot.createdAt,
                updatedAt: slot.updatedAt,
              });
            }
            continue;
          }
        }
      } catch (e) {
        console.error('Failed to parse recurringDays for slot', slot.id, e);
      }

      // If no recurring_days or parsing failed, skip this slot (data integrity issue)
      // All slots should now have recurring_days after migration
      console.warn('Skipping slot with missing or invalid recurring_days:', slot.id);
    }

    return expanded as TimeSlot[];
  }

  async createTimeSlot(timeSlot: InsertTimeSlot): Promise<TimeSlot> {
    // Convert to tutor_availability format with recurring_days
    const availabilityData: any = {
      tutorId: timeSlot.tutorId,
      shiftType: timeSlot.shiftType,
      startTime: timeSlot.startTime,
      endTime: timeSlot.endTime,
      isActive: timeSlot.isAvailable ?? 1,
    };

    // Convert dayOfWeek to recurring_days JSON array format
    if (timeSlot.dayOfWeek !== undefined) {
      availabilityData.recurringDays = JSON.stringify([timeSlot.dayOfWeek]);
    }

    const result = await db.insert(tutorAvailability).values(availabilityData);
    const newSlot = await db
      .select()
      .from(tutorAvailability)
      .where(eq(tutorAvailability.id, Number(result[0].insertId)))
      .limit(1);
    
    if (!newSlot[0]) throw new Error('Failed to create time slot');
    
    // Convert back to TimeSlot format (extract first day from recurring_days)
    let dayOfWeek = 0;
    try {
      if (newSlot[0].recurringDays) {
        const days = JSON.parse(newSlot[0].recurringDays);
        if (Array.isArray(days) && days.length > 0) {
          dayOfWeek = Number(days[0]);
        }
      }
    } catch (e) {
      console.error('Failed to parse recurringDays', e);
    }
    
    return {
      id: newSlot[0].id,
      tutorId: newSlot[0].tutorId,
      dayOfWeek,
      shiftType: newSlot[0].shiftType,
      startTime: newSlot[0].startTime,
      endTime: newSlot[0].endTime,
      isAvailable: newSlot[0].isActive,
      createdAt: newSlot[0].createdAt,
      updatedAt: newSlot[0].updatedAt,
    };
  }

  async updateTimeSlot(id: number, updates: Partial<InsertTimeSlot>): Promise<TimeSlot | undefined> {
    // Convert updates to tutor_availability format
    const availabilityUpdates: any = {};
    if (updates.shiftType) availabilityUpdates.shiftType = updates.shiftType;
    if (updates.startTime) availabilityUpdates.startTime = updates.startTime;
    if (updates.endTime) availabilityUpdates.endTime = updates.endTime;
    if (updates.isAvailable !== undefined) availabilityUpdates.isActive = updates.isAvailable;
    
    // If dayOfWeek is updated, convert to recurring_days
    if (updates.dayOfWeek !== undefined) {
      availabilityUpdates.recurringDays = JSON.stringify([updates.dayOfWeek]);
    }

    await db.update(tutorAvailability).set(availabilityUpdates).where(eq(tutorAvailability.id, id));
    const result = await db.select().from(tutorAvailability).where(eq(tutorAvailability.id, id)).limit(1);
    
    if (!result[0]) return undefined;
    
    // Convert back to TimeSlot format (extract first day from recurring_days)
    let dayOfWeek = 0;
    try {
      if (result[0].recurringDays) {
        const days = JSON.parse(result[0].recurringDays);
        if (Array.isArray(days) && days.length > 0) {
          dayOfWeek = Number(days[0]);
        }
      }
    } catch (e) {
      console.error('Failed to parse recurringDays', e);
    }
    
    return {
      id: result[0].id,
      tutorId: result[0].tutorId,
      dayOfWeek,
      shiftType: result[0].shiftType,
      startTime: result[0].startTime,
      endTime: result[0].endTime,
      isAvailable: result[0].isActive,
      createdAt: result[0].createdAt,
      updatedAt: result[0].updatedAt,
    };
  }

  async deleteTimeSlot(id: number): Promise<boolean> {
    const result = await db.delete(tutorAvailability).where(eq(tutorAvailability.id, id));
    return result[0].affectedRows > 0;
  }

  // ==================== TUTOR AVAILABILITY METHODS ====================

  async createTutorAvailability(availability: InsertTutorAvailability): Promise<TutorAvailability> {
    const result = await db.insert(tutorAvailability).values(availability);
    const newAvailability = await this.getTutorAvailabilityById(Number(result[0].insertId));
    if (!newAvailability) throw new Error('Failed to create availability');
    return newAvailability;
  }

  async getTutorAvailability(tutorId: number): Promise<TutorAvailability[]> {
    return db.select()
      .from(tutorAvailability)
      .where(eq(tutorAvailability.tutorId, tutorId))
      .orderBy(tutorAvailability.startTime);
  }

  async getTutorAvailabilityById(id: number): Promise<TutorAvailability | undefined> {
    const result = await db.select()
      .from(tutorAvailability)
      .where(eq(tutorAvailability.id, id))
      .limit(1);
    return result[0];
  }

  async updateTutorAvailability(
    id: number,
    updates: Partial<InsertTutorAvailability>
  ): Promise<TutorAvailability | undefined> {
    await db.update(tutorAvailability)
      .set(updates)
      .where(eq(tutorAvailability.id, id));

    return this.getTutorAvailabilityById(id);
  }

  async deleteTutorAvailability(id: number): Promise<boolean> {
    const result = await db.delete(tutorAvailability)
      .where(eq(tutorAvailability.id, id));
    return result[0].affectedRows > 0;
  }

  async deleteTutorAvailabilityByTutorId(tutorId: number): Promise<boolean> {
    const result = await db.delete(tutorAvailability)
      .where(eq(tutorAvailability.tutorId, tutorId));
    return result[0].affectedRows > 0;
  }

  async deleteTutorSubjectsByTutorId(tutorId: number): Promise<boolean> {
    const result = await db.delete(tutorSubjects)
      .where(eq(tutorSubjects.tutorId, tutorId));
    return result[0].affectedRows > 0;
  }

  async checkAvailabilityConflict(
    tutorId: number,
    recurringDays: string, // JSON string like "[1,3,5]"
    startTime: string,
    endTime: string,
    excludeId?: number
  ): Promise<boolean> {
    // Parse the incoming days
    let daysToCheck: number[] = [];
    try {
      daysToCheck = JSON.parse(recurringDays);
      if (!Array.isArray(daysToCheck)) {
        console.error('recurringDays is not an array:', recurringDays);
        return false;
      }
    } catch (e) {
      console.error('Failed to parse recurringDays:', recurringDays);
      return false;
    }

    // Get all existing availability for this tutor
    const existing = await db.select()
      .from(tutorAvailability)
      .where(
        and(
          eq(tutorAvailability.tutorId, tutorId),
          eq(tutorAvailability.isActive, 1),
          excludeId ? sql`${tutorAvailability.id} != ${excludeId}` : undefined
        )
      );

    // Check for conflicts
    for (const slot of existing) {
      try {
        const slotDays = JSON.parse(slot.recurringDays || '[]');
        
        // Check if any day overlaps
        const hasCommonDay = daysToCheck.some(day => slotDays.includes(day));
        
        if (hasCommonDay && this.timeRangesOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
          return true;
        }
      } catch (e) {
        console.error('Error parsing slot recurringDays:', slot.recurringDays);
      }
    }
    
    return false;
  }

  // ==================== TUTOR-SUBJECT METHODS ====================

  async createTutorSubject(data: { tutorId: number; subjectId: number; gradeLevelId: number }): Promise<TutorSubject> {
    const result = await db.insert(tutorSubjects).values(data);
    const insertId = Number(result[0].insertId);

    const created = await db.select()
      .from(tutorSubjects)
      .where(eq(tutorSubjects.id, insertId))
      .limit(1);

    return created[0];
  }

  async getTutorSubjectsByTutorId(tutorId: number): Promise<TutorSubject[]> {
    return await db.select()
      .from(tutorSubjects)
      .where(eq(tutorSubjects.tutorId, tutorId));
  }

  // ==================== TRANSACTION METHODS ====================

  async createTransaction(data: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values(data);
    const insertId = Number(result[0].insertId);

    // ✅ OPTIMIZATION: Return merged data instead of querying again
    return {
      id: insertId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Transaction;
  }

  async getTransactionById(id: number): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    return result[0];
  }

  async getTransactionsByStudent(studentId: number): Promise<Transaction[]> {
    return db.select()
      .from(transactions)
      .where(eq(transactions.studentId, studentId))
      .orderBy(desc(transactions.createdAt));
  }

  async getTransactionsByTutor(tutorId: number): Promise<Transaction[]> {
    return db.select()
      .from(transactions)
      .where(eq(transactions.tutorId, tutorId))
      .orderBy(desc(transactions.createdAt));
  }

  async getTransactionByLesson(lessonId: number): Promise<Transaction | undefined> {
    const result = await db.select()
      .from(transactions)
      .where(eq(transactions.lessonId, lessonId))
      .limit(1);
    return result[0];
  }

  // OPTIMIZED: Batch fetch transactions by lesson IDs in ONE query
  async getTransactionsByLessonIds(lessonIds: number[]): Promise<Transaction[]> {
    if (lessonIds.length === 0) return [];
    return db.select()
      .from(transactions)
      .where(inArray(transactions.lessonId, lessonIds));
  }

  async updateTransaction(id: number, updates: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    await db.update(transactions).set(updates).where(eq(transactions.id, id));
    return this.getTransactionById(id);
  }

  // ==================== REVIEW METHODS ====================

  async createReview(data: InsertReview): Promise<Review> {
    const result = await db.insert(reviews).values(data);
    const newReview = await this.getReviewById(Number(result[0].insertId));
    if (!newReview) throw new Error('Failed to create review');

    // Update tutor rating
    await this.updateTutorRating(data.tutorId, data.rating);

    return newReview;
  }

  async getReviewById(id: number): Promise<Review | undefined> {
    const result = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
    return result[0];
  }

  async getReviewsByTutor(tutorId: number, limit?: number): Promise<Review[]> {
    let query = db.select()
      .from(reviews)
      .where(eq(reviews.tutorId, tutorId))
      .orderBy(desc(reviews.createdAt));

    if (limit) {
      query = query.limit(limit) as any;
    }

    return query;
  }

  async getReviewsByStudent(studentId: number): Promise<Review[]> {
    return db.select()
      .from(reviews)
      .where(eq(reviews.studentId, studentId))
      .orderBy(desc(reviews.createdAt));
  }

  async updateReview(id: number, updates: Partial<InsertReview>): Promise<Review | undefined> {
    await db.update(reviews).set(updates).where(eq(reviews.id, id));
    return this.getReviewById(id);
  }

  async addReviewReply(reviewId: number, reply: string): Promise<Review | undefined> {
    await db.update(reviews)
      .set({
        reply,
        repliedAt: new Date()
      })
      .where(eq(reviews.id, reviewId));
    return this.getReviewById(reviewId);
  }

  // ==================== NOTIFICATION METHODS ====================

  async createNotification(data: InsertNotification): Promise<Notification> {
    const result = await db.insert(notifications).values(data);
    const insertId = Number(result[0].insertId);

    // ✅ OPTIMIZATION: Return merged data instead of querying again
    // Notifications don't need computed fields from DB
    return {
      id: insertId,
      ...data,
      createdAt: new Date(),
    } as Notification;
  }

  async getNotificationById(id: number): Promise<Notification | undefined> {
    const result = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
    return result[0];
  }

  async getNotificationsByUser(userId: number, limit?: number, unreadOnly?: boolean): Promise<Notification[]> {
    const conditions = [eq(notifications.userId, userId)];

    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, 0));
    }

    let query = db.select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt));

    if (limit) {
      query = query.limit(limit) as any;
    }

    return query;
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    await db.update(notifications).set({ isRead: 1 }).where(eq(notifications.id, id));
    return this.getNotificationById(id);
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: 1 })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, 0)
      ));
  }

  async deleteNotification(id: number): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id));
    return result[0].affectedRows > 0;
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, 0)
      ));

    return result[0]?.count || 0;
  }

  // ==================== STUDENT METHODS ====================

  async createStudent(data: InsertStudent): Promise<Student> {
    const result = await db.insert(students).values(data);
    const newStudent = await this.getStudentById(Number(result[0].insertId));
    if (!newStudent) throw new Error('Failed to create student');
    return newStudent;
  }

  async getStudentById(id: number): Promise<Student | undefined> {
    const result = await db
      .select({
        student: students,
        user: users // ✅ JOIN with users
      })
      .from(students)
      .innerJoin(users, eq(users.id, students.userId)) // ✅ JOIN users
      .where(eq(students.id, id))
      .limit(1);
    
    if (!result[0]) return undefined;
    
    return {
      ...result[0].student,
      avatar: result[0].user?.avatar || null, // ✅ From users
      fullName: result[0].user?.fullName || result[0].user?.username || 'Học sinh', // ✅ From users
      phone: result[0].user?.phone || null, // ✅ From users
    } as any;
  }

  async getStudentByUserId(userId: number): Promise<Student | undefined> {
    const result = await db
      .select({
        student: students,
        user: users // ✅ JOIN with users
      })
      .from(students)
      .innerJoin(users, eq(users.id, students.userId)) // ✅ JOIN users
      .where(eq(students.userId, userId))
      .limit(1);
    
    if (!result[0]) return undefined;
    
    return {
      ...result[0].student,
      avatar: result[0].user?.avatar || null, // ✅ From users
      fullName: result[0].user?.fullName || result[0].user?.username || 'Học sinh', // ✅ From users
      phone: result[0].user?.phone || null, // ✅ From users
    } as any;
  }

  // OPTIMIZED: Batch fetch students by user IDs in ONE query
  async getStudentsByUserIds(userIds: number[]): Promise<Student[]> {
    if (userIds.length === 0) return [];
    return db.select().from(students).where(inArray(students.userId, userIds));
  }

  // OPTIMIZED: Batch fetch students by student IDs in ONE query
  async getStudentsByIds(studentIds: number[]): Promise<Student[]> {
    if (studentIds.length === 0) return [];
    return db.select().from(students).where(inArray(students.id, studentIds));
  }

  async updateStudent(id: number, updates: Partial<InsertStudent>): Promise<Student | undefined> {
    await db.update(students).set(updates).where(eq(students.id, id));
    return this.getStudentById(id);
  }

  // ==================== CLASS ENROLLMENT METHODS ====================

  async createEnrollment(data: any): Promise<any> {
    const result = await db.insert(classEnrollments).values(data);
    const insertId = Number(result[0].insertId);

    // ✅ OPTIMIZATION: Return merged data instead of querying again
    return {
      id: insertId,
      ...data,
      completedSessions: data.completedSessions ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async getEnrollmentById(id: number): Promise<any> {
    const result = await db.select().from(classEnrollments).where(eq(classEnrollments.id, id)).limit(1);
    return result[0];
  }

  async getEnrollmentsByStudent(studentId: number): Promise<any[]> {
    return db.select().from(classEnrollments).where(eq(classEnrollments.studentId, studentId));
  }

  async getEnrollmentsByTutor(tutorId: number): Promise<any[]> {
    return db.select().from(classEnrollments).where(eq(classEnrollments.tutorId, tutorId));
  }

  async updateEnrollment(id: number, updates: any): Promise<any> {
    await db.update(classEnrollments).set(updates).where(eq(classEnrollments.id, id));
    return this.getEnrollmentById(id);
  }

  // ==================== PAYMENT METHODS ====================

  async createPayment(data: any): Promise<any> {
    const result = await db.insert(payments).values(data);
    const newPayment = await this.getPaymentById(Number(result[0].insertId));
    return newPayment;
  }

  async getPaymentById(id: number): Promise<any> {
    const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return result[0];
  }

  async getPaymentByTransactionCode(code: string): Promise<any> {
    const result = await db.select().from(payments).where(eq(payments.transactionCode, code)).limit(1);
    return result[0];
  }

  async updatePayment(id: number, updates: any): Promise<any> {
    await db.update(payments).set(updates).where(eq(payments.id, id));
    return this.getPaymentById(id);
  }

  // ==================== ESCROW PAYMENT METHODS ====================

  async createEscrowPayment(data: any): Promise<any> {
    const result = await db.insert(escrowPayments).values(data);
    const newEscrow = await this.getEscrowPaymentById(Number(result[0].insertId));
    return newEscrow;
  }

  async getEscrowPaymentById(id: number): Promise<any> {
    const result = await db.select().from(escrowPayments).where(eq(escrowPayments.id, id)).limit(1);
    return result[0];
  }

  async getEscrowByPaymentId(paymentId: number): Promise<any> {
    const result = await db.select().from(escrowPayments).where(eq(escrowPayments.paymentId, paymentId)).limit(1);
    return result[0];
  }

  async updateEscrowPayment(id: number, updates: any): Promise<any> {
    await db.update(escrowPayments).set(updates).where(eq(escrowPayments.id, id));
    return this.getEscrowPaymentById(id);
  }

  // ==================== SESSION RECORD METHODS ====================

  async createSessionRecord(data: any): Promise<any> {
    const result = await db.insert(sessionRecords).values(data);
    const newSession = await this.getSessionRecordById(Number(result[0].insertId));
    return newSession;
  }

  async getSessionRecordById(id: number): Promise<any> {
    const result = await db.select().from(sessionRecords).where(eq(sessionRecords.id, id)).limit(1);
    return result[0];
  }

  async getSessionsByEnrollment(enrollmentId: number): Promise<any[]> {
    return db.select().from(sessionRecords).where(eq(sessionRecords.enrollmentId, enrollmentId)).orderBy(sessionRecords.sessionNumber);
  }

  async updateSessionRecord(id: number, updates: any): Promise<any> {
    await db.update(sessionRecords).set(updates).where(eq(sessionRecords.id, id));
    return this.getSessionRecordById(id);
  }

  // ==================== WALLET METHODS ====================

  async createWallet(data: any): Promise<any> {
    const result = await db.insert(wallets).values(data);
    const newWallet = await this.getWalletById(Number(result[0].insertId));
    return newWallet;
  }

  async getWalletById(id: number): Promise<any> {
    const result = await db.select().from(wallets).where(eq(wallets.id, id)).limit(1);
    return result[0];
  }

  async getWalletByOwner(ownerId: number, ownerType: string): Promise<any> {
    const result = await db.select().from(wallets).where(and(eq(wallets.ownerId, ownerId), eq(wallets.ownerType, ownerType))).limit(1);
    return result[0];
  }

  async updateWallet(id: number, updates: any): Promise<any> {
    await db.update(wallets).set(updates).where(eq(wallets.id, id));
    return this.getWalletById(id);
  }

  // ==================== WALLET TRANSACTION METHODS ====================

  async createWalletTransaction(data: any): Promise<any> {
    const result = await db.insert(walletTransactions).values(data);
    return result;
  }

  async getWalletTransactionsByWallet(walletId: number, limit: number = 50): Promise<any[]> {
    return db.select().from(walletTransactions).where(eq(walletTransactions.walletId, walletId)).orderBy(desc(walletTransactions.createdAt)).limit(limit);
  }

  // ==================== PAYOUT REQUEST METHODS ====================

  async createPayoutRequest(data: any): Promise<any> {
    const result = await db.insert(payoutRequests).values(data);
    const newRequest = await this.getPayoutRequestById(Number(result[0].insertId));
    return newRequest;
  }

  async getPayoutRequestById(id: number): Promise<any> {
    const result = await db.select().from(payoutRequests).where(eq(payoutRequests.id, id)).limit(1);
    return result[0];
  }

  async getPayoutRequestsByTutor(tutorId: number): Promise<any[]> {
    return db.select().from(payoutRequests).where(eq(payoutRequests.tutorId, tutorId)).orderBy(desc(payoutRequests.createdAt));
  }

  async getPendingPayoutRequests(): Promise<any[]> {
    return db.select().from(payoutRequests).where(eq(payoutRequests.status, 'pending')).orderBy(payoutRequests.createdAt);
  }

  async updatePayoutRequest(id: number, updates: any): Promise<any> {
    await db.update(payoutRequests).set(updates).where(eq(payoutRequests.id, id));
    return this.getPayoutRequestById(id);
  }

  // ==================== AUDIT LOG METHODS ====================

  async createAuditLog(data: any): Promise<void> {
    await db.insert(auditLogs).values(data);
  }

  async getAuditLogsByEntity(entityType: string, entityId: number): Promise<any[]> {
    return db.select().from(auditLogs).where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId))).orderBy(desc(auditLogs.createdAt));
  }

  // ==================== HELPER METHODS ====================

  private timeRangesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const [h1Start, m1Start] = start1.split(':').map(Number);
    const [h1End, m1End] = end1.split(':').map(Number);
    const [h2Start, m2Start] = start2.split(':').map(Number);
    const [h2End, m2End] = end2.split(':').map(Number);

    const mins1Start = h1Start * 60 + m1Start;
    const mins1End = h1End * 60 + m1End;
    const mins2Start = h2Start * 60 + m2Start;
    const mins2End = h2End * 60 + m2End;

    return mins1Start < mins2End && mins2Start < mins1End;
  }

  // ==================== LOGIN ATTEMPT TRACKING ====================

  async recordLoginAttempt(username: string, ipAddress: string | null, successful: boolean): Promise<void> {
    await db.insert(loginAttempts).values({
      username,
      ipAddress: ipAddress || null,
      successful: successful ? 1 : 0,
    });
  }

  async getRecentFailedAttempts(username: string, minutesAgo: number = 15): Promise<number> {
    const timeThreshold = new Date(Date.now() - minutesAgo * 60 * 1000);

    const attempts = await db
      .select()
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.username, username),
          eq(loginAttempts.successful, 0),
          gte(loginAttempts.attemptedAt, timeThreshold)
        )
      );

    return attempts.length;
  }

  // OPTIMIZED: Get login status (locked + required delay) in ONE query
  async getLoginStatus(username: string): Promise<{
    isLocked: boolean;
    requiredDelay: number;
    failedAttempts: number;
  }> {
    const failedAttempts = await this.getRecentFailedAttempts(username, 15);

    // Check if account is locked
    const isLocked = failedAttempts >= 10;

    // Calculate required delay based on failed attempts
    let requiredDelay = 0;
    if (failedAttempts <= 3) requiredDelay = 0;           // No delay for first 3 attempts
    else if (failedAttempts === 4) requiredDelay = 2000;  // 2 seconds
    else if (failedAttempts === 5) requiredDelay = 5000;  // 5 seconds
    else if (failedAttempts === 6) requiredDelay = 15000; // 15 seconds
    else if (failedAttempts === 7) requiredDelay = 30000; // 30 seconds
    else if (failedAttempts === 8) requiredDelay = 60000; // 60 seconds
    else if (failedAttempts === 9) requiredDelay = 90000; // 90 seconds
    else requiredDelay = 120000;                           // 120 seconds (2 minutes) for 10+

    return { isLocked, requiredDelay, failedAttempts };
  }

  // Keep legacy methods for backwards compatibility
  async isAccountLocked(username: string): Promise<boolean> {
    const status = await this.getLoginStatus(username);
    return status.isLocked;
  }

  async getRequiredDelay(username: string): Promise<number> {
    const status = await this.getLoginStatus(username);
    return status.requiredDelay;
  }

  async clearLoginAttempts(username: string): Promise<void> {
    // Delete all login attempts for this user older than 24 hours
    const timeThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db
      .delete(loginAttempts)
      .where(
        and(
          eq(loginAttempts.username, username),
          sql`${loginAttempts.attemptedAt} < ${timeThreshold}`
        )
      );
  }

  // ==================== TRIAL LESSON METHODS ====================

  // ==================== BOOKING METHODS (NEW) ====================
  
  /**
   * ✅ REFACTOR: Create trial booking directly in trial_bookings table
   * No price field - trials are always free
   */
  async createTrialBooking(booking: InsertBooking): Promise<Booking> {
    const result = await db.insert(bookings).values(booking);
    const newBooking = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, Number(result[0].insertId)))
      .limit(1);
    
    if (!newBooking[0]) throw new Error('Failed to create trial booking');
    return newBooking[0];
  }

  /**
   * ✅ REFACTOR: Create booking (alias for backward compatibility)
   * Routes to trial_bookings table
   */
  async createBooking(booking: InsertBooking): Promise<Booking> {
    return this.createTrialBooking(booking);
  }

  /**
   * ✅ REFACTOR: Get trial booking count from trial_bookings table
   */
  async getTrialBookingCount(studentId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bookings)
      .where(eq(bookings.studentId, studentId));
    
    return result[0]?.count || 0;
  }

  /**
   * ✅ SECURITY: Check if student is trying to book themselves
   */
  async checkSelfBooking(studentId: number, tutorId: number): Promise<boolean> {
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

    return !!(student && tutor && student.userId === tutor.userId);
  }

  /**
   * ✅ CONSTRAINT: Check if student already has trial with tutor
   * ✅ UPDATED: Removed isTrial filter - trial_bookings table only contains trials
   *
   * Business Rules:
   * - Student can have ONLY ONE trial booking per tutor
   * - Database enforces: UNIQUE INDEX on (student_id, tutor_id)
   * - Regular bookings are handled separately in class_enrollments table
   */
  async hasTrialBookingWithTutor(studentId: number, tutorId: number): Promise<boolean> {
    const [existing] = await db
      .select({ id: bookings.id })
      .from(bookings) // bookings = trialBookings alias
      .where(
        and(
          eq(bookings.studentId, studentId),
          eq(bookings.tutorId, tutorId)
          // No need to check isTrial - all records are trials
        )
      )
      .limit(1);

    return !!existing;
  }

  /**
   * ✅ COMPREHENSIVE: Validate booking before creation
   * ✅ OPTIMIZED: Single combined query for trial checks instead of 2 separate queries
   *
   * Two-layer protection:
   * 1. Application Layer (this function) - Fast validation with clear error messages
   * 2. Database Layer - UNIQUE constraint prevents race conditions
   *
   * Validation Rules:
   * - No self-booking (student cannot book themselves as tutor)
   * - One trial per tutor (enforced by DB constraint)
   * - Max 3 trials total per student
   */
  async validateBooking(params: {
    studentId: number;
    tutorId: number;
    isTrial: boolean;
  }): Promise<{ valid: boolean; error?: string; trialCount?: number }> {
    const { studentId, tutorId, isTrial } = params;

    // Check 1: Self-booking
    const isSelfBooking = await this.checkSelfBooking(studentId, tutorId);
    if (isSelfBooking) {
      return { valid: false, error: "Bạn không thể đặt lịch học với chính mình" };
    }

    // Check 2: Trial constraints (OPTIMIZED: Single query gets both counts)
    if (isTrial) {
      // ✅ PERFORMANCE: Get all trial bookings for student in ONE query
      const allTrials = await db
        .select({ id: bookings.id, tutorId: bookings.tutorId })
        .from(bookings)
        .where(eq(bookings.studentId, studentId));

      const trialCount = allTrials.length;
      const hasTrial = allTrials.some(t => t.tutorId === tutorId);

      if (hasTrial) {
        return {
          valid: false,
          error: "Bạn đã có buổi học thử với giáo viên này rồi",
          trialCount,
        };
      }

      if (trialCount >= 3) {
        return {
          valid: false,
          error: "Bạn đã sử dụng hết 3 lượt học thử miễn phí",
          trialCount,
        };
      }

      return { valid: true, trialCount };
    }

    return { valid: true };
  }

  /**
   * ✅ NEW: Get booking count for specific availability slot
   * Used to track how many students booked a specific time slot
   */
  async getBookingCountForAvailability(availabilityId: number, excludeStatuses: string[] = ['cancelled']): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bookings)
      .where(
        and(
          eq(bookings.availabilityId, availabilityId),
          not(inArray(bookings.status, excludeStatuses))
        )
      );
    
    return result[0]?.count || 0;
  }

  /**
   * ✅ NEW: Get all bookings for a specific availability slot
   * Useful for displaying who booked a time slot
   */
  async getBookingsForAvailability(availabilityId: number): Promise<Booking[]> {
    return db
      .select()
      .from(bookings)
      .where(eq(bookings.availabilityId, availabilityId))
      .orderBy(bookings.createdAt);
  }

  /**
   * ✅ NEW: Get bookings by student and tutor
   * Used to check booking history
   */
  async getBookingsByStudentAndTutor(studentId: number, tutorId: number): Promise<Booking[]> {
    return db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.studentId, studentId),
          eq(bookings.tutorId, tutorId)
        )
      )
      .orderBy(desc(bookings.createdAt));
  }

  // ==================== USER PROFILE METHODS (ENHANCED) ====================

  /**
   * ✅ REFACTOR: Get user with full name from users table
   */
  async getUserWithProfile(userId: number) {
    const user = await this.getUserById(userId);
    if (!user) return null;

    // Get tutor profile if exists
    const tutorProfile = await db
      .select()
      .from(tutors)
      .where(eq(tutors.userId, userId))
      .limit(1);

    // Get student profile if exists  
    const studentProfile = await db
      .select()
      .from(students)
      .where(eq(students.userId, userId))
      .limit(1);

    return {
      ...user,
      tutorProfile: tutorProfile[0] || null,
      studentProfile: studentProfile[0] || null,
    };
  }

  /**
   * ✅ UPDATE: Create or update student profile with full_name in users table
   */
  async createOrUpdateStudentProfile(params: {
    userId: number;
    fullName?: string;
    gradeLevelId?: number;
    phone?: string;
  }): Promise<Student> {
    const { userId, fullName, gradeLevelId, phone } = params;

    // ✅ AUTO: Add "student" role when creating student profile
    const user = await this.getUserById(userId);
    if (user) {
      const updatedRoles = addRole(user.role, 'student');
      await db
        .update(users)
        .set({ role: updatedRoles })
        .where(eq(users.id, userId));
    }

    // Update users table with full_name and phone
    if (fullName || phone) {
      await db
        .update(users)
        .set({
          ...(fullName && { fullName }),
          ...(phone && { phone }),
        })
        .where(eq(users.id, userId));
    }

    // Check if student profile exists
    const existing = await db
      .select()
      .from(students)
      .where(eq(students.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(students)
        .set({
          ...(gradeLevelId && { gradeLevelId }),
          updatedAt: new Date(),
        })
        .where(eq(students.userId, userId));

      const [updated] = await db
        .select()
        .from(students)
        .where(eq(students.userId, userId))
        .limit(1);

      return updated;
    } else {
      // Create new
      const [result] = await db
        .insert(students)
        .values({
          userId,
          gradeLevelId: gradeLevelId || null,
        });

      const newStudent = await db
        .select()
        .from(students)
        .where(eq(students.id, Number(result.insertId)))
        .limit(1);

      return newStudent[0];
    }
  }

  // ==================== CLASS ENROLLMENT ALIAS ====================

  /**
   * ✅ PERFORMANCE: Create class enrollment (alias for createEnrollment)
   * Provides clearer naming for package-based bookings
   */
  async createClassEnrollment(data: InsertClassEnrollment): Promise<ClassEnrollment> {
    return this.createEnrollment(data);
  }

  /**
   * ✅ PERFORMANCE: Update transaction by lesson ID
   */
  async updateTransactionByLessonId(lessonId: number, updates: Partial<InsertTransaction>): Promise<void> {
    await db.update(transactions).set(updates).where(eq(transactions.lessonId, lessonId));
  }

  // ==================== LESSON/TRIAL BOOKING METHODS ====================

  /**
   * Get lesson/trial booking by ID
   * Alias for trial bookings (backward compatibility)
   */
  async getLessonById(id: number): Promise<Booking | undefined> {
    const result = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    return result[0];
  }

  /**
   * Update lesson/trial booking
   */
  async updateLesson(id: number, updates: Partial<InsertBooking>): Promise<Booking> {
    await db.update(bookings).set(updates).where(eq(bookings.id, id));
    const updated = await this.getLessonById(id);
    if (!updated) throw new Error('Failed to update lesson');
    return updated;
  }

  /**
   * Get lessons by tutor ID
   */
  async getLessonsByTutor(tutorId: string): Promise<Booking[]> {
    return db.select().from(bookings).where(eq(bookings.tutorId, parseInt(tutorId)));
  }

  /**
   * Get lessons by student ID
   */
  async getLessonsByStudent(studentId: string): Promise<Booking[]> {
    return db.select().from(bookings).where(eq(bookings.studentId, parseInt(studentId)));
  }

  // ==================== VIDEO CALL SESSION METHODS ====================

  /**
   * Create video call session for trial or paid lessons
   */
  async createVideoCallSession(data: {
    enrollmentId?: number;
    lessonId?: number;
    sessionRecordId?: number;
    tutorId: number;
    studentId: number;
    roomName: string;
    accessToken: string;
    tutorToken: string;
    studentToken: string;
    scheduledStartTime: Date | string;
    scheduledEndTime: Date | string;
    expiresAt: Date | string;
    status?: string;
    paymentStatus?: string;
    canStudentJoin?: number;
    canTutorJoin?: number;
    notes?: string;
  }) {
    const { videoCallSessions } = await import('./schema');

    const result = await db.insert(videoCallSessions).values({
      enrollmentId: data.enrollmentId || null,
      lessonId: data.lessonId || null,
      sessionRecordId: data.sessionRecordId || null,
      tutorId: data.tutorId,
      studentId: data.studentId,
      roomName: data.roomName,
      accessToken: data.accessToken,
      tutorToken: data.tutorToken,
      studentToken: data.studentToken,
      scheduledStartTime: typeof data.scheduledStartTime === 'string'
        ? new Date(data.scheduledStartTime)
        : data.scheduledStartTime,
      scheduledEndTime: typeof data.scheduledEndTime === 'string'
        ? new Date(data.scheduledEndTime)
        : data.scheduledEndTime,
      expiresAt: typeof data.expiresAt === 'string'
        ? new Date(data.expiresAt)
        : data.expiresAt,
      status: data.status || 'pending',
      paymentStatus: data.paymentStatus || 'unpaid',
      canStudentJoin: data.canStudentJoin ?? 1,
      canTutorJoin: data.canTutorJoin ?? 1,
      notes: data.notes,
    });

    const newSession = await db
      .select()
      .from(videoCallSessions)
      .where(eq(videoCallSessions.id, Number(result[0].insertId)))
      .limit(1);

    if (!newSession[0]) throw new Error('Failed to create video call session');
    return newSession[0];
  }

  /**
   * Get video call session by access token
   */
  async getVideoCallSessionByAccessToken(accessToken: string) {
    const { videoCallSessions } = await import('./schema');
    const result = await db
      .select()
      .from(videoCallSessions)
      .where(eq(videoCallSessions.accessToken, accessToken))
      .limit(1);
    return result[0];
  }

  /**
   * Get video call session by lesson ID
   */
  async getVideoCallSessionByLessonId(lessonId: number) {
    const { videoCallSessions } = await import('./schema');
    const result = await db
      .select()
      .from(videoCallSessions)
      .where(eq(videoCallSessions.lessonId, lessonId))
      .limit(1);
    return result[0];
  }

  /**
   * Update video call session
   */
  async updateVideoCallSession(id: number, updates: {
    tutorJoinedAt?: Date;
    studentJoinedAt?: Date;
    tutorLeftAt?: Date;
    studentLeftAt?: Date;
    sessionEndedAt?: Date;
    status?: string;
    usedCount?: number;
    ipAddresses?: string;
  }) {
    const { videoCallSessions } = await import('./schema');
    await db.update(videoCallSessions).set(updates).where(eq(videoCallSessions.id, id));
  }

  /**
   * Track user joining video call session
   */
  async trackVideoCallJoin(accessToken: string, userType: 'tutor' | 'student', ipAddress?: string) {
    const session = await this.getVideoCallSessionByAccessToken(accessToken);
    if (!session) throw new Error('Video call session not found');

    const now = new Date();
    const updates: any = {
      usedCount: (session.usedCount || 0) + 1,
    };

    if (userType === 'tutor') {
      updates.tutorJoinedAt = session.tutorJoinedAt || now;
    } else {
      updates.studentJoinedAt = session.studentJoinedAt || now;
    }

    // Track IP addresses
    if (ipAddress) {
      const ips = session.ipAddresses ? JSON.parse(session.ipAddresses) : [];
      if (!ips.includes(ipAddress)) {
        ips.push(ipAddress);
        updates.ipAddresses = JSON.stringify(ips);
      }
    }

    // Update session status to active if both joined
    if (session.tutorJoinedAt || userType === 'tutor') {
      if (session.studentJoinedAt || userType === 'student') {
        updates.status = 'active';
      }
    }

    await this.updateVideoCallSession(session.id, updates);
    return this.getVideoCallSessionByAccessToken(accessToken);
  }

  /**
   * Track user leaving video call session
   */
  async trackVideoCallLeave(accessToken: string, userType: 'tutor' | 'student') {
    const session = await this.getVideoCallSessionByAccessToken(accessToken);
    if (!session) throw new Error('Video call session not found');

    const now = new Date();
    const updates: any = {};

    if (userType === 'tutor') {
      updates.tutorLeftAt = now;
    } else {
      updates.studentLeftAt = now;
    }

    // If both left, mark session as completed
    if (
      (session.tutorLeftAt || userType === 'tutor') &&
      (session.studentLeftAt || userType === 'student')
    ) {
      updates.status = 'completed';
      updates.sessionEndedAt = now;
    }

    await this.updateVideoCallSession(session.id, updates);
    return this.getVideoCallSessionByAccessToken(accessToken);
  }

  /**
   * OPTIMIZED: Confirm trial lesson in ONE transaction
   * Reduces 9-10 queries to 3-4 queries with parallel execution
   */
  async confirmTrialLesson(params: {
    lessonId: number;
    tutorUserId: number;
    date: string;
    startTime: string;
    endTime: string;
  }) {
    const { lessonId, tutorUserId, date, startTime, endTime } = params;

    // STEP 1: Fetch all needed data in ONE query with JOINs (including student user info)
    const lessonData = await db
      .select({
        lesson: bookings,
        tutor: tutors,
        tutorUser: {
          id: users.id,
          fullName: users.fullName,
          username: users.username,
        },
        student: students,
        studentUser: {
          id: sql<number>`student_user.id`,
          fullName: sql<string>`student_user.full_name`,
          username: sql<string>`student_user.username`,
        },
      })
      .from(bookings)
      .innerJoin(tutors, eq(tutors.id, bookings.tutorId))
      .innerJoin(users, eq(users.id, tutors.userId))
      .innerJoin(students, eq(students.id, bookings.studentId))
      .innerJoin(sql`users AS student_user`, sql`student_user.id = ${students.userId}`)
      .where(eq(bookings.id, lessonId))
      .limit(1);

    if (!lessonData[0]) {
      throw new Error('Lesson not found');
    }

    const { lesson, tutor, tutorUser, student, studentUser } = lessonData[0];

    // Verify tutor authorization
    if (tutor.userId !== tutorUserId) {
      throw new Error('Unauthorized - Only the assigned tutor can confirm this lesson');
    }

    // Check lesson status
    if (lesson.status !== 'pending') {
      throw new Error(`Lesson cannot be confirmed. Current status: ${lesson.status}`);
    }

    // STEP 2: Generate tokens and prepare data
    const { generateJitsiToken, generateRoomName, generateAccessToken } = await import('./jitsi');

    const roomName = generateRoomName(`trial-${lessonId}`);
    const accessToken = generateAccessToken();

    // Parse times as Vietnam timezone (UTC+7) using timezone helper
    // User inputs time in VN, helper converts to UTC for database storage
    const scheduledDateTime = parseVNDateTime(date, startTime);
    const scheduledEndDateTime = parseVNDateTime(date, endTime);
    const expiresAt = addHours(scheduledEndDateTime, 2); // Expires 2 hours after end

    // Calculate JWT expiration (in seconds from now)
    const jwtExpiresIn = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

    // Generate REAL Jitsi JWT tokens for tutor and student
    const tutorFullName = tutorUser.fullName || tutorUser.username || 'Giáo viên';
    const studentFullName = studentUser.fullName || studentUser.username || 'Học sinh';

    const tutorToken = await generateJitsiToken({
      roomName,
      userId: tutorUser.id.toString(),
      userName: tutorFullName,
      moderator: true, // Tutor has moderator privileges
      expiresIn: jwtExpiresIn,
    });

    const studentToken = await generateJitsiToken({
      roomName,
      userId: studentUser.id.toString(),
      userName: studentFullName,
      moderator: false, // Student is participant
      expiresIn: jwtExpiresIn,
    });

    const meetingLink = `${process.env.NEXT_PUBLIC_APP_URL}/video-call/${accessToken}`;

    // STEP 3: Delete old video sessions first (prevent duplicate sessions for same lesson)
    const { videoCallSessions } = await import('./schema');
    await db.delete(videoCallSessions).where(eq(videoCallSessions.lessonId, lessonId));

    // STEP 4: Execute all writes in PARALLEL (3 independent operations)
    const [videoSessionResult, , notificationResult] = await Promise.all([
      // Create NEW video call session
      db.insert(videoCallSessions).values({
        lessonId: lessonId,
        tutorId: tutor.userId,
        studentId: student.userId,
        roomName: roomName,
        accessToken: accessToken,
        tutorToken: tutorToken,
        studentToken: studentToken,
        scheduledStartTime: scheduledDateTime,
        scheduledEndTime: scheduledEndDateTime,
        expiresAt: expiresAt,
        status: 'pending',
        paymentStatus: 'paid',
        canStudentJoin: 1,
        canTutorJoin: 1,
      }),

      // Update lesson
      db.update(bookings).set({
        status: 'confirmed',
        tutorConfirmed: 1,
        date: date,
        startTime: startTime,
        endTime: endTime,
        meetingLink: meetingLink,
      }).where(eq(bookings.id, lessonId)),

      // Create notification for student
      db.insert(notifications).values({
        userId: student.userId,
        type: 'confirmation',
        title: '✅ Lịch học thử đã được xác nhận',
        message: `Giáo viên ${tutorFullName} đã xác nhận buổi học thử vào ${new Date(date).toLocaleDateString('vi-VN')} lúc ${startTime} - ${endTime}. Link học sẽ có sẵn trong dashboard của bạn.`,
        link: `/student/lessons/${lessonId}`,
        isRead: 0,
      }),
    ]);

    // Return consolidated result (no additional queries needed)
    return {
      lesson: {
        ...lesson,
        status: 'confirmed',
        tutorConfirmed: 1,
        date,
        startTime,
        endTime,
        meetingLink,
      },
      videoSession: {
        id: Number(videoSessionResult[0].insertId),
        roomName,
        meetingLink,
        scheduledStartTime: scheduledDateTime,
        scheduledEndTime: scheduledEndDateTime,
      },
      notification: {
        id: Number(notificationResult[0].insertId),
      }
    };
  }
}


// Export singleton instance
export const storage = new DatabaseStorage();
