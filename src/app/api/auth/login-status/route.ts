import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ attemptsRemaining: 10, delay: 0 });
    }

    const failedAttempts = await storage.getRecentFailedAttempts(username, 15);
    const requiredDelay = await storage.getRequiredDelay(username);
    const attemptsRemaining = Math.max(0, 10 - failedAttempts);

    return NextResponse.json({
      failedAttempts,
      attemptsRemaining,
      delay: requiredDelay,
      delaySeconds: Math.ceil(requiredDelay / 1000),
      isLocked: failedAttempts >= 10,
    });
  } catch (error) {
    console.error('Error checking login status:', error);
    return NextResponse.json(
      { error: 'Failed to check login status' },
      { status: 500 }
    );
  }
}
