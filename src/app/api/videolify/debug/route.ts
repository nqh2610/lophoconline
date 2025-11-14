/**
 * Debug endpoint for Videolify - inspect & clear server state
 * GET  /api/videolify/debug?roomId=xxx - inspect rooms
 * POST /api/videolify/debug - clear all rooms (for testing)
 */

import { NextRequest, NextResponse } from 'next/server';
import { clearAllRooms } from '../signal/route';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');

  // Since we can't import the private rooms Map, return a helpful message
  // In production, we'd expose this via a shared module
  
  return NextResponse.json({
    message: 'Debug endpoint - server state inspection',
    timestamp: new Date().toISOString(),
    roomId: roomId || 'all',
    note: 'Server state is in-memory in signal route. Check server console logs for detailed traces.',
    instructions: [
      '1. Check server terminal for [Videolify Signal] logs',
      '2. Look for offer/answer/ice timestamps',
      '3. Monitor SSE connections in [SSE] logs',
      '4. Use browser DevTools Network tab for SSE stream inspection',
      '5. POST to this endpoint to clear all rooms for testing',
    ],
  });
}

export async function POST(request: NextRequest) {
  try {
    // Clear all rooms from memory
    clearAllRooms();
    
    return NextResponse.json({
      success: true,
      message: 'All rooms cleared',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Videolify Debug] Error clearing rooms:', error);
    return NextResponse.json(
      { error: 'Failed to clear rooms' },
      { status: 500 }
    );
  }
}
