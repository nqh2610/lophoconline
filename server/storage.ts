import { 
  type User, 
  type InsertUser,
  type TutorAvailability,
  type InsertTutorAvailability,
  type Lesson,
  type InsertLesson
} from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Tutor availability methods
  createTutorAvailability(availability: InsertTutorAvailability): Promise<TutorAvailability>;
  getTutorAvailability(tutorId: string): Promise<TutorAvailability[]>;
  getTutorAvailabilityById(id: number): Promise<TutorAvailability | undefined>;
  updateTutorAvailability(id: number, updates: Partial<InsertTutorAvailability>): Promise<TutorAvailability | undefined>;
  deleteTutorAvailability(id: number): Promise<boolean>;
  checkAvailabilityConflict(tutorId: string, dayOfWeek: number, startTime: string, endTime: string, excludeId?: number): Promise<boolean>;

  // Lesson methods
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  getLessonsByTutor(tutorId: string): Promise<Lesson[]>;
  getLessonsByStudent(studentId: string): Promise<Lesson[]>;
  getLesson(id: number): Promise<Lesson | undefined>;
  updateLesson(id: number, updates: Partial<InsertLesson>): Promise<Lesson | undefined>;
  checkLessonConflict(userId: string, date: string, startTime: string, endTime: string, userType: 'tutor' | 'student'): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private tutorAvailability: Map<number, TutorAvailability>;
  private lessons: Map<number, Lesson>;
  private availabilityIdCounter: number;
  private lessonIdCounter: number;

  constructor() {
    this.users = new Map();
    this.tutorAvailability = new Map();
    this.lessons = new Map();
    this.availabilityIdCounter = 1;
    this.lessonIdCounter = 1;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Helper function to check if two time ranges overlap
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

  // Tutor availability methods
  async createTutorAvailability(availability: InsertTutorAvailability): Promise<TutorAvailability> {
    const id = this.availabilityIdCounter++;
    const newAvailability: TutorAvailability = { 
      ...availability, 
      id,
      isActive: availability.isActive ?? 1
    };
    this.tutorAvailability.set(id, newAvailability);
    return newAvailability;
  }

  async getTutorAvailability(tutorId: string): Promise<TutorAvailability[]> {
    return Array.from(this.tutorAvailability.values())
      .filter(a => a.tutorId === tutorId);
  }

  async getTutorAvailabilityById(id: number): Promise<TutorAvailability | undefined> {
    return this.tutorAvailability.get(id);
  }

  async updateTutorAvailability(id: number, updates: Partial<InsertTutorAvailability>): Promise<TutorAvailability | undefined> {
    const existing = this.tutorAvailability.get(id);
    if (!existing) return undefined;
    
    const updated: TutorAvailability = { ...existing, ...updates };
    this.tutorAvailability.set(id, updated);
    return updated;
  }

  async deleteTutorAvailability(id: number): Promise<boolean> {
    return this.tutorAvailability.delete(id);
  }

  async checkAvailabilityConflict(
    tutorId: string, 
    dayOfWeek: number, 
    startTime: string, 
    endTime: string, 
    excludeId?: number
  ): Promise<boolean> {
    const existing = Array.from(this.tutorAvailability.values())
      .filter(a => 
        a.tutorId === tutorId && 
        a.dayOfWeek === dayOfWeek && 
        a.isActive === 1 &&
        a.id !== excludeId
      );

    for (const slot of existing) {
      if (this.timeRangesOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
        return true; // Conflict found
      }
    }
    return false; // No conflict
  }

  // Lesson methods
  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    const id = this.lessonIdCounter++;
    const newLesson: Lesson = { 
      ...lesson, 
      id,
      status: lesson.status ?? 'pending',
      notes: lesson.notes ?? null
    };
    this.lessons.set(id, newLesson);
    return newLesson;
  }

  async getLessonsByTutor(tutorId: string): Promise<Lesson[]> {
    return Array.from(this.lessons.values())
      .filter(l => l.tutorId === tutorId)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });
  }

  async getLessonsByStudent(studentId: string): Promise<Lesson[]> {
    return Array.from(this.lessons.values())
      .filter(l => l.studentId === studentId)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });
  }

  async getLesson(id: number): Promise<Lesson | undefined> {
    return this.lessons.get(id);
  }

  async updateLesson(id: number, updates: Partial<InsertLesson>): Promise<Lesson | undefined> {
    const existing = this.lessons.get(id);
    if (!existing) return undefined;
    
    const updated: Lesson = { ...existing, ...updates };
    this.lessons.set(id, updated);
    return updated;
  }

  async checkLessonConflict(
    userId: string, 
    date: string, 
    startTime: string, 
    endTime: string, 
    userType: 'tutor' | 'student'
  ): Promise<boolean> {
    const userLessons = Array.from(this.lessons.values())
      .filter(l => {
        if (userType === 'tutor') {
          return l.tutorId === userId && l.date === date && l.status !== 'cancelled';
        } else {
          return l.studentId === userId && l.date === date && l.status !== 'cancelled';
        }
      });

    for (const lesson of userLessons) {
      if (this.timeRangesOverlap(startTime, endTime, lesson.startTime, lesson.endTime)) {
        return true; // Conflict found
      }
    }
    return false; // No conflict
  }
}

export const storage = new MemStorage();
