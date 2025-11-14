import { mysqlTable, text, varchar, int, serial, timestamp, index, decimal } from "drizzle-orm/mysql-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Role types for multiple roles system
export type UserRole = "admin" | "tutor" | "student";

// Helper function to parse roles from JSON string
export function parseRoles(roleJson: string): UserRole[] {
  try {
    const parsed = JSON.parse(roleJson);
    if (Array.isArray(parsed)) {
      return parsed.filter(r => ["admin", "tutor", "student"].includes(r));
    }
    return [];
  } catch {
    return [];
  }
}

// Helper function to check if user has a specific role
export function hasRole(roleJson: string, role: UserRole): boolean {
  const roles = parseRoles(roleJson);
  return roles.includes(role);
}

// Helper function to add role to user
export function addRole(roleJson: string, role: UserRole): string {
  const roles = parseRoles(roleJson);
  if (!roles.includes(role)) {
    roles.push(role);
  }
  return JSON.stringify(roles);
}

// Users table
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(), // Will store bcrypt hash
  email: varchar("email", { length: 255 }).unique(),
  fullName: varchar("full_name", { length: 255 }), // ✅ MOVED from tutors/students to avoid duplication
  role: text("role").notNull(), // JSON array: ["admin"], ["tutor"], ["student"], ["tutor","student"], etc.
  phone: varchar("phone", { length: 20 }),
  avatar: text("avatar"),
  isActive: int("is_active").notNull().default(1), // 1=active, 0=inactive/banned
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  fullNameIdx: index("idx_users_full_name").on(table.fullName),
}));

// Custom validator for roles JSON array
const rolesValidator = z.string().refine(
  (val) => {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) && parsed.every(r => ["admin", "tutor", "student"].includes(r));
    } catch {
      return false;
    }
  },
  { message: "Role phải là JSON array hợp lệ chứa: admin, tutor, hoặc student" }
);

export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3).max(255),
  password: z.string()
    .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
    .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ hoa")
    .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất 1 chữ thường")
    .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 số"),
  email: z.string().email().optional(),
  fullName: z.string().min(1).max(255).optional(), // ✅ NEW: Full name in users
  role: rolesValidator.optional(),
  phone: z.string().max(20).optional(),
  avatar: z.string().url().optional(),
  isActive: z.number().int().min(0).max(1).optional(),
}).omit({
  id: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
});

export const selectUserSchema = createSelectSchema(users);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Login attempts tracking (for rate limiting and account lockout)
export const loginAttempts = mysqlTable("login_attempts", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  attemptedAt: timestamp("attempted_at").notNull().defaultNow(),
  successful: int("successful").notNull().default(0), // 1=success, 0=failed
});

export type LoginAttempt = typeof loginAttempts.$inferSelect;

// Password reset tokens (for forgot password functionality)
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: int("used").notNull().default(0), // 0=not used, 1=used
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Trial Bookings (Buổi học thử miễn phí)
// ✅ RENAMED: bookings → trial_bookings (chỉ dành cho trial lessons)
// ✅ REMOVED: isTrial field (redundant - bảng này CHỈ cho trial)
// ✅ CONSTRAINT: 1 student chỉ có 1 trial booking/tutor (enforced by unique index)
// ✅ CONSTRAINT: Student không thể book chính mình (enforced by trigger)
// ==================== TRIAL_BOOKINGS TABLE ====================
// Business Rules:
// 1. Each trial booking MUST link to a tutor_availability slot (availability_id)
// 2. Student can have ONLY ONE trial booking per tutor (enforced by UNIQUE index on student_id, tutor_id)
// 3. Student CANNOT book themselves (validated in application layer)
// 4. Always FREE - no price field (removed from DB)
// 5. Max 3 trial bookings per student (enforced in application layer)
export const trialBookings = mysqlTable("trial_bookings", {
  id: serial("id").primaryKey(),
  tutorId: int("tutor_id").notNull(), // FK → tutors.id
  studentId: int("student_id").notNull(), // FK → students.id
  availabilityId: int("availability_id"), // FK → tutor_availability.id (links booking to specific time slot)
  subject: varchar("subject", { length: 100 }).notNull(),
  date: varchar("date", { length: 15 }).notNull(), // Format: "YYYY-MM-DD"
  startTime: varchar("start_time", { length: 10 }).notNull(), // Format: "HH:MM"
  endTime: varchar("end_time", { length: 10 }).notNull(), // Format: "HH:MM"
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, confirmed, completed, cancelled
  notes: text("notes"),
  tutorConfirmed: int("tutor_confirmed").notNull().default(0), // 0=not confirmed, 1=confirmed
  studentConfirmed: int("student_confirmed").notNull().default(0), // 0=not confirmed, 1=confirmed
  completedAt: timestamp("completed_at"),
  cancelledBy: int("cancelled_by"), // user_id who cancelled
  cancellationReason: text("cancellation_reason"),
  meetingLink: varchar("meeting_link", { length: 500 }), // Zoom/Google Meet link
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  studentIdx: index("idx_trial_bookings_student").on(table.studentId),
  tutorIdx: index("idx_trial_bookings_tutor").on(table.tutorId),
  availabilityIdx: index("idx_trial_bookings_availability").on(table.availabilityId),
  statusIdx: index("idx_trial_bookings_status").on(table.status),
  dateIdx: index("idx_trial_bookings_date").on(table.date),
  // ✅ UNIQUE: One trial booking per student-tutor pair
  uniqueStudentTutorIdx: index("idx_trial_bookings_student_tutor_unique").on(table.studentId, table.tutorId),
}));

