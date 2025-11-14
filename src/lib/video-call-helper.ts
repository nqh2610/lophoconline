import { db } from '@/lib/db';
import { videoCallSessions, trialBookings, classEnrollments, sessionRecords, users, tutors, students, lessons } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import {
  generateRoomName,
  generateAccessToken,
  generateJitsiToken,
  getSessionExpiry,
} from '@/lib/jitsi';

/**
 * Auto-create video call session for a confirmed lesson
 * This should be called when a lesson status changes to 'confirmed'
 */
export async function autoCreateVideoCallForLesson(lessonId: number): Promise<number | null> {
  try {
    // 1. Check if video call session already exists
    const existing = await db
      .select()
      .from(videoCallSessions)
      .where(eq(videoCallSessions.lessonId, lessonId))
      .limit(1);

    if (existing.length > 0) {
      console.log(`Video call session already exists for lesson ${lessonId}`);
      return existing[0].id;
    }

    // 2. Get trial lesson details
    const lesson = await db
      .select()
      .from(trialBookings)
      .where(eq(trialBookings.id, lessonId))
      .limit(1);

    if (lesson.length === 0) {
      console.error(`Trial lesson ${lessonId} not found`);
      return null;
    }

    const lessonData = lesson[0];

    // 3. Only create for confirmed lessons
    if (lessonData.status !== 'confirmed') {
      console.log(`Lesson ${lessonId} is not confirmed yet (status: ${lessonData.status})`);
      return null;
    }

    // 4. Get tutor and student user IDs (trial_bookings stores profile IDs, not user IDs)
    const [tutorProfile, studentProfile] = await Promise.all([
      db.select().from(tutors).where(eq(tutors.id, lessonData.tutorId)).limit(1),
      db.select().from(students).where(eq(students.id, lessonData.studentId)).limit(1),
    ]);

    if (tutorProfile.length === 0 || studentProfile.length === 0) {
      console.error(`Tutor or student profile not found for lesson ${lessonId}`);
      return null;
    }

    const tutorId = tutorProfile[0].userId;
    const studentId = studentProfile[0].userId;

    const [tutorUser, studentUser] = await Promise.all([
      db.select().from(users).where(eq(users.id, tutorId)).limit(1),
      db.select().from(users).where(eq(users.id, studentId)).limit(1),
    ]);

    if (tutorUser.length === 0 || studentUser.length === 0) {
      console.error(`User not found for lesson ${lessonId}`);
      return null;
    }

    // 5. Parse schedule
    const dateStr = lessonData.date;
    const startTimeStr = lessonData.startTime;
    const endTimeStr = lessonData.endTime;

    const scheduledStartTime = new Date(`${dateStr}T${startTimeStr}:00`);
    const scheduledEndTime = new Date(`${dateStr}T${endTimeStr}:00`);
    const expiresAt = getSessionExpiry(scheduledEndTime);

    // 6. Choose provider - Videolify for 1-on-1 via REST API signaling
    // Trial bookings are always 1-on-1 (tutor + student = 2 people)
    const provider: 'videolify' | 'jitsi' = 'videolify'; // Use Videolify with REST API signaling

    // 7. Generate tokens
    const roomName = generateRoomName('lophoc');
    const accessToken = generateAccessToken();

    // Generate simple tokens for Videolify (REST API based, no pre-generated JWT needed)
    let tutorToken = '';
    let studentToken = '';
    
    tutorToken = `videolify-tutor-${tutorId}`;
    studentToken = `videolify-student-${studentId}`;
    
    // Note: Jitsi tokens not needed for Videolify

    // 8. Determine payment status - all trial bookings are free
    const paymentStatus = 'paid'; // Trial lessons are always marked as paid (free)
    const canStudentJoin = 1; // Allow join for confirmed lessons

    // 9. Create video call session
    const result = await db.insert(videoCallSessions).values({
      lessonId,
      tutorId,
      studentId,
      roomName,
      accessToken,
      tutorToken,
      studentToken,
      scheduledStartTime,
      scheduledEndTime,
      status: 'pending',
      paymentStatus,
      canStudentJoin,
      canTutorJoin: 1,
      expiresAt,
      provider, // Add provider field
    });

    // Get the created session ID
    const createdSession = await db
      .select({ id: videoCallSessions.id })
      .from(videoCallSessions)
      .where(eq(videoCallSessions.accessToken, accessToken))
      .limit(1);

    const sessionId = createdSession[0]?.id || 0;
    console.log(`Created video call session ${sessionId} for lesson ${lessonId}`);
    return sessionId;

  } catch (error) {
    console.error('Error auto-creating video call for lesson:', error);
    return null;
  }
}

/**
 * Auto-create video call session for an enrollment session record
 */
