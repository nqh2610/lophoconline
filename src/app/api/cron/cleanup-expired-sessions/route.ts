import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { videoCallSessions } from '@/lib/schema';
import { and, lt, or, eq } from 'drizzle-orm';

/**
 * GET /api/cron/cleanup-expired-sessions
 * Cron job to cleanup expired video call sessions
 *
 * Actions:
 * 1. Mark sessions as expired if expiresAt < now
 * 2. Mark sessions as completed if both participants have left
 * 3. Delete old sessions (optional - keep for audit trail)
 *
 * Example cron config in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-expired-sessions",
 *     "schedule": "0 * /6 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret-key';

    if (authHeader !== `Bearer ${cronSecret}`) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Unauthorized - Invalid cron secret' },
          { status: 401 }
        );
      }
    }

    console.log('[CRON] Starting expired sessions cleanup...');
    const startTime = Date.now();
    const now = new Date();

    let expiredCount = 0;
    let completedCount = 0;
    let errors = 0;

    // 2. Find and mark expired sessions
    try {
      const expiredSessions = await db
        .select()
        .from(videoCallSessions)
        .where(
          and(
            lt(videoCallSessions.expiresAt, now),
            or(
              eq(videoCallSessions.status, 'pending'),
              eq(videoCallSessions.status, 'active')
            )
          )
        )
        .limit(500);

      for (const session of expiredSessions) {
        try {
          await db
            .update(videoCallSessions)
            .set({
              status: 'expired',
              updatedAt: now,
            })
            .where(eq(videoCallSessions.id, session.id));

          expiredCount++;
        } catch (err) {
          console.error(`Error marking session ${session.id} as expired:`, err);
          errors++;
        }
      }

      console.log(`[CRON] Marked ${expiredCount} sessions as expired`);

    } catch (err) {
      console.error('[CRON] Error finding expired sessions:', err);
      errors++;
    }

    // 3. Find sessions where both participants have left and mark as completed
    try {
      const activeSessions = await db
        .select()
        .from(videoCallSessions)
        .where(eq(videoCallSessions.status, 'active'))
        .limit(500);

      for (const session of activeSessions) {
        // Check if both participants have left
        if (session.tutorLeftAt && session.studentLeftAt && !session.sessionEndedAt) {
          try {
            const endTime = new Date(
              Math.min(
                session.tutorLeftAt.getTime(),
                session.studentLeftAt.getTime()
              )
            );

            await db
              .update(videoCallSessions)
              .set({
                status: 'completed',
                sessionEndedAt: endTime,
                updatedAt: now,
              })
              .where(eq(videoCallSessions.id, session.id));

            completedCount++;
          } catch (err) {
            console.error(`Error marking session ${session.id} as completed:`, err);
            errors++;
          }
        }
      }

      console.log(`[CRON] Marked ${completedCount} sessions as completed`);

    } catch (err) {
      console.error('[CRON] Error finding active sessions:', err);
      errors++;
    }

    // 4. Optional: Archive very old sessions (30+ days old)
    // Uncomment if you want to clean up database
    /*
    try {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const oldSessions = await db
        .select()
        .from(videoCallSessions)
        .where(
          and(
            lt(videoCallSessions.createdAt, thirtyDaysAgo),
            eq(videoCallSessions.status, 'expired')
          )
        )
        .limit(100);

      for (const session of oldSessions) {
        // You could move to archive table or delete
        // await db.delete(videoCallSessions).where(eq(videoCallSessions.id, session.id));
      }
    } catch (err) {
      console.error('[CRON] Error archiving old sessions:', err);
      errors++;
    }
    */

    const duration = Date.now() - startTime;
    console.log('[CRON] Cleanup completed in', duration, 'ms');

    // 5. Return results
    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      duration: `${duration}ms`,
      results: {
        expiredSessions: expiredCount,
        completedSessions: completedCount,
        errors,
        totalProcessed: expiredCount + completedCount,
      },
      message: `Cleaned up ${expiredCount + completedCount} sessions`,
    });

  } catch (error) {
    console.error('[CRON] Error in cleanup-expired-sessions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Allow POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
