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
  let broadcastCount = 0;
  for (const [connectionId, conn] of connections.entries()) {
    if (conn.roomId === roomId && conn.peerId !== excludePeerId) {
      try {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        conn.controller.enqueue(new TextEncoder().encode(message));
        broadcastCount++;
      } catch (err) {
        console.error('[SSE] Error broadcasting:', err);
        connections.delete(connectionId);
      }
    }
  }
}

// Send message to specific peer (unicast)
export function sendToSpecificPeer(roomId: string, toPeerId: string, event: string, data: any) {
  let sent = false;
  for (const [connectionId, conn] of connections.entries()) {
    if (conn.roomId === roomId && conn.peerId === toPeerId) {
      try {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        conn.controller.enqueue(new TextEncoder().encode(message));
        sent = true;
        console.log(`[SSE] Unicast ${event} to peer ${toPeerId}`);
        break; // Only send to first matching connection
      } catch (err) {
        console.error('[SSE] Error sending to peer:', err);
        connections.delete(connectionId);
      }
    }
  }
  if (!sent) {
    console.warn(`[SSE] Peer ${toPeerId} not found in room ${roomId}`);
  }
  return sent;
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

  console.log(`[SSE] Incoming connection request: ${peerId} in room ${roomId}`);

  // ✅ CRITICAL: Use TransformStream for better control over flushing
  const encoder = new TextEncoder();
  let heartbeatInterval: NodeJS.Timeout | null = null;
  const connectionId = `${roomId}-${peerId}-${Date.now()}`;

  const stream = new ReadableStream({
    start(controller) {
      console.log(`[SSE] Stream started: ${connectionId}`);

      // Store connection
      connections.set(connectionId, { controller, roomId, peerId });

      try {
        // ✅ CRITICAL: Send initial connection message IMMEDIATELY
        // This ensures EventSource.onopen fires quickly
        const welcome = `event: connected\ndata: ${JSON.stringify({ peerId })}\n\n`;
        controller.enqueue(encoder.encode(welcome));
        console.log(`[SSE] ✅ Welcome message enqueued for ${peerId}`);
      } catch (err) {
        console.error(`[SSE] Error sending welcome:`, err);
        connections.delete(connectionId);
        try {
          controller.error(err);
        } catch {}
        return;
      }

      // Heartbeat to keep connection alive (30s for reduced bandwidth)
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (err) {
          console.error('[SSE] Heartbeat error:', err);
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          connections.delete(connectionId);
        }
      }, 30000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`[SSE] Client aborted connection: ${peerId}`);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        connections.delete(connectionId);
      });
    },

    cancel() {
      console.log(`[SSE] Stream cancelled: ${connectionId}`);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      connections.delete(connectionId);
    },
  });

  console.log(`[SSE] Returning Response with SSE headers`);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'Access-Control-Allow-Origin': '*', // Allow CORS for SSE
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
