import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { trialBookings, users, students } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Calculate next available date based on recurring days
 * Returns the nearest future date that matches one of the recurring days
 */
function calculateNextAvailableDate(
  recurringDays: number[],
  startTime: string,
  endTime: string
): { date: string; startTime: string; endTime: string } {
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Find the next occurrence
  let daysToAdd = 0;
  let found = false;

  // Check next 14 days for a matching day
  for (let i = 1; i <= 14; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);
    const dayOfWeek = checkDate.getDay();

    if (recurringDays.includes(dayOfWeek)) {
      daysToAdd = i;
      found = true;
      break;
    }
  }

  // Default to tomorrow if no recurring day found
  if (!found) {
    daysToAdd = 1;
  }

  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + daysToAdd);

  const dateStr = nextDate.toISOString().split('T')[0]; // YYYY-MM-DD

  return {
    date: dateStr,
    startTime,
    endTime,
  };
}

/**
 * GET /api/lessons/trial
 * Get trial bookings for current user (tutor or student)
 *
 * Query params:
 * - status: 'pending' | 'confirmed' | 'completed' | 'cancelled' (optional)
 * - role: 'tutor' | 'student' (optional, auto-detected from session)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const userRoles = JSON.parse(session.user.role || '[]');

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const role = searchParams.get('role') || (userRoles.includes('tutor') ? 'tutor' : 'student');

    let trialLessons: any[] = [];

    if (role === 'tutor') {
      // Get tutor profile
      const tutor = await storage.getTutorByUserId(userId);

      if (!tutor) {
        return NextResponse.json(
          { error: 'Tutor profile not found' },
          { status: 404 }
        );
      }

      // Get trial bookings for this tutor
      const query = db
        .select({
          id: trialBookings.id,
          tutorId: trialBookings.tutorId,
          studentId: trialBookings.studentId,
          availabilityId: trialBookings.availabilityId,
          subject: trialBookings.subject,
          date: trialBookings.date,
          startTime: trialBookings.startTime,
          endTime: trialBookings.endTime,
          status: trialBookings.status,
          notes: trialBookings.notes,
          tutorConfirmed: trialBookings.tutorConfirmed,
          studentConfirmed: trialBookings.studentConfirmed,
          meetingLink: trialBookings.meetingLink,
          createdAt: trialBookings.createdAt,
          updatedAt: trialBookings.updatedAt,
          completedAt: trialBookings.completedAt,
          // Join with students to get student info
          studentUserId: students.userId,
        })
        .from(trialBookings)
        .leftJoin(students, eq(trialBookings.studentId, students.id))
        .where(eq(trialBookings.tutorId, tutor.id))
        .orderBy(desc(trialBookings.createdAt));

      // Apply status filter if provided
      if (status) {
        trialLessons = await query.where(
          and(
            eq(trialBookings.tutorId, tutor.id),
            eq(trialBookings.status, status)
          )
        );
      } else {
        trialLessons = await query;
      }

      // Enrich with student user info and availability
      for (const lesson of trialLessons) {
        if (lesson.studentUserId) {
          const studentUser = await storage.getUserById(lesson.studentUserId);
          lesson.studentName = studentUser?.fullName || studentUser?.username || 'Học sinh';
          lesson.studentEmail = studentUser?.email;
          
          // Get student grade level
          const student = await storage.getStudentById(lesson.studentId);
          if (student?.gradeLevelId) {
            const gradeLevel = await storage.getGradeLevelById(student.gradeLevelId);
            lesson.gradeLevel = gradeLevel?.name || `Lớp ${student.gradeLevelId}`;
            lesson.gradeLevelId = student.gradeLevelId;
          }
        }

        // Get availability info and suggest next available date
        if (lesson.availabilityId && lesson.status === 'pending') {
          const availability = await storage.getTutorAvailabilityById(lesson.availabilityId);
          if (availability) {
            lesson.availability = {
              id: availability.id,
              recurringDays: JSON.parse(availability.recurringDays || '[]'),
              shiftType: availability.shiftType,
              startTime: availability.startTime,
              endTime: availability.endTime,
            };

            // Calculate next available date
            const nextDate = calculateNextAvailableDate(
              lesson.availability.recurringDays,
              lesson.availability.startTime,
              lesson.availability.endTime
            );
            lesson.suggestedDate = nextDate.date;
            lesson.suggestedStartTime = nextDate.startTime;
            lesson.suggestedEndTime = nextDate.endTime;
          }
        }
      }

    } else if (role === 'student') {
      // Get student profile
      const student = await storage.getStudentByUserId(userId);

      if (!student) {
        return NextResponse.json(
          { error: 'Student profile not found' },
          { status: 404 }
        );
      }

      // Get trial bookings for this student
      const query = db
        .select()
        .from(trialBookings)
        .where(eq(trialBookings.studentId, student.id))
        .orderBy(desc(trialBookings.createdAt));

      // Apply status filter if provided
      if (status) {
        trialLessons = await query.where(
          and(
            eq(trialBookings.studentId, student.id),
            eq(trialBookings.status, status)
          )
        );
      } else {
        trialLessons = await query;
      }

      // Enrich with tutor info
      for (const lesson of trialLessons) {
        const tutor = await storage.getTutorById(lesson.tutorId);
        if (tutor) {
          const tutorUser = await storage.getUserById(tutor.userId);
          lesson.tutorName = tutorUser?.fullName || tutorUser?.username || 'Giáo viên';
          lesson.tutorEmail = tutorUser?.email;
          lesson.tutorAvatar = tutorUser?.avatar;
          lesson.tutorRating = tutor.rating;
          lesson.tutorHourlyRate = tutor.hourlyRate;
        }

        // Get video session info if exists
        const videoSession = await storage.getVideoCallSessionByLessonId(lesson.id);
        if (videoSession) {
          lesson.videoSession = {
            id: videoSession.id,
            roomName: videoSession.roomName,
            scheduledStartTime: videoSession.scheduledStartTime,
            scheduledEndTime: videoSession.scheduledEndTime,
            status: videoSession.status,
            tutorJoinedAt: videoSession.tutorJoinedAt,
            studentJoinedAt: videoSession.studentJoinedAt,
            sessionEndedAt: videoSession.sessionEndedAt,
          };
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid role. Must be "tutor" or "student"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      role,
      status: status || 'all',
      count: trialLessons.length,
      lessons: trialLessons,
    });

  } catch (error) {
    console.error('Error fetching trial lessons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trial lessons' },
      { status: 500 }
    );
  }
}
