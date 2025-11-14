/**
 * API Route for Videolify Signaling with SSE broadcasts
 * Handles SDP exchange and ICE candidates with realtime updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { broadcastToRoom } from '../stream/route';

// In-memory storage - CHỈ cho signaling, KHÔNG lưu chat/whiteboard
const rooms = new Map<string, {
  peers: Map<string, {
    userId: number;
    userName: string;
    role: string;
    offer?: any;
    answer?: any;
    iceCandidates: any[];
    lastSeen: number;
  }>;
}>();

// Export clear function for test/debug
export function clearAllRooms() {
  console.log(`[Videolify Signal] Clearing all rooms (${rooms.size} rooms)`);
  rooms.clear();
}

// Cleanup old rooms every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    // Remove peers that haven't been seen in 60 seconds (faster cleanup)
    for (const [peerId, peer] of room.peers.entries()) {
      if (now - peer.lastSeen > 60000) {
        console.log(`[Videolify Signal] Removing inactive peer ${peerId} from room ${roomId}`);
        room.peers.delete(peerId);
        // Broadcast peer-left to remaining peers
        broadcastToRoom(roomId, peerId, 'peer-left', { peerId });
      }
    }
    // Remove empty rooms
    if (room.peers.size === 0) {
      console.log(`[Videolify Signal] Removing empty room ${roomId}`);
      rooms.delete(roomId);
    }
  }
}, 300000);

/**
 * POST /api/videolify/signal
 * Handle signaling messages
 * NOTE: No auth required for Videolify - accessToken validation done by join endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, roomId, peerId, data } = body;

    if (!roomId || !peerId) {
      return NextResponse.json({ error: 'Missing roomId or peerId' }, { status: 400 });
    }

    // Get or create room
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { peers: new Map() });
    }
    const room = rooms.get(roomId)!;

    // Use userId from data if available, otherwise default to 0 (anonymous)
    const userId = data.userId || 0;
    const userName = data.userName || 'User';

    switch (action) {
      case 'join':
        // IMPORTANT: Remove STALE peer IDs (same user rejoining after disconnect/refresh)
        // We identify stale peers by:
        // 1. Same userId (if not 0/anonymous)  
        // 2. Same userName in same room (for anonymous)
        // 3. lastSeen > 10 seconds ago (stale connection)
        // This prevents issues while allowing multiple users with same name
        
        const now = Date.now();
        const STALE_THRESHOLD = 10000; // 10 seconds
        
        if (userId !== 0) {
          // Authenticated user: remove STALE peers with same userId
          for (const [oldPeerId, oldPeer] of room.peers.entries()) {
            if (oldPeer.userId === userId && oldPeerId !== peerId) {
              const staleTime = now - oldPeer.lastSeen;
              if (staleTime > STALE_THRESHOLD) {
                console.log(`[Videolify Signal] Removing STALE peer ${oldPeerId} (same userId ${userId}, stale ${staleTime}ms, new peerId ${peerId})`);
                room.peers.delete(oldPeerId);
                broadcastToRoom(roomId, oldPeerId, 'peer-left', { peerId: oldPeerId });
              }
            }
          }
        } else {
          // Anonymous user: remove STALE peers with same userName in this room
          // Only remove if lastSeen is stale (prevents removing active user with same name)
          for (const [oldPeerId, oldPeer] of room.peers.entries()) {
            if (oldPeer.userName === userName && oldPeerId !== peerId) {
              const staleTime = now - oldPeer.lastSeen;
              if (staleTime > STALE_THRESHOLD) {
                console.log(`[Videolify Signal] Removing STALE peer ${oldPeerId} (same userName "${userName}" in room ${roomId}, stale ${staleTime}ms, new peerId ${peerId})`);
                room.peers.delete(oldPeerId);
                broadcastToRoom(roomId, oldPeerId, 'peer-left', { peerId: oldPeerId});
              }
            }
          }
        }
        
        // Compute existing peers AFTER removing stale peers
        const existingPeers = Array.from(room.peers.entries())
          .map(([id, peer]) => ({
            peerId: id,
            userName: peer.userName,
            role: peer.role,
          }));

        // Add current peer to room
        room.peers.set(peerId, {
          userId,
          userName,
          role: data.role || 'participant',
          iceCandidates: [],
          lastSeen: now,
        });

        console.log(`[Videolify Signal] peer ${peerId} joined room ${roomId} @ ${new Date().toISOString()}`);

        // ALWAYS broadcast to existing peers that new peer joined
        // Tell them to create offer (both sides will create → Perfect Negotiation handles collision)
        if (existingPeers.length > 0) {
          console.log(`[Videolify Signal] Broadcasting peer-joined to ${existingPeers.length} existing peers`);
          broadcastToRoom(roomId, peerId, 'peer-joined', {
            peerId,
            userName,
            role: data.role || 'participant',
            shouldInitiate: true, // Tell existing peer to create offer
          });
        }

        // Return list of peers that were present BEFORE this join
        return NextResponse.json({
          success: true,
          peers: existingPeers,
        });

      case 'offer':
        // Store offer from this peer
        const peer = room.peers.get(peerId);
        if (peer) {
          peer.offer = data.offer;
          peer.lastSeen = Date.now();
          console.log(`[Videolify Signal] offer from ${peerId} to ${data.toPeerId || 'ALL'} in room ${roomId} @ ${new Date().toISOString()}`);
          
          // Targeted broadcast: only send to specific peer if toPeerId provided
          if (data.toPeerId) {
            // Unicast to target peer only
            broadcastToRoom(roomId, peerId, 'offer', {
              fromPeerId: peerId,
              offer: data.offer,
              toPeerId: data.toPeerId,
            });
          } else {
            // Fallback: broadcast to all (legacy)
            broadcastToRoom(roomId, peerId, 'offer', {
              fromPeerId: peerId,
              offer: data.offer,
            });
          }
        }
        return NextResponse.json({ success: true });

      case 'answer':
        // Store answer from this peer
        const answerPeer = room.peers.get(peerId);
        if (answerPeer) {
          answerPeer.answer = data.answer;
          answerPeer.lastSeen = Date.now();
          console.log(`[Videolify Signal] answer from ${peerId} to ${data.toPeerId || 'ALL'} in room ${roomId} @ ${new Date().toISOString()}`);

          // Targeted broadcast: only send to specific peer if toPeerId provided
          if (data.toPeerId) {
            broadcastToRoom(roomId, peerId, 'answer', {
              fromPeerId: peerId,
              answer: data.answer,
              toPeerId: data.toPeerId,
            });
          } else {
            // Fallback: broadcast to all
            broadcastToRoom(roomId, peerId, 'answer', {
              fromPeerId: peerId,
              answer: data.answer,
            });
          }
        }
        return NextResponse.json({ success: true });

      case 'ice':
        // Store ICE candidate
        const icePeer = room.peers.get(peerId);
        if (icePeer) {
          icePeer.iceCandidates.push(data.candidate);
          icePeer.lastSeen = Date.now();
          console.log(`[Videolify Signal] ice from ${peerId} in room ${roomId} @ ${new Date().toISOString()}`);

          // Broadcast ICE candidate to all peers via SSE (realtime!)
          broadcastToRoom(roomId, peerId, 'ice-candidate', {
            fromPeerId: peerId,
            candidate: data.candidate,
          });
        }
        return NextResponse.json({ success: true });

      case 'poll':
        // Poll for updates from other peers
        const targetPeer = room.peers.get(data.targetPeerId);
        if (!targetPeer) {
          return NextResponse.json({ success: false, error: 'Peer not found' });
        }

        // Update last seen
        const currentPeer = room.peers.get(peerId);
        if (currentPeer) {
          currentPeer.lastSeen = Date.now();
        }

        return NextResponse.json({
          success: true,
          offer: targetPeer.offer,
          answer: targetPeer.answer,
          iceCandidates: targetPeer.iceCandidates,
        });

      case 'leave':
        room.peers.delete(peerId);
        
        // Broadcast peer left
        broadcastToRoom(roomId, peerId, 'peer-left', { peerId });
        return NextResponse.json({ success: true });

      case 'refresh':
        // Peer is reloading page (F5) - broadcast to other peers so they reload too
        console.log(`[Videolify Signal] 🔄 Peer ${peerId} is refreshing - broadcasting to room ${roomId}`);
        
        // Broadcast refresh signal to ALL OTHER peers in room
        broadcastToRoom(roomId, peerId, 'refresh', {
          fromPeerId: peerId,
          reason: data.reason || 'page-reload',
          newPeerId: data.newPeerId,
        });
        
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Videolify Signal] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/videolify/signal?roomId=xxx&peerId=yyy
 * Poll for room updates
 * NOTE: No auth required for Videolify
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const peerId = searchParams.get('peerId');

    if (!roomId || !peerId) {
      return NextResponse.json({ error: 'Missing roomId or peerId' }, { status: 400 });
    }

    const room = rooms.get(roomId);
    if (!room) {
      return NextResponse.json({
        success: true,
        peers: [],
        messages: [],
      });
    }

    // Update last seen
    const peer = room.peers.get(peerId);
    if (peer) {
      peer.lastSeen = Date.now();
    }

    // Return other peers
    const otherPeers = Array.from(room.peers.entries())
      .filter(([id]) => id !== peerId)
      .map(([id, peerData]) => ({
        peerId: id,
        userName: peerData.userName,
        role: peerData.role,
        hasOffer: !!peerData.offer,
        hasAnswer: !!peerData.answer,
        iceCandidatesCount: peerData.iceCandidates.length,
      }));

    return NextResponse.json({
      success: true,
      peers: otherPeers,
      peerCount: room.peers.size,
    });
  } catch (error) {
    console.error('[Videolify Signal Poll] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