export const insertTrialBookingSchema = createInsertSchema(trialBookings, {
  tutorId: z.number().int().positive(),
  studentId: z.number().int().positive(),
  availabilityId: z.number().int().positive().optional(),
  subject: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
  notes: z.string().optional(),
  tutorConfirmed: z.number().int().min(0).max(1).optional(),
  studentConfirmed: z.number().int().min(0).max(1).optional(),
  cancelledBy: z.number().int().positive().optional(),
  cancellationReason: z.string().optional(),
  meetingLink: z.string().max(500).optional(),
}).omit({
  id: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const selectTrialBookingSchema = createSelectSchema(trialBookings);

export type InsertTrialBooking = z.infer<typeof insertTrialBookingSchema>;
export type TrialBooking = typeof trialBookings.$inferSelect;

// ✅ BACKWARD COMPATIBILITY: Keep old aliases pointing to trial_bookings
// Regular bookings are now handled by class_enrollments
export const bookings = trialBookings;
export const insertBookingSchema = insertTrialBookingSchema;
export const selectBookingSchema = selectTrialBookingSchema;
export type InsertBooking = InsertTrialBooking;
export type Booking = TrialBooking;

// ✅ DEPRECATED: Keep alias for maximum backward compatibility
export const lessons = trialBookings;
export const insertLessonSchema = insertTrialBookingSchema;
export const selectLessonSchema = selectTrialBookingSchema;
export type InsertLesson = InsertTrialBooking;
export type Lesson = TrialBooking;

// Tutors table (extended profile for tutors)
// ✅ REMOVED: full_name, phone (now in users table to avoid duplication)
export const tutors = mysqlTable("tutors", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull().unique(), // References users.id
  // ❌ REMOVED: fullName (get from users.full_name)
  // ❌ REMOVED: phone (get from users.phone)
  // ❌ REMOVED: avatar (get from users.avatar)
  bio: text("bio"),
  teachingMethod: text("teaching_method"),
  education: text("education"), // JSON string: [{degree, school, year}]
  certifications: text("certifications"), // JSON string: [string]
  achievements: text("achievements"), // JSON string: [string]
  subjects: text("subjects").notNull(), // ✅ JSON: SYNC with tutor_subjects via triggers for performance
  languages: varchar("languages", { length: 255 }).default("Tiếng Việt"), // Comma-separated
  experience: int("experience").notNull().default(0), // Years of experience
  hourlyRate: int("hourly_rate").notNull(), // VND per hour
  rating: int("rating").default(0), // 0-50 (stored as 0-5.0 * 10 for precision)
  totalReviews: int("total_reviews").default(0),
  totalStudents: int("total_students").default(0),
  videoIntro: text("video_intro"), // URL to video
  occupationId: int("occupation_id"), // Foreign key to occupations table
  verificationStatus: varchar("verification_status", { length: 50 }).default("pending"), // pending, verified, rejected
  approvalStatus: varchar("approval_status", { length: 50 }).default("pending"), // pending, approved, rejected
  approvedBy: int("approved_by"), // Admin user ID who approved/rejected
  approvedAt: timestamp("approved_at"), // When approved/rejected
  rejectionReason: text("rejection_reason"), // Reason for rejection
  isActive: int("is_active").notNull().default(0), // 1=active, 0=inactive (default 0 = chưa live)
  responseTime: int("response_time").default(0), // Average response time in minutes
  responseRate: int("response_rate").default(0), // Response rate 0-100%
  completionRate: int("completion_rate").default(0), // Lesson completion rate 0-100%
  cancellationRate: int("cancellation_rate").default(0), // Cancellation rate 0-100%
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertTutorSchema = createInsertSchema(tutors, {
  userId: z.number().int().positive(),
  // ❌ REMOVED: fullName, phone, avatar validations
  bio: z.string().optional(),
  teachingMethod: z.string().optional(),
  education: z.string().optional(),
  certifications: z.string().optional(),
  achievements: z.string().optional(),
  subjects: z.string().min(1),
  languages: z.string().optional(),
  experience: z.number().int().min(0).optional(),
  hourlyRate: z.number().int().min(0),
  rating: z.number().int().min(0).max(50).optional(),
  totalReviews: z.number().int().min(0).optional(),
  totalStudents: z.number().int().min(0).optional(),
  videoIntro: z.string().url().optional(),
  occupationId: z.number().int().positive().optional().or(z.undefined()),
  verificationStatus: z.enum(["pending", "verified", "rejected"]).optional(),
  approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  approvedBy: z.number().int().positive().optional().or(z.null()),
  approvedAt: z.date().optional().or(z.null()),
  rejectionReason: z.string().optional().or(z.null()),
  isActive: z.number().int().min(0).max(1).optional(),
  responseTime: z.number().int().min(0).optional(),
  responseRate: z.number().int().min(0).max(100).optional(),
  completionRate: z.number().int().min(0).max(100).optional(),
  cancellationRate: z.number().int().min(0).max(100).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectTutorSchema = createSelectSchema(tutors);

export type InsertTutor = z.infer<typeof insertTutorSchema>;
export type Tutor = typeof tutors.$inferSelect;

// ==================== OPTIMIZED TABLES FOR FILTERING & SEARCH ====================

// Subjects table (danh mục môn học chuẩn hóa)
export const subjects = mysqlTable("subjects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  isActive: int("is_active").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSubjectSchema = createInsertSchema(subjects, {
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isActive: z.number().int().min(0).max(1).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const selectSubjectSchema = createSelectSchema(subjects);

export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjects.$inferSelect;

// Grade levels table (cấp lớp chuẩn hóa)
export const gradeLevels = mysqlTable("grade_levels", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(), // "Lớp 1", "Lớp 2", ..., "Lớp 12", "Luyện thi IELTS", etc.
  category: varchar("category", { length: 50 }).notNull(), // "Tiểu học", "THCS", "THPT", "Luyện thi", "Khác"
  subjectId: int("subject_id"), // NULL = dùng chung cho tất cả môn, số cụ thể = chỉ dành cho môn đó
  sortOrder: int("sort_order").notNull().default(0),
  isActive: int("is_active").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGradeLevelSchema = createInsertSchema(gradeLevels).omit({
  id: true,
  createdAt: true,
});

export const selectGradeLevelSchema = createSelectSchema(gradeLevels);

export type InsertGradeLevel = z.infer<typeof insertGradeLevelSchema>;
export type GradeLevel = typeof gradeLevels.$inferSelect;

// Teaching Experience Levels table (cấp độ kinh nghiệm)
// Occupations table (nghề nghiệp)
export const occupations = mysqlTable("occupations", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 50 }).notNull(), // "Giáo viên", "Sinh viên", "Gia sư", "Chuyên gia"
  sortOrder: int("sort_order").notNull().default(0),
  isActive: int("is_active").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOccupationSchema = createInsertSchema(occupations).omit({
  id: true,
  createdAt: true,
});

export const selectOccupationSchema = createSelectSchema(occupations);

export type InsertOccupation = z.infer<typeof insertOccupationSchema>;
export type Occupation = typeof occupations.$inferSelect;

// Tutor-Subject relationship (many-to-many) - TỐI ƯU CHO FILTER
export const tutorSubjects = mysqlTable("tutor_subjects", {
  id: serial("id").primaryKey(),
  tutorId: int("tutor_id").notNull(),
  subjectId: int("subject_id").notNull(),
  gradeLevelId: int("grade_level_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTutorSubjectSchema = createInsertSchema(tutorSubjects, {
  tutorId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  gradeLevelId: z.number().int().positive(),
}).omit({
  id: true,
  createdAt: true,
});

export const selectTutorSubjectSchema = createSelectSchema(tutorSubjects);

export type InsertTutorSubject = z.infer<typeof insertTutorSubjectSchema>;
export type TutorSubject = typeof tutorSubjects.$inferSelect;

// ==================== TIME MANAGEMENT SYSTEM ====================

// Tutor Availability (Thời gian rảnh định kỳ của gia sư)
export const tutorAvailability = mysqlTable("tutor_availability", {
  id: serial("id").primaryKey(),
  tutorId: int("tutor_id").notNull(),
  recurringDays: varchar("recurring_days", { length: 100 }), // JSON array string e.g. "[1,3,5]" for Mon/Wed/Fri
  shiftType: varchar("shift_type", { length: 20 }).notNull(), // "morning", "afternoon", "evening"
  startTime: varchar("start_time", { length: 10 }).notNull(), // "HH:MM" or TIME
  endTime: varchar("end_time", { length: 10 }).notNull(), // "HH:MM" or TIME
  isActive: int("is_active").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  tutorRecurringIdx: index("idx_tutor_recurring").on(table.tutorId, table.recurringDays),
  activeIdx: index("idx_active").on(table.isActive),
}));

export const insertTutorAvailabilitySchema = createInsertSchema(tutorAvailability, {
  tutorId: z.number().int().positive(),
  recurringDays: z.string().min(1, "Vui lòng chọn ít nhất 1 ngày"), // JSON array string e.g. "[1,3,5]"
  shiftType: z.enum(["morning", "afternoon", "evening"]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Giờ phải có định dạng HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Giờ phải có định dạng HH:MM"),
  isActive: z.number().int().min(0).max(1).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTutorAvailability = z.infer<typeof insertTutorAvailabilitySchema>;
export type TutorAvailability = typeof tutorAvailability.$inferSelect;

// Availability Exceptions (Ngoại lệ thời gian rảnh)
export const availabilityExceptions = mysqlTable("availability_exceptions", {
  id: serial("id").primaryKey(),
  tutorId: int("tutor_id").notNull(),
  exceptionDate: varchar("exception_date", { length: 15 }).notNull(), // "YYYY-MM-DD"
  exceptionType: varchar("exception_type", { length: 20 }).notNull(), // "blocked", "available"
  startTime: varchar("start_time", { length: 10 }),
  endTime: varchar("end_time", { length: 10 }),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tutorDateIdx: index("idx_tutor_date").on(table.tutorId, table.exceptionDate),
}));

export const insertAvailabilityExceptionSchema = createInsertSchema(availabilityExceptions, {
  tutorId: z.number().int().positive(),
  exceptionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  exceptionType: z.enum(["blocked", "available"]),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().max(255).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertAvailabilityException = z.infer<typeof insertAvailabilityExceptionSchema>;
export type AvailabilityException = typeof availabilityExceptions.$inferSelect;

// ==================== HELPER FUNCTIONS ====================

// Calculate hours from time slot
export function calculateHours(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return (endMinutes - startMinutes) / 60;
}

// Calculate fee based on time slot and hourly rate
export function calculateFee(startTime: string, endTime: string, hourlyRate: number): number {
  const hours = calculateHours(startTime, endTime);
  return Math.round(hours * hourlyRate);
}

// ==================== NEW TABLES FOR COMPLETE SYSTEM ====================

// Student Profiles (hồ sơ học sinh chi tiết)
export const students = mysqlTable("students", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull().unique(), // References users.id
  // ❌ REMOVED: fullName (get from users.full_name)
  // ❌ REMOVED: avatar (get from users.avatar)
  // ❌ REMOVED: phone (get from users.phone)
  dateOfBirth: varchar("date_of_birth", { length: 15 }), // YYYY-MM-DD
  gradeLevelId: int("grade_level_id"), // FK → grade_levels.id
  parentName: varchar("parent_name", { length: 255 }),
  parentPhone: varchar("parent_phone", { length: 20 }),
  address: text("address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertStudentSchema = createInsertSchema(students, {
  userId: z.number().int().positive(),
  // ❌ REMOVED: fullName, phone, avatar validations
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gradeLevelId: z.number().int().positive().optional(),
  parentName: z.string().max(255).optional(),
  parentPhone: z.string().max(20).optional(),
  address: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectStudentSchema = createSelectSchema(students);

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

// Reviews (đánh giá từ học sinh)
export const reviews = mysqlTable("reviews", {
  id: serial("id").primaryKey(),
  lessonId: int("lesson_id").notNull(), // FK → lessons.id
  tutorId: int("tutor_id").notNull(), // FK → tutors.id
  studentId: int("student_id").notNull(), // FK → users.id
  rating: int("rating").notNull(), // 1-5
  comment: text("comment"),
  reply: text("reply"), // Tutor's reply to review
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertReviewSchema = createInsertSchema(reviews, {
  lessonId: z.number().int().positive(),
  tutorId: z.number().int().positive(),
  studentId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  reply: z.string().optional(),
}).omit({
  id: true,
  repliedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const selectReviewSchema = createSelectSchema(reviews);

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// Notifications (thông báo trong hệ thống)
export const notifications = mysqlTable("notifications", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(), // FK → users.id
  type: varchar("type", { length: 50 }).notNull(), // 'booking', 'confirmation', 'reminder', 'review_request', 'review_received'
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  link: varchar("link", { length: 500 }), // URL to related resource
  isRead: int("is_read").notNull().default(0), // 0=unread, 1=read
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications, {
  userId: z.number().int().positive(),
  type: z.enum(['booking', 'confirmation', 'reminder', 'review_request', 'review_received', 'payment', 'cancellation']),
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  link: z.string().max(500).optional(),
  isRead: z.number().int().min(0).max(1).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const selectNotificationSchema = createSelectSchema(notifications);

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Transactions (giao dịch thanh toán)
export const transactions = mysqlTable("transactions", {
  id: serial("id").primaryKey(),
  lessonId: int("lesson_id").notNull(), // FK → lessons.id
  studentId: int("student_id").notNull(), // FK → users.id
  tutorId: int("tutor_id").notNull(), // FK → tutors.id
  amount: int("amount").notNull(), // Amount in VND
  method: varchar("method", { length: 50 }).notNull(), // 'vnpay', 'momo', 'bank_transfer'
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'completed', 'failed', 'refunded'
  paymentData: text("payment_data"), // JSON: transaction details from payment gateway
  transactionCode: varchar("transaction_code", { length: 100 }), // External transaction ID
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions, {
  lessonId: z.number().int().positive(),
  studentId: z.number().int().positive(),
  tutorId: z.number().int().positive(),
  amount: z.number().int().min(0),
  method: z.enum(['vnpay', 'momo', 'bank_transfer', 'cash']),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).optional(),
  paymentData: z.string().optional(),
  transactionCode: z.string().max(100).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectTransactionSchema = createSelectSchema(transactions);

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Tutor Documents (tài liệu xác thực gia sư)
export const tutorDocuments = mysqlTable("tutor_documents", {
  id: serial("id").primaryKey(),
  tutorId: int("tutor_id").notNull(), // FK → tutors.id
  documentType: varchar("document_type", { length: 50 }).notNull(), // 'id_card', 'degree', 'certificate', 'other'
  fileUrl: text("file_url").notNull(), // URL to uploaded file
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'approved', 'rejected'
  adminNote: text("admin_note"), // Admin's note when reviewing
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export const insertTutorDocumentSchema = createInsertSchema(tutorDocuments, {
  tutorId: z.number().int().positive(),
  documentType: z.enum(['id_card', 'degree', 'certificate', 'other']),
  fileUrl: z.string().url(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  adminNote: z.string().optional(),
}).omit({
  id: true,
  uploadedAt: true,
  reviewedAt: true,
});

export const selectTutorDocumentSchema = createSelectSchema(tutorDocuments);

export type InsertTutorDocument = z.infer<typeof insertTutorDocumentSchema>;
export type TutorDocument = typeof tutorDocuments.$inferSelect;

// ==================== ESCROW PAYMENT SYSTEM ====================

// Class Enrollments (đăng ký lớp học - gói nhiều buổi)
export const classEnrollments = mysqlTable("class_enrollments", {
  id: serial("id").primaryKey(),
  studentId: int("student_id").notNull(), // FK → students.id
  tutorId: int("tutor_id").notNull(), // FK → tutors.id
  subjectId: int("subject_id").notNull(), // FK → subjects.id
  gradeLevelId: int("grade_level_id").notNull(), // FK → grade_levels.id
  totalSessions: int("total_sessions").notNull(), // Tổng số buổi học trong gói
  completedSessions: int("completed_sessions").notNull().default(0), // Số buổi đã hoàn thành
  pricePerSession: int("price_per_session").notNull(), // Giá mỗi buổi (VND)
  totalAmount: int("total_amount").notNull(), // Tổng tiền = totalSessions * pricePerSession
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, active, completed, cancelled
  startDate: varchar("start_date", { length: 15 }), // YYYY-MM-DD - ngày bắt đầu dự kiến
  endDate: varchar("end_date", { length: 15 }), // YYYY-MM-DD - ngày kết thúc dự kiến
  schedule: text("schedule"), // JSON: lịch học hằng tuần, vd: [{"day": 2, "time": "18:00-19:30"}]
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertClassEnrollmentSchema = createInsertSchema(classEnrollments, {
  studentId: z.number().int().positive(),
  tutorId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  gradeLevelId: z.number().int().positive(),
  totalSessions: z.number().int().min(1).max(100),
  pricePerSession: z.number().int().min(0),
  totalAmount: z.number().int().min(0),
  status: z.enum(['pending', 'active', 'completed', 'cancelled']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  schedule: z.string().optional(),
  notes: z.string().optional(),
}).omit({
  id: true,
  completedSessions: true,
  createdAt: true,
  updatedAt: true,
});

export const selectClassEnrollmentSchema = createSelectSchema(classEnrollments);

export type InsertClassEnrollment = z.infer<typeof insertClassEnrollmentSchema>;
export type ClassEnrollment = typeof classEnrollments.$inferSelect;

// Payments (thanh toán qua cổng - giữ tiền an toàn)
export const payments = mysqlTable("payments", {
  id: serial("id").primaryKey(),
  enrollmentId: int("enrollment_id").notNull(), // FK → class_enrollments.id
  studentId: int("student_id").notNull(), // FK → students.id
  amount: int("amount").notNull(), // Số tiền thanh toán (VND)
  method: varchar("method", { length: 50 }).notNull(), // vnpay, momo
  gateway: varchar("gateway", { length: 50 }).notNull(), // vnpay, momo - tên cổng thanh toán
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, holding, completed, failed, refunded
  transactionCode: varchar("transaction_code", { length: 100 }).unique(), // Mã giao dịch từ cổng
  gatewayTransactionId: varchar("gateway_transaction_id", { length: 100 }), // ID từ VNPay/Momo
  gatewayResponse: text("gateway_response"), // JSON response từ cổng thanh toán
  signature: varchar("signature", { length: 500 }), // HMAC signature từ callback
  signatureVerified: int("signature_verified").notNull().default(0), // 0=chưa verify, 1=đã verify
  ipAddress: varchar("ip_address", { length: 50 }), // IP của người thanh toán
  paidAt: timestamp("paid_at"), // Thời điểm thanh toán thành công
  refundedAt: timestamp("refunded_at"),
  refundReason: text("refund_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertPaymentSchema = createInsertSchema(payments, {
  enrollmentId: z.number().int().positive(),
  studentId: z.number().int().positive(),
  amount: z.number().int().min(0),
  method: z.enum(['vnpay', 'momo', 'bank_transfer']),
  gateway: z.enum(['vnpay', 'momo']),
  status: z.enum(['pending', 'holding', 'completed', 'failed', 'refunded']).optional(),
  transactionCode: z.string().max(100).optional(),
  gatewayTransactionId: z.string().max(100).optional(),
  gatewayResponse: z.string().optional(),
  signature: z.string().max(500).optional(),
  ipAddress: z.string().max(50).optional(),
}).omit({
  id: true,
  signatureVerified: true,
  paidAt: true,
  refundedAt: true,
  refundReason: true,
  createdAt: true,
  updatedAt: true,
});

export const selectPaymentSchema = createSelectSchema(payments);

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Escrow Payments (quản lý tiền giữ và phân phối)
export const escrowPayments = mysqlTable("escrow_payments", {
  id: serial("id").primaryKey(),
  paymentId: int("payment_id").notNull().unique(), // FK → payments.id (1-1 relationship)
  enrollmentId: int("enrollment_id").notNull(), // FK → class_enrollments.id
  totalAmount: int("total_amount").notNull(), // Tổng tiền giữ (VND)
  releasedAmount: int("released_amount").notNull().default(0), // Tiền đã giải ngân cho gia sư
  platformFee: int("platform_fee").notNull().default(0), // Tổng phí nền tảng đã thu
  commissionRate: int("commission_rate").notNull().default(15), // % phí nền tảng (15% mặc định)
  status: varchar("status", { length: 20 }).notNull().default("holding"), // holding, in_progress, completed, refunded
  lastReleaseDate: timestamp("last_release_date"), // Lần cuối giải ngân
  completedAt: timestamp("completed_at"), // Hoàn tất toàn bộ escrow
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertEscrowPaymentSchema = createInsertSchema(escrowPayments, {
  paymentId: z.number().int().positive(),
  enrollmentId: z.number().int().positive(),
  totalAmount: z.number().int().min(0),
  commissionRate: z.number().int().min(0).max(50).optional(), // 0-50%
  status: z.enum(['holding', 'in_progress', 'completed', 'refunded']).optional(),
}).omit({
  id: true,
  releasedAmount: true,
  platformFee: true,
  lastReleaseDate: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const selectEscrowPaymentSchema = createSelectSchema(escrowPayments);

export type InsertEscrowPayment = z.infer<typeof insertEscrowPaymentSchema>;
export type EscrowPayment = typeof escrowPayments.$inferSelect;

// Session Records (ghi nhận từng buổi học thực tế)
export const sessionRecords = mysqlTable("session_records", {
  id: serial("id").primaryKey(),
  enrollmentId: int("enrollment_id").notNull(), // FK → class_enrollments.id
  lessonId: int("lesson_id"), // FK → lessons.id (có thể null nếu chưa tạo lesson)
  sessionNumber: int("session_number").notNull(), // Buổi thứ mấy trong gói (1, 2, 3...)
  date: varchar("date", { length: 15 }).notNull(), // YYYY-MM-DD - ngày học thực tế
  startTime: varchar("start_time", { length: 10 }).notNull(), // HH:MM
  endTime: varchar("end_time", { length: 10 }).notNull(), // HH:MM
  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // scheduled, completed, cancelled, missed
  tutorAttended: int("tutor_attended").notNull().default(0), // 0=chưa điểm danh, 1=có mặt
  studentAttended: int("student_attended").notNull().default(0), // 0=chưa điểm danh, 1=có mặt
  tutorNotes: text("tutor_notes"), // Ghi chú của gia sư
  completedAt: timestamp("completed_at"), // Thời điểm hoàn thành buổi học
  releasedAmount: int("released_amount"), // Số tiền đã giải ngân cho buổi này
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertSessionRecordSchema = createInsertSchema(sessionRecords, {
  enrollmentId: z.number().int().positive(),
  lessonId: z.number().int().positive().optional(),
  sessionNumber: z.number().int().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'missed']).optional(),
  tutorNotes: z.string().optional(),
}).omit({
  id: true,
  tutorAttended: true,
  studentAttended: true,
  completedAt: true,
  releasedAmount: true,
  createdAt: true,
  updatedAt: true,
});

export const selectSessionRecordSchema = createSelectSchema(sessionRecords);

export type InsertSessionRecord = z.infer<typeof insertSessionRecordSchema>;
export type SessionRecord = typeof sessionRecords.$inferSelect;

// Wallets (ví tiền của gia sư và nền tảng)
export const wallets = mysqlTable("wallets", {
  id: serial("id").primaryKey(),
  ownerId: int("owner_id").notNull(), // user_id (tutor) hoặc 0 (platform)
  ownerType: varchar("owner_type", { length: 20 }).notNull(), // tutor, platform
  availableBalance: int("available_balance").notNull().default(0), // Tiền có thể rút ngay
  pendingBalance: int("pending_balance").notNull().default(0), // Tiền đang chờ (escrow chưa release)
  withdrawnBalance: int("withdrawn_balance").notNull().default(0), // Tổng tiền đã rút
  totalEarned: int("total_earned").notNull().default(0), // Tổng thu nhập từ trước đến nay
  lastPayoutDate: timestamp("last_payout_date"), // Lần cuối trả tiền
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertWalletSchema = createInsertSchema(wallets, {
  ownerId: z.number().int().min(0),
  ownerType: z.enum(['tutor', 'platform']),
}).omit({
  id: true,
  availableBalance: true,
  pendingBalance: true,
  withdrawnBalance: true,
  totalEarned: true,
  lastPayoutDate: true,
  createdAt: true,
  updatedAt: true,
});

export const selectWalletSchema = createSelectSchema(wallets);

export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof wallets.$inferSelect;

// Wallet Transactions (lịch sử giao dịch ví)
export const walletTransactions = mysqlTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  walletId: int("wallet_id").notNull(), // FK → wallets.id
  type: varchar("type", { length: 30 }).notNull(), // escrow_release, payout, refund, commission
  amount: int("amount").notNull(), // Số tiền (VND)
  balanceBefore: int("balance_before").notNull(), // Số dư trước giao dịch
  balanceAfter: int("balance_after").notNull(), // Số dư sau giao dịch
  relatedId: int("related_id"), // ID liên quan (payment_id, session_id, enrollment_id...)
  relatedType: varchar("related_type", { length: 50 }), // payment, session, enrollment
  description: text("description"),
  performedBy: int("performed_by"), // user_id của người thực hiện (admin, system)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions, {
  walletId: z.number().int().positive(),
  type: z.enum(['escrow_release', 'payout', 'refund', 'commission', 'withdrawal']),
  amount: z.number().int(),
  balanceBefore: z.number().int(),
  balanceAfter: z.number().int(),
  relatedId: z.number().int().positive().optional(),
  relatedType: z.string().max(50).optional(),
  description: z.string().optional(),
  performedBy: z.number().int().positive().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const selectWalletTransactionSchema = createSelectSchema(walletTransactions);

export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;

// Payout Requests (yêu cầu rút tiền của gia sư)
export const payoutRequests = mysqlTable("payout_requests", {
  id: serial("id").primaryKey(),
  tutorId: int("tutor_id").notNull(), // FK → tutors.id
  walletId: int("wallet_id").notNull(), // FK → wallets.id
  amount: int("amount").notNull(), // Số tiền yêu cầu rút
  bankName: varchar("bank_name", { length: 100 }).notNull(),
  bankAccount: varchar("bank_account", { length: 50 }).notNull(),
  bankAccountName: varchar("bank_account_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected, completed
  requestNote: text("request_note"), // Ghi chú từ gia sư
  adminNote: text("admin_note"), // Ghi chú từ admin
  reviewedBy: int("reviewed_by"), // Admin user_id
  reviewedAt: timestamp("reviewed_at"),
  completedAt: timestamp("completed_at"),
  rejectedReason: text("rejected_reason"),
  transactionProof: text("transaction_proof"), // URL chứng từ chuyển khoản
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertPayoutRequestSchema = createInsertSchema(payoutRequests, {
  tutorId: z.number().int().positive(),
  walletId: z.number().int().positive(),
  amount: z.number().int().min(50000), // Tối thiểu 50k
  bankName: z.string().min(1).max(100),
  bankAccount: z.string().min(1).max(50),
  bankAccountName: z.string().min(1).max(255),
  status: z.enum(['pending', 'approved', 'rejected', 'completed']).optional(),
  requestNote: z.string().optional(),
}).omit({
  id: true,
  adminNote: true,
  reviewedBy: true,
  reviewedAt: true,
  completedAt: true,
  rejectedReason: true,
  transactionProof: true,
  createdAt: true,
  updatedAt: true,
});

export const selectPayoutRequestSchema = createSelectSchema(payoutRequests);

export type InsertPayoutRequest = z.infer<typeof insertPayoutRequestSchema>;
export type PayoutRequest = typeof payoutRequests.$inferSelect;

// Audit Logs (nhật ký hệ thống - quan trọng cho bảo mật)
export const auditLogs = mysqlTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: int("user_id"), // User thực hiện hành động (null = system)
  action: varchar("action", { length: 50 }).notNull(), // payment_created, escrow_released, payout_approved, etc.
  entityType: varchar("entity_type", { length: 50 }).notNull(), // payment, escrow, wallet, session, etc.
  entityId: int("entity_id").notNull(), // ID của entity bị tác động
  changes: text("changes"), // JSON: chi tiết thay đổi
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs, {
  userId: z.number().int().positive().optional(),
  action: z.string().min(1).max(50),
  entityType: z.string().min(1).max(50),
  entityId: z.number().int().positive(),
  changes: z.string().optional(),
  ipAddress: z.string().max(50).optional(),
  userAgent: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const selectAuditLogSchema = createSelectSchema(auditLogs);

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Favorite Tutors (gia sư yêu thích của học sinh)
export const favoriteTutors = mysqlTable("favorite_tutors", {
  id: serial("id").primaryKey(),
  studentId: int("student_id").notNull(), // FK → users.id
  tutorId: int("tutor_id").notNull(), // FK → tutors.id
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFavoriteTutorSchema = createInsertSchema(favoriteTutors, {
  studentId: z.number().int().positive(),
  tutorId: z.number().int().positive(),
}).omit({
  id: true,
  createdAt: true,
});

export const selectFavoriteTutorSchema = createSelectSchema(favoriteTutors);

export type InsertFavoriteTutor = z.infer<typeof insertFavoriteTutorSchema>;
export type FavoriteTutor = typeof favoriteTutors.$inferSelect;

// Student Credits (tín dụng học viên - tiền hoàn lại khi hủy lớp)
export const studentCredits = mysqlTable("student_credits", {
  id: serial("id").primaryKey(),
  studentId: int("student_id").notNull(), // FK → students.id
  sourceEnrollmentId: int("source_enrollment_id").notNull(), // FK → class_enrollments.id - lớp bị hủy
  amount: int("amount").notNull(), // Số tiền được hoàn lại (VND)
  usedAmount: int("used_amount").notNull().default(0), // Số tiền đã sử dụng
  remainingAmount: int("remaining_amount").notNull(), // Số tiền còn lại = amount - usedAmount
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, used, expired
  expiresAt: timestamp("expires_at"), // Thời hạn sử dụng (VD: 6 tháng từ ngày tạo)
  usedForEnrollmentId: int("used_for_enrollment_id"), // FK → class_enrollments.id - lớp mới sử dụng credit
  reason: text("reason"), // Lý do hoàn tiền (gia sư dạy không tốt, gia sư hủy, v.v.)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertStudentCreditSchema = createInsertSchema(studentCredits, {
  studentId: z.number().int().positive(),
  sourceEnrollmentId: z.number().int().positive(),
  amount: z.number().int().min(0),
  status: z.enum(['active', 'used', 'expired']).optional(),
  reason: z.string().optional(),
}).omit({
  id: true,
  usedAmount: true,
  remainingAmount: true,
  usedForEnrollmentId: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
});

export const selectStudentCreditSchema = createSelectSchema(studentCredits);

export type InsertStudentCredit = z.infer<typeof insertStudentCreditSchema>;
export type StudentCredit = typeof studentCredits.$inferSelect;

// Video Call Sessions (Jitsi Meeting Rooms)
export const videoCallSessions = mysqlTable("video_call_sessions", {
  id: serial("id").primaryKey(),
  enrollmentId: int("enrollment_id"), // FK → class_enrollments.id (null for individual lessons)
  lessonId: int("lesson_id"), // FK → lessons.id (null for enrollment-based sessions)
  sessionRecordId: int("session_record_id"), // FK → session_records.id (null for individual lessons)
  tutorId: int("tutor_id").notNull(), // FK → users.id
  studentId: int("student_id").notNull(), // FK → users.id
  roomName: varchar("room_name", { length: 100 }).notNull().unique(), // Unique Jitsi room name
  accessToken: varchar("access_token", { length: 500 }).notNull().unique(), // Unique access token for this session
  tutorToken: text("tutor_token").notNull(), // JWT token for tutor (moderator) - TEXT to support long JWTs (500+ chars)
  studentToken: text("student_token").notNull(), // JWT token for student (participant) - TEXT to support long JWTs (500+ chars)
  scheduledStartTime: timestamp("scheduled_start_time").notNull(), // When class is scheduled to start
  scheduledEndTime: timestamp("scheduled_end_time").notNull(), // When class is scheduled to end
  tutorJoinedAt: timestamp("tutor_joined_at"), // When tutor actually joined
  studentJoinedAt: timestamp("student_joined_at"), // When student actually joined
  tutorLeftAt: timestamp("tutor_left_at"), // When tutor left
  studentLeftAt: timestamp("student_left_at"), // When student left
  sessionEndedAt: timestamp("session_ended_at"), // When session officially ended
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, active, completed, expired, cancelled
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("unpaid"), // unpaid, paid, partially_paid
  canStudentJoin: int("can_student_join").notNull().default(1), // 1=can join, 0=blocked (payment issue)
  canTutorJoin: int("can_tutor_join").notNull().default(1), // 1=can join, 0=blocked (system issue)
  expiresAt: timestamp("expires_at").notNull(), // Token expiration time (after scheduled end time)
  usedCount: int("used_count").notNull().default(0), // How many times link was accessed (should be ≤2: tutor + student)
  ipAddresses: text("ip_addresses"), // JSON array of IP addresses that accessed this session
  recordingUrl: varchar("recording_url", { length: 500 }), // Optional: recording URL if enabled
  notes: text("notes"), // Admin or system notes
  provider: varchar("provider", { length: 20 }).notNull().default("jitsi"), // videolify, jitsi (for group or fallback)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertVideoCallSessionSchema = createInsertSchema(videoCallSessions, {
  enrollmentId: z.number().int().positive().optional(),
  lessonId: z.number().int().positive().optional(),
  sessionRecordId: z.number().int().positive().optional(),
  tutorId: z.number().int().positive(),
  studentId: z.number().int().positive(),
  roomName: z.string().min(10).max(100),
  accessToken: z.string().min(20).max(500),
  tutorToken: z.string().min(20).max(1000), // Jitsi JWTs can be 500+ characters
  studentToken: z.string().min(20).max(1000), // Jitsi JWTs can be 500+ characters
  scheduledStartTime: z.date().or(z.string()),
  scheduledEndTime: z.date().or(z.string()),
  status: z.enum(['pending', 'active', 'completed', 'expired', 'cancelled']).optional(),
  paymentStatus: z.enum(['unpaid', 'paid', 'partially_paid']).optional(),
  canStudentJoin: z.number().int().min(0).max(1).optional(),
  canTutorJoin: z.number().int().min(0).max(1).optional(),
  expiresAt: z.date().or(z.string()),
  notes: z.string().optional(),
  provider: z.enum(['videolify', 'jitsi']).optional(),
});
