import { db } from './db';
import {
  users,
  tutorAvailability,
  lessons,
  tutors,
  subjects,
  gradeLevels,
  tutorSubjects,
  timeSlots,
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
  auditLogs
} from './schema';
import type {
  User,
  InsertUser,
  TutorAvailability,
  InsertTutorAvailability,
  Lesson,
  InsertLesson,
  Tutor,
  InsertTutor,
  Subject,
  GradeLevel,
  TutorSubject,
  InsertTutorSubject,
  TimeSlot,
  InsertTimeSlot,
  Transaction,
  InsertTransaction,
  Review,
  InsertReview,
  Notification,
  InsertNotification,
  Student,
  InsertStudent
} from './schema';
import { eq, and, sql, like, desc, asc, inArray } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

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

    const result = await db.insert(users).values({
      ...insertUser,
      password: hashedPassword,
    });

    const newUser = await this.getUserById(Number(result[0].insertId));
    if (!newUser) throw new Error('Failed to create user');
    return newUser;
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // ==================== TUTOR PROFILE METHODS ====================

  async createTutor(insertTutor: InsertTutor): Promise<Tutor> {
    const result = await db.insert(tutors).values(insertTutor);
    const newTutor = await this.getTutorById(Number(result[0].insertId));
    if (!newTutor) throw new Error('Failed to create tutor');
    return newTutor;
  }

  async getTutorById(id: number): Promise<Tutor | undefined> {
    const result = await db.select().from(tutors).where(eq(tutors.id, id)).limit(1);
    return result[0];
  }

  // OPTIMIZED: Batch fetch tutors by IDs in ONE query
  async getTutorsByIds(ids: number[]): Promise<Tutor[]> {
    if (ids.length === 0) return [];
    return db.select().from(tutors).where(inArray(tutors.id, ids));
  }

  async getTutorByUserId(userId: number): Promise<Tutor | undefined> {
    const result = await db.select().from(tutors).where(eq(tutors.userId, userId)).limit(1);
    return result[0];
  }

  // Get single tutor with all related data
  async getTutorByIdEnriched(id: number): Promise<(Tutor & {
    tutorSubjects: Array<TutorSubject & { subject: Subject; gradeLevel: GradeLevel }>;
    timeSlots: TimeSlot[];
  }) | undefined> {
    const tutor = await this.getTutorById(id);

    if (!tutor) {
      return undefined;
    }

    // Fetch tutor subjects with related data
    const tutorSubjectsData = await db
      .select({
        tutorSubject: tutorSubjects,
        subject: subjects,
        gradeLevel: gradeLevels,
      })
      .from(tutorSubjects)
      .innerJoin(subjects, eq(subjects.id, tutorSubjects.subjectId))
      .innerJoin(gradeLevels, eq(gradeLevels.id, tutorSubjects.gradeLevelId))
      .where(eq(tutorSubjects.tutorId, id));

    // Fetch time slots
    const timeSlotsData = await db
      .select()
      .from(timeSlots)
      .where(eq(timeSlots.tutorId, id))
      .orderBy(asc(timeSlots.dayOfWeek), asc(timeSlots.startTime));

    return {
      ...tutor,
      tutorSubjects: tutorSubjectsData.map(row => ({
        ...row.tutorSubject,
        subject: row.subject,
        gradeLevel: row.gradeLevel,
      })),
      timeSlots: timeSlotsData,
    };
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
    // Base conditions
    const conditions = [
      eq(tutors.isActive, 1),
      eq(tutors.verificationStatus, 'verified')
    ];

    // Build query with potential JOINs based on filters
    let baseQuery = db.select({ tutors }).from(tutors);

    // If filtering by subject or grade level, use JOIN with tutor_subjects
    if (filters?.subjectId || filters?.gradeLevelId || filters?.subject || filters?.gradeLevel) {
      baseQuery = db
        .selectDistinct({ tutors })
        .from(tutors)
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

    // If filtering by time availability, join with time_slots
    if (filters?.shiftType || filters?.dayOfWeek !== undefined) {
      baseQuery = db
        .selectDistinct({ tutors })
        .from(tutors)
        .innerJoin(timeSlots, eq(timeSlots.tutorId, tutors.id)) as any;

      conditions.push(eq(timeSlots.isAvailable, 1));

      if (filters.shiftType) {
        conditions.push(eq(timeSlots.shiftType, filters.shiftType));
      }

      if (filters.dayOfWeek !== undefined) {
        conditions.push(eq(timeSlots.dayOfWeek, filters.dayOfWeek));
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

    // Search by tutor name
    if (filters?.searchText) {
      conditions.push(like(tutors.fullName, `%${filters.searchText}%`));
    }

    // Filter by category (need to join gradeLevels if not already joined)
    if (filters?.category) {
      // Check if we already joined with gradeLevels
      const hasGradeLevelJoin = filters?.subjectId || filters?.gradeLevelId || filters?.subject || filters?.gradeLevel;

      if (!hasGradeLevelJoin) {
        baseQuery = db
          .selectDistinct({ tutors })
          .from(tutors)
          .innerJoin(tutorSubjects, eq(tutorSubjects.tutorId, tutors.id))
          .innerJoin(gradeLevels, eq(gradeLevels.id, tutorSubjects.gradeLevelId)) as any;
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

    // Apply pagination
    if (filters?.limit) {
      finalQuery = finalQuery.limit(filters.limit);
    }
    if (filters?.offset) {
      finalQuery = finalQuery.offset(filters.offset);
    }

    // Execute query and extract tutors from result
    const results = await finalQuery;
    return results.map((r: any) => r.tutors || r);
  }

  // NEW: Get tutors with all related data (subjects, grade levels, time slots) in ONE query
  // This dramatically reduces database connections - from O(n) to O(1)
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
    timeSlots: TimeSlot[];
  }>> {
    // First, get the filtered tutor IDs
    const filteredTutors = await this.getAllTutors(filters);

    if (filteredTutors.length === 0) {
      return [];
    }

    const tutorIds = filteredTutors.map(t => t.id);

    // Fetch all tutor subjects for these tutors in ONE query
    const allTutorSubjects = await db
      .select({
        tutorSubject: tutorSubjects,
        subject: subjects,
        gradeLevel: gradeLevels,
      })
      .from(tutorSubjects)
      .innerJoin(subjects, eq(subjects.id, tutorSubjects.subjectId))
      .innerJoin(gradeLevels, eq(gradeLevels.id, tutorSubjects.gradeLevelId))
      .where(inArray(tutorSubjects.tutorId, tutorIds));

    // Fetch all time slots for these tutors in ONE query
    const allTimeSlots = await db
      .select()
      .from(timeSlots)
      .where(inArray(timeSlots.tutorId, tutorIds))
      .orderBy(asc(timeSlots.dayOfWeek), asc(timeSlots.startTime));

    // Group the data by tutor ID
    const tutorSubjectsMap = new Map<number, Array<TutorSubject & { subject: Subject; gradeLevel: GradeLevel }>>();
    const timeSlotsMap = new Map<number, TimeSlot[]>();

    allTutorSubjects.forEach(row => {
      const tutorId = row.tutorSubject.tutorId;
      if (!tutorSubjectsMap.has(tutorId)) {
        tutorSubjectsMap.set(tutorId, []);
      }
      tutorSubjectsMap.get(tutorId)!.push({
        ...row.tutorSubject,
        subject: row.subject,
        gradeLevel: row.gradeLevel,
      });
    });

    allTimeSlots.forEach(slot => {
      const tutorId = slot.tutorId;
      if (!timeSlotsMap.has(tutorId)) {
        timeSlotsMap.set(tutorId, []);
      }
      timeSlotsMap.get(tutorId)!.push(slot);
    });

    // Combine everything
    return filteredTutors.map(tutor => ({
      ...tutor,
      tutorSubjects: tutorSubjectsMap.get(tutor.id) || [],
      timeSlots: timeSlotsMap.get(tutor.id) || [],
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

  async getAllSubjects(): Promise<Subject[]> {
    return db.select().from(subjects).where(eq(subjects.isActive, 1));
  }

  async getSubjectById(id: number): Promise<Subject | undefined> {
    const result = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
    return result[0];
  }

  // ==================== GRADE LEVEL METHODS ====================

  async getAllGradeLevels(): Promise<GradeLevel[]> {
    return db.select().from(gradeLevels).where(eq(gradeLevels.isActive, 1)).orderBy(asc(gradeLevels.sortOrder));
  }

  async getGradeLevelById(id: number): Promise<GradeLevel | undefined> {
    const result = await db.select().from(gradeLevels).where(eq(gradeLevels.id, id)).limit(1);
    return result[0];
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
    return db
      .select()
      .from(timeSlots)
      .where(eq(timeSlots.tutorId, tutorId))
      .orderBy(asc(timeSlots.dayOfWeek), asc(timeSlots.startTime));
  }

  async createTimeSlot(timeSlot: InsertTimeSlot): Promise<TimeSlot> {
    const result = await db.insert(timeSlots).values(timeSlot);
    const newSlot = await db
      .select()
      .from(timeSlots)
      .where(eq(timeSlots.id, Number(result[0].insertId)))
      .limit(1);
    if (!newSlot[0]) throw new Error('Failed to create time slot');
    return newSlot[0];
  }

  async updateTimeSlot(id: number, updates: Partial<InsertTimeSlot>): Promise<TimeSlot | undefined> {
    await db.update(timeSlots).set(updates).where(eq(timeSlots.id, id));
    const result = await db.select().from(timeSlots).where(eq(timeSlots.id, id)).limit(1);
    return result[0];
  }

  async deleteTimeSlot(id: number): Promise<boolean> {
    const result = await db.delete(timeSlots).where(eq(timeSlots.id, id));
    return result[0].affectedRows > 0;
  }

  // ==================== TUTOR AVAILABILITY METHODS ====================

  async createTutorAvailability(availability: InsertTutorAvailability): Promise<TutorAvailability> {
    const result = await db.insert(tutorAvailability).values(availability);
    const newAvailability = await this.getTutorAvailabilityById(Number(result[0].insertId));
    if (!newAvailability) throw new Error('Failed to create availability');
    return newAvailability;
  }

  async getTutorAvailability(tutorId: string): Promise<TutorAvailability[]> {
    return db.select()
      .from(tutorAvailability)
      .where(eq(tutorAvailability.tutorId, tutorId))
      .orderBy(tutorAvailability.dayOfWeek, tutorAvailability.startTime);
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

  async checkAvailabilityConflict(
    tutorId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    excludeId?: number
  ): Promise<boolean> {
    const existing = await db.select()
      .from(tutorAvailability)
      .where(
        and(
          eq(tutorAvailability.tutorId, tutorId),
          eq(tutorAvailability.dayOfWeek, dayOfWeek),
          eq(tutorAvailability.isActive, 1),
          excludeId ? sql`${tutorAvailability.id} != ${excludeId}` : undefined
        )
      );

    for (const slot of existing) {
      if (this.timeRangesOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
        return true;
      }
    }
    return false;
  }

  // ==================== LESSON METHODS ====================

  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    const result = await db.insert(lessons).values(lesson);
    const newLesson = await this.getLessonById(Number(result[0].insertId));
    if (!newLesson) throw new Error('Failed to create lesson');
    return newLesson;
  }

  async getAllLessons(): Promise<Lesson[]> {
    return db.select()
      .from(lessons)
      .orderBy(lessons.date, lessons.startTime);
  }

  async getLessonsByTutor(tutorId: string): Promise<Lesson[]> {
    return db.select()
      .from(lessons)
      .where(eq(lessons.tutorId, tutorId))
      .orderBy(lessons.date, lessons.startTime);
  }

  async getLessonsByStudent(studentId: string): Promise<Lesson[]> {
    return db.select()
      .from(lessons)
      .where(eq(lessons.studentId, studentId))
      .orderBy(lessons.date, lessons.startTime);
  }

  async getLessonById(id: number): Promise<Lesson | undefined> {
    const result = await db.select()
      .from(lessons)
      .where(eq(lessons.id, id))
      .limit(1);
    return result[0];
  }

  async updateLesson(id: number, updates: Partial<InsertLesson>): Promise<Lesson | undefined> {
    await db.update(lessons)
      .set(updates)
      .where(eq(lessons.id, id));

    return this.getLessonById(id);
  }

  async checkLessonConflict(
    userId: string,
    date: string,
    startTime: string,
    endTime: string,
    userType: 'tutor' | 'student'
  ): Promise<boolean> {
    const userLessons = await db.select()
      .from(lessons)
      .where(
        and(
          userType === 'tutor'
            ? eq(lessons.tutorId, userId)
            : eq(lessons.studentId, userId),
          eq(lessons.date, date),
          sql`${lessons.status} != 'cancelled'`
        )
      );

    for (const lesson of userLessons) {
      if (this.timeRangesOverlap(startTime, endTime, lesson.startTime, lesson.endTime)) {
        return true;
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
    const newTransaction = await this.getTransactionById(Number(result[0].insertId));
    if (!newTransaction) throw new Error('Failed to create transaction');
    return newTransaction;
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
    const newNotification = await this.getNotificationById(Number(result[0].insertId));
    if (!newNotification) throw new Error('Failed to create notification');
    return newNotification;
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
    const result = await db.select().from(students).where(eq(students.id, id)).limit(1);
    return result[0];
  }

  async getStudentByUserId(userId: number): Promise<Student | undefined> {
    const result = await db.select().from(students).where(eq(students.userId, userId)).limit(1);
    return result[0];
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
    const newEnrollment = await this.getEnrollmentById(Number(result[0].insertId));
    return newEnrollment;
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
}

// Export singleton instance
export const storage = new DatabaseStorage();
