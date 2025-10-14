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

      // If time or day is being updated, check for conflicts
      if (updates.dayOfWeek !== undefined || updates.startTime || updates.endTime) {
        const existing = await storage.getTutorAvailability(updates.tutorId);
        const current = existing.find(a => a.id === id);
        
        if (current) {
          const hasConflict = await storage.checkAvailabilityConflict(
            updates.tutorId || current.tutorId,
            updates.dayOfWeek ?? current.dayOfWeek,
            updates.startTime || current.startTime,
            updates.endTime || current.endTime,
            id // Exclude current slot from conflict check
          );

          if (hasConflict) {
            return res.status(409).json({ 
              error: "Khung giờ này trùng với ca dạy đã tồn tại" 
            });
          }
        }
      }

      const updated = await storage.updateTutorAvailability(id, updates);
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

      const updated = await storage.updateLesson(id, updates);
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
