import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTutorAvailabilitySchema, insertLessonSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Tutor Availability Routes
  
  // Get tutor availability
  app.get("/api/tutor-availability/:tutorId", async (req, res) => {
    try {
      const { tutorId } = req.params;
      const availability = await storage.getTutorAvailability(tutorId);
      res.json(availability);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch availability" });
    }
  });

  // Create tutor availability slot
  app.post("/api/tutor-availability", async (req, res) => {
    try {
      const data = insertTutorAvailabilitySchema.parse(req.body);
      
      // Check for conflicts
      const hasConflict = await storage.checkAvailabilityConflict(
        data.tutorId,
        data.dayOfWeek,
        data.startTime,
        data.endTime
      );

      if (hasConflict) {
        return res.status(409).json({ 
          error: "Khung giờ này trùng với ca dạy đã tồn tại" 
        });
      }

      const availability = await storage.createTutorAvailability(data);
      res.status(201).json(availability);
    } catch (error) {
      res.status(400).json({ error: "Invalid data" });
    }
  });

  // Update tutor availability
  app.put("/api/tutor-availability/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      // Get current slot by ID
      const currentSlot = await storage.getTutorAvailabilityById(id);
      
      if (!currentSlot) {
        return res.status(404).json({ error: "Availability slot not found" });
      }

      // Prevent changing tutorId
      if (updates.tutorId && updates.tutorId !== currentSlot.tutorId) {
        return res.status(400).json({ error: "Cannot change tutor ID" });
      }

      // Validate and merge updates with current values
      const merged = {
        tutorId: currentSlot.tutorId, // Always use current tutorId
        dayOfWeek: updates.dayOfWeek !== undefined ? parseInt(updates.dayOfWeek) : currentSlot.dayOfWeek,
        startTime: updates.startTime || currentSlot.startTime,
        endTime: updates.endTime || currentSlot.endTime,
        isActive: updates.isActive !== undefined ? parseInt(updates.isActive) : currentSlot.isActive,
      };

      // Validate types
      if (isNaN(merged.dayOfWeek) || merged.dayOfWeek < 0 || merged.dayOfWeek > 6) {
        return res.status(400).json({ error: "Invalid day of week" });
      }
      if (typeof merged.startTime !== 'string' || !merged.startTime.match(/^\d{2}:\d{2}$/)) {
        return res.status(400).json({ error: "Invalid start time format" });
      }
      if (typeof merged.endTime !== 'string' || !merged.endTime.match(/^\d{2}:\d{2}$/)) {
        return res.status(400).json({ error: "Invalid end time format" });
      }
      if (isNaN(merged.isActive) || (merged.isActive !== 0 && merged.isActive !== 1)) {
        return res.status(400).json({ error: "Invalid isActive value (must be 0 or 1)" });
      }

      // Validate time range
      if (merged.startTime >= merged.endTime) {
        return res.status(400).json({ error: "Giờ kết thúc phải sau giờ bắt đầu" });
      }

      // Check for conflicts with new values
      const hasConflict = await storage.checkAvailabilityConflict(
        merged.tutorId,
        merged.dayOfWeek,
        merged.startTime,
        merged.endTime,
        id // Exclude current slot from conflict check
      );

      if (hasConflict) {
        return res.status(409).json({ 
          error: "Khung giờ này trùng với ca dạy đã tồn tại" 
        });
      }

      // Persist the validated merged data (excluding tutorId which cannot change)
      const sanitizedUpdates: Partial<typeof merged> = {};
      if (updates.dayOfWeek !== undefined) sanitizedUpdates.dayOfWeek = merged.dayOfWeek;
      if (updates.startTime) sanitizedUpdates.startTime = merged.startTime;
      if (updates.endTime) sanitizedUpdates.endTime = merged.endTime;
      if (updates.isActive !== undefined) sanitizedUpdates.isActive = merged.isActive;

      const updated = await storage.updateTutorAvailability(id, sanitizedUpdates);
      if (!updated) {
        return res.status(404).json({ error: "Availability slot not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: "Invalid data" });
    }
  });

  // Delete tutor availability
  app.delete("/api/tutor-availability/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTutorAvailability(id);
      if (!deleted) {
        return res.status(404).json({ error: "Availability slot not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete availability" });
    }
  });

  // Lesson Routes

  // Get lessons by tutor
  app.get("/api/lessons/tutor/:tutorId", async (req, res) => {
    try {
      const { tutorId } = req.params;
      const lessons = await storage.getLessonsByTutor(tutorId);
      res.json(lessons);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lessons" });
    }
  });

  // Get lessons by student
  app.get("/api/lessons/student/:studentId", async (req, res) => {
    try {
      const { studentId } = req.params;
      const lessons = await storage.getLessonsByStudent(studentId);
      res.json(lessons);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lessons" });
    }
  });

  // Create lesson
  app.post("/api/lessons", async (req, res) => {
    try {
      const data = insertLessonSchema.parse(req.body);

      // Check for tutor conflict
      const tutorConflict = await storage.checkLessonConflict(
        data.tutorId,
        data.date,
        data.startTime,
        data.endTime,
        'tutor'
      );

      if (tutorConflict) {
        return res.status(409).json({ 
          error: "Gia sư đã có lớp khác trong khung giờ này" 
        });
      }

      // Check for student conflict
      const studentConflict = await storage.checkLessonConflict(
        data.studentId,
        data.date,
        data.startTime,
        data.endTime,
        'student'
      );

      if (studentConflict) {
        return res.status(409).json({ 
          error: "Học sinh đã có lớp khác trong khung giờ này" 
        });
      }

      const lesson = await storage.createLesson(data);
      res.status(201).json(lesson);
    } catch (error) {
      res.status(400).json({ error: "Invalid data" });
    }
  });

  // Update lesson
  app.put("/api/lessons/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      // Get current lesson
      const current = await storage.getLesson(id);
      if (!current) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      // Prevent changing tutorId or studentId
      if (updates.tutorId && updates.tutorId !== current.tutorId) {
        return res.status(400).json({ error: "Cannot change tutor ID" });
      }
      if (updates.studentId && updates.studentId !== current.studentId) {
        return res.status(400).json({ error: "Cannot change student ID" });
      }

      // Merge and validate updates with current values
      const merged = {
        tutorId: current.tutorId, // Always use current tutorId
        studentId: current.studentId, // Always use current studentId
        date: updates.date || current.date,
        startTime: updates.startTime || current.startTime,
        endTime: updates.endTime || current.endTime,
        subject: updates.subject || current.subject,
        price: updates.price !== undefined ? parseInt(updates.price) : current.price,
        status: updates.status || current.status,
        notes: updates.notes !== undefined ? updates.notes : current.notes,
      };

      // Validate types and formats
      if (typeof merged.date !== 'string' || !merged.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return res.status(400).json({ error: "Invalid date format (YYYY-MM-DD required)" });
      }
      if (typeof merged.startTime !== 'string' || !merged.startTime.match(/^\d{2}:\d{2}$/)) {
        return res.status(400).json({ error: "Invalid start time format" });
      }
      if (typeof merged.endTime !== 'string' || !merged.endTime.match(/^\d{2}:\d{2}$/)) {
        return res.status(400).json({ error: "Invalid end time format" });
      }
      if (isNaN(merged.price) || merged.price < 0) {
        return res.status(400).json({ error: "Invalid price" });
      }

      // Validate time range
      if (merged.startTime >= merged.endTime) {
        return res.status(400).json({ error: "Giờ kết thúc phải sau giờ bắt đầu" });
      }

      // If time/date is being updated, check for conflicts
      if (updates.date || updates.startTime || updates.endTime || updates.tutorId || updates.studentId) {
        // Check for tutor conflict (excluding current lesson)
        const tutorLessons = await storage.getLessonsByTutor(merged.tutorId);
        const tutorConflict = tutorLessons
          .filter(l => l.id !== id && l.date === merged.date && l.status !== 'cancelled')
          .some(l => {
            const [h1Start, m1Start] = merged.startTime.split(':').map(Number);
            const [h1End, m1End] = merged.endTime.split(':').map(Number);
            const [h2Start, m2Start] = l.startTime.split(':').map(Number);
            const [h2End, m2End] = l.endTime.split(':').map(Number);
            
            const mins1Start = h1Start * 60 + m1Start;
            const mins1End = h1End * 60 + m1End;
            const mins2Start = h2Start * 60 + m2Start;
            const mins2End = h2End * 60 + m2End;
            
            return mins1Start < mins2End && mins2Start < mins1End;
          });

        if (tutorConflict) {
          return res.status(409).json({ 
            error: "Gia sư đã có lớp khác trong khung giờ này" 
          });
        }

        // Check for student conflict (excluding current lesson)
        const studentLessons = await storage.getLessonsByStudent(merged.studentId);
        const studentConflict = studentLessons
          .filter(l => l.id !== id && l.date === merged.date && l.status !== 'cancelled')
          .some(l => {
            const [h1Start, m1Start] = merged.startTime.split(':').map(Number);
            const [h1End, m1End] = merged.endTime.split(':').map(Number);
            const [h2Start, m2Start] = l.startTime.split(':').map(Number);
            const [h2End, m2End] = l.endTime.split(':').map(Number);
            
            const mins1Start = h1Start * 60 + m1Start;
            const mins1End = h1End * 60 + m1End;
            const mins2Start = h2Start * 60 + m2Start;
            const mins2End = h2End * 60 + m2End;
            
            return mins1Start < mins2End && mins2Start < mins1End;
          });

        if (studentConflict) {
          return res.status(409).json({ 
            error: "Học sinh đã có lớp khác trong khung giờ này" 
          });
        }
      }

      // Persist the validated merged data (excluding immutable IDs)
      const sanitizedUpdates: Partial<typeof merged> = {};
      if (updates.date) sanitizedUpdates.date = merged.date;
      if (updates.startTime) sanitizedUpdates.startTime = merged.startTime;
      if (updates.endTime) sanitizedUpdates.endTime = merged.endTime;
      if (updates.subject) sanitizedUpdates.subject = merged.subject;
      if (updates.price !== undefined) sanitizedUpdates.price = merged.price;
      if (updates.status) sanitizedUpdates.status = merged.status;
      if (updates.notes !== undefined) sanitizedUpdates.notes = updates.notes;

      const updated = await storage.updateLesson(id, sanitizedUpdates);
      if (!updated) {
        return res.status(404).json({ error: "Lesson not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: "Invalid data" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
