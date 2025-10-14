import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Tutor availability slots (recurring time slots)
export const tutorAvailability = pgTable("tutor_availability", {
  id: serial("id").primaryKey(),
  tutorId: varchar("tutor_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: text("start_time").notNull(), // Format: "HH:MM" e.g., "18:00"
  endTime: text("end_time").notNull(), // Format: "HH:MM" e.g., "19:30"
  isActive: integer("is_active").notNull().default(1), // 1=active, 0=inactive
});

export const insertTutorAvailabilitySchema = createInsertSchema(tutorAvailability).omit({
  id: true,
});

export type InsertTutorAvailability = z.infer<typeof insertTutorAvailabilitySchema>;
export type TutorAvailability = typeof tutorAvailability.$inferSelect;

// Lessons/Bookings
export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  tutorId: varchar("tutor_id").notNull(),
  studentId: varchar("student_id").notNull(),
  subject: text("subject").notNull(),
  date: text("date").notNull(), // Format: "YYYY-MM-DD"
  startTime: text("start_time").notNull(), // Format: "HH:MM"
  endTime: text("end_time").notNull(), // Format: "HH:MM"
  status: text("status").notNull().default("pending"), // pending, confirmed, completed, cancelled
  price: integer("price").notNull(), // Price in VND
  notes: text("notes"),
});

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
});

export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessons.$inferSelect;
