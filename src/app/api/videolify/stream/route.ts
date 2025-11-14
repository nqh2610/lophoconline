/**
 * Server-Sent Events (SSE) for Videolify Realtime Signaling
 * Provides true realtime updates without WebSocket complexity
 */

import { NextRequest } from 'next/server';

// Store SSE connections
const connections = new Map<string, {
  controller: ReadableStreamDefaultController;
  roomId: string;
  peerId: string;
}>();

// Broadcast message to room
export function broadcastToRoom(roomId: string, excludePeerId: string, event: string, data: any) {
  for (const [connectionId, conn] of connections.entries()) {
    if (conn.roomId === roomId && conn.peerId !== excludePeerId) {
      try {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        conn.controller.enqueue(new TextEncoder().encode(message));
      } catch (err) {
        console.error('[SSE] Error broadcasting:', err);
        connections.delete(connectionId);
      }
    }
  }
}

/**
 * GET /api/videolify/stream
 * Establish SSE connection for realtime updates
 * NOTE: No auth required for Videolify - accessToken validation done by join endpoint
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');
  const peerId = searchParams.get('peerId');

  if (!roomId || !peerId) {
    return new Response('Missing roomId or peerId', { status: 400 });
  }

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      const connectionId = `${roomId}-${peerId}-${Date.now()}`;
      
      // Store connection
      connections.set(connectionId, { controller, roomId, peerId });
      
      // Send initial connection message
      const welcome = `event: connected\ndata: ${JSON.stringify({ peerId })}\n\n`;
      controller.enqueue(new TextEncoder().encode(welcome));

      // Heartbeat to keep connection alive (30s for reduced bandwidth)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
        } catch (err) {
          clearInterval(heartbeat);
          connections.delete(connectionId);
        }
      }, 30000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        connections.delete(connectionId);
        console.log(`[SSE] Client disconnected: ${peerId}`);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
