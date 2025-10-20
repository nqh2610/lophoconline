import { NextRequest, NextResponse } from 'next/server';
import { batchCreateVideoCallSessions } from '@/lib/video-call-helper';

/**
 * GET /api/cron/create-video-calls
 * Cron job to automatically create video call sessions for upcoming lessons/sessions
 *
 * Security: This should be protected by a cron secret in production
 * Add to vercel.json or use Vercel Cron Jobs
 *
 * Example cron config in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/create-video-calls",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify cron secret (optional but recommended for security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret-key';

    if (authHeader !== `Bearer ${cronSecret}`) {
      // In development, allow without auth
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Unauthorized - Invalid cron secret' },
          { status: 401 }
        );
      }
    }

    // 2. Run batch creation
    console.log('[CRON] Starting batch video call creation...');
    const startTime = Date.now();

    const result = await batchCreateVideoCallSessions();

    const duration = Date.now() - startTime;
    console.log('[CRON] Batch creation completed in', duration, 'ms');
    console.log('[CRON] Results:', result);

    // 3. Return results
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      results: {
        lessonsProcessed: result.lessonsCreated,
        sessionRecordsProcessed: result.sessionsCreated,
        errors: result.errors,
        totalCreated: result.lessonsCreated + result.sessionsCreated,
      },
      message: `Created ${result.lessonsCreated + result.sessionsCreated} video call sessions`,
    });

  } catch (error) {
    console.error('[CRON] Error in create-video-calls:', error);
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