export async function autoCreateVideoCallForSessionRecord(
  enrollmentId: number,
  sessionRecordId: number
): Promise<number | null> {
  try {
    // 1. Check if video call session already exists
    const existing = await db
      .select()
      .from(videoCallSessions)
      .where(eq(videoCallSessions.sessionRecordId, sessionRecordId))
      .limit(1);

    if (existing.length > 0) {
      console.log(`Video call session already exists for session record ${sessionRecordId}`);
      return existing[0].id;
    }

    // 2. Get session record details
    const record = await db
      .select()
      .from(sessionRecords)
      .where(eq(sessionRecords.id, sessionRecordId))
      .limit(1);

    if (record.length === 0) {
      console.error(`Session record ${sessionRecordId} not found`);
      return null;
    }

    const recordData = record[0];

    // 3. Get enrollment details
    const enrollment = await db
      .select()
      .from(classEnrollments)
      .where(eq(classEnrollments.id, enrollmentId))
      .limit(1);

    if (enrollment.length === 0) {
      console.error(`Enrollment ${enrollmentId} not found`);
      return null;
    }

    const enrollmentData = enrollment[0];

    // 4. Get tutor and student info
    const tutorId = enrollmentData.tutorId;
    const studentId = enrollmentData.studentId;

    const [tutorUser, studentUser] = await Promise.all([
      db.select().from(users).where(eq(users.id, tutorId)).limit(1),
      db.select().from(users).where(eq(users.id, studentId)).limit(1),
    ]);

    if (tutorUser.length === 0 || studentUser.length === 0) {
      console.error(`User not found for enrollment ${enrollmentId}`);
      return null;
    }

    // 5. Parse schedule from session record
    const dateStr = recordData.date;
    const startTimeStr = recordData.startTime;
    const endTimeStr = recordData.endTime;

    const scheduledStartTime = new Date(`${dateStr}T${startTimeStr}:00`);
    const scheduledEndTime = new Date(`${dateStr}T${endTimeStr}:00`);
    const expiresAt = getSessionExpiry(scheduledEndTime);

    // 6. Choose provider - Videolify for 1-on-1 via REST API signaling
    // Enrollment sessions are usually 1-on-1, use Videolify
    const provider: 'videolify' | 'jitsi' = 'videolify';

    // 7. Generate tokens
    const roomName = generateRoomName('lophoc');
    const accessToken = generateAccessToken();

    // Generate simple tokens for Videolify (REST API based)
    let tutorToken = `videolify-tutor-${tutorId}`;
    let studentToken = `videolify-student-${studentId}`;

    // 8. Check payment status (assume paid if enrollment is active)
    const paymentStatus = enrollmentData.status === 'active' ? 'paid' : 'unpaid';
    const canStudentJoin = paymentStatus === 'paid' ? 1 : 0;

    // 9. Create video call session
    const result = await db.insert(videoCallSessions).values({
      enrollmentId,
      sessionRecordId,
      tutorId,
      studentId,
      roomName,
      accessToken,
      tutorToken,
      studentToken,
      scheduledStartTime,
      scheduledEndTime,
      status: 'pending',
      paymentStatus,
      canStudentJoin,
      canTutorJoin: 1,
      expiresAt,
      provider, // Add provider field
    });

    // Get the created session ID
    const createdSession = await db
      .select({ id: videoCallSessions.id })
      .from(videoCallSessions)
      .where(eq(videoCallSessions.accessToken, accessToken))
      .limit(1);

    const sessionId = createdSession[0]?.id || 0;
    console.log(`Created video call session ${sessionId} for session record ${sessionRecordId}`);
    return sessionId;

  } catch (error) {
    console.error('Error auto-creating video call for session record:', error);
    return null;
  }
}

/**
 * Batch create video call sessions for all upcoming lessons/sessions
 * This can be run as a cron job to ensure all future sessions have video calls
 */
export async function batchCreateVideoCallSessions(): Promise<{
  lessonsCreated: number;
  sessionsCreated: number;
  errors: number;
}> {
  let lessonsCreated = 0;
  let sessionsCreated = 0;
  let errors = 0;

  try {
    // 1. Find all confirmed lessons without video call sessions
    const upcomingLessons = await db
      .select()
      .from(lessons)
      .where(eq(lessons.status, 'confirmed'))
      .limit(100);

    for (const lesson of upcomingLessons) {
      try {
        const sessionId = await autoCreateVideoCallForLesson(lesson.id);
        if (sessionId) {
          lessonsCreated++;
        }
      } catch (err) {
        console.error(`Error creating video call for lesson ${lesson.id}:`, err);
        errors++;
      }
    }

    // 2. Find all scheduled session records without video call sessions
    const upcomingRecords = await db
      .select()
      .from(sessionRecords)
      .where(eq(sessionRecords.status, 'scheduled'))
      .limit(100);

    for (const record of upcomingRecords) {
      try {
        const sessionId = await autoCreateVideoCallForSessionRecord(
          record.enrollmentId,
          record.id
        );
        if (sessionId) {
          sessionsCreated++;
        }
      } catch (err) {
        console.error(`Error creating video call for session record ${record.id}:`, err);
        errors++;
      }
    }

  } catch (error) {
    console.error('Error in batch create video call sessions:', error);
    errors++;
  }

  return { lessonsCreated, sessionsCreated, errors };
}
