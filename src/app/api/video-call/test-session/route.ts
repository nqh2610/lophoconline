import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { videoCallSessions } from '@/lib/schema';
import { eq, like, sql } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * POST /api/video-call/test-session
 * Create a test video call session for automated testing
 * 
 * ONLY FOR DEVELOPMENT/TESTING - DO NOT USE IN PRODUCTION
 */
export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test endpoint not available in production' },
      { status: 403 }
    );
  }

  try {
    // Create a test session with long expiry
    const now = new Date();
    const scheduledStart = new Date(now.getTime() - 30 * 60 * 1000); // 30 mins ago
    const scheduledEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    const expiresAt = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now
    
    const accessToken = crypto.randomBytes(32).toString('hex');
    const roomName = `test-room-${Date.now()}`;

    const [testSession] = await db
      .insert(videoCallSessions)
      .values({
        enrollmentId: null, // Test session - no enrollment
        lessonId: null, // Test session - no lesson
        sessionRecordId: null, // Test session - no session record
        tutorId: 1,
        studentId: 2,
        scheduledStartTime: scheduledStart,
        scheduledEndTime: scheduledEnd,
        roomName,
        accessToken,
        tutorToken: crypto.randomBytes(16).toString('hex'),
        studentToken: crypto.randomBytes(16).toString('hex'),
        provider: 'videolify', // Use videolify for testing
        canTutorJoin: 1,
        canStudentJoin: 1,
        paymentStatus: 'completed',
        status: 'pending',
        expiresAt,
        ipAddresses: '[]',
        usedCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json({
      success: true,
      accessToken: testSession.accessToken,
      roomName: testSession.roomName,
      expiresAt: testSession.expiresAt,
      scheduledStartTime: testSession.scheduledStartTime,
      scheduledEndTime: testSession.scheduledEndTime,
    });

  } catch (error) {
    console.error('Error creating test session:', error);
    return NextResponse.json(
      { error: 'Failed to create test session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/video-call/test-session
 * Clean up all test sessions
 */
export async function DELETE() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test endpoint not available in production' },
      { status: 403 }
    );
  }

  try {
    // Delete test sessions with roomName starting with 'test-room-'
    await db
      .delete(videoCallSessions)
      .where(like(videoCallSessions.roomName, 'test-room-%'));

    return NextResponse.json({
      success: true,
      message: 'Test sessions cleaned up',
    });

  } catch (error) {
    console.error('Error cleaning up test sessions:', error);
    return NextResponse.json(
      { error: 'Failed to clean up test sessions' },
      { status: 500 }
    );
  }
}
