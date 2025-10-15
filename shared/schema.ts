import { sql } from "drizzle-orm";
import { mysqlTable, text, varchar, int, serial } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Tutor availability slots (recurring time slots)
export const tutorAvailability = mysqlTable("tutor_availability", {
  id: serial("id").primaryKey(),
  tutorId: varchar("tutor_id", { length: 100 }).notNull(),
  dayOfWeek: int("day_of_week").notNull(), // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: varchar("start_time", { length: 10 }).notNull(), // Format: "HH:MM" e.g., "18:00"
  endTime: varchar("end_time", { length: 10 }).notNull(), // Format: "HH:MM" e.g., "19:30"
  isActive: int("is_active").notNull().default(1), // 1=active, 0=inactive
});

export const insertTutorAvailabilitySchema = createInsertSchema(tutorAvailability).omit({
  id: true,
});

export type InsertTutorAvailability = z.infer<typeof insertTutorAvailabilitySchema>;
export type TutorAvailability = typeof tutorAvailability.$inferSelect;

// Lessons/Bookings
export const lessons = mysqlTable("lessons", {
  id: serial("id").primaryKey(),
  tutorId: varchar("tutor_id", { length: 100 }).notNull(),
  studentId: varchar("student_id", { length: 100 }).notNull(),
  subject: varchar("subject", { length: 100 }).notNull(),
  date: varchar("date", { length: 15 }).notNull(), // Format: "YYYY-MM-DD"
  startTime: varchar("start_time", { length: 10 }).notNull(), // Format: "HH:MM"
  endTime: varchar("end_time", { length: 10 }).notNull(), // Format: "HH:MM"
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, confirmed, completed, cancelled
  price: int("price").notNull(), // Price in VND
  notes: text("notes"),
});

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
});

export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessons.$inferSelect;
