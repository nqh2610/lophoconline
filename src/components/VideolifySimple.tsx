'use client';

/**
 * Videolify Component - SSE (Server-Sent Events) based signaling
 * P2P WebRTC video call with realtime SSE push from server
 * 10x faster than polling, simpler than Socket.IO
 */

import { useEffect, useRef, useState } from 'react';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, 
  Loader2 
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface VideolifyCallProps {
  roomId: string;
  accessToken: string;
  userDisplayName: string;
  role: 'tutor' | 'student';
  onCallEnd?: () => void;
}

export function VideolifyCall({
  roomId,
  accessToken,
  userDisplayName,
  role,
  onCallEnd,
}: VideolifyCallProps) {
  const [isConnecting, setIsConnecting] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const peerIdRef = useRef<string>(`peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const remotePeerIdRef = useRef<string | null>(null);

  // STUN servers for NAT traversal
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // Initialize local media and SSE connection
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function initMedia() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });

        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Establish SSE connection for realtime updates
        connectSSE();
        
        // Join room via REST API
        await joinRoom();
        
        setIsConnecting(false);
      } catch (err) {
        console.error('[Videolify SSE] Error getting media:', err);
        setError('Không thể truy cập camera/microphone');
        setIsConnecting(false);
      }
    }

    initMedia();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  // Connect to SSE stream for realtime updates
  function connectSSE() {
    const eventSource = new EventSource(
      `/api/videolify/stream?roomId=${roomId}&peerId=${peerIdRef.current}`
    );

    eventSourceRef.current = eventSource;

    // Handle peer joined
    eventSource.addEventListener('peer-joined', async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Videolify SSE] Peer joined:', data);

        if (!remotePeerIdRef.current) {
          remotePeerIdRef.current = data.peerId;
          
          // Create peer connection and send offer
          if (!peerConnectionRef.current) {
            await createPeerConnection(true);
          }
        }
      } catch (err) {
        console.error('[Videolify SSE] Error handling peer-joined:', err);
      }
    });

    // Handle offer
    eventSource.addEventListener('offer', async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Videolify SSE] Received offer');

        if (!peerConnectionRef.current) {
          await createPeerConnection(false);
        }

        const pc = peerConnectionRef.current;
        if (pc && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          // Send answer via REST API
          await fetch('/api/videolify/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'answer',
              roomId,
              peerId: peerIdRef.current,
              data: { answer },
            }),
          });

          console.log('[Videolify SSE] Sent answer');
        }
      } catch (err) {
        console.error('[Videolify SSE] Error handling offer:', err);
      }
    });

    // Handle answer
    eventSource.addEventListener('answer', async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Videolify SSE] Received answer');

        const pc = peerConnectionRef.current;
        if (pc && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log('[Videolify SSE] Set remote description');
        }
      } catch (err) {
        console.error('[Videolify SSE] Error handling answer:', err);
      }
    });

    // Handle ICE candidate (realtime!)
    eventSource.addEventListener('ice-candidate', async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Videolify SSE] Received ICE candidate');

        const pc = peerConnectionRef.current;
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log('[Videolify SSE] Added ICE candidate');
        }
      } catch (err) {
        console.error('[Videolify SSE] Error handling ICE candidate:', err);
      }
    });

    // Handle connection errors
    eventSource.onerror = (error) => {
      console.error('[Videolify SSE] Connection error:', error);
      
      // Reconnect after 2 seconds
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          console.log('[Videolify SSE] Reconnecting...');
          connectSSE();
        }
      }, 2000);
    };

    eventSource.onopen = () => {
      console.log('[Videolify SSE] Connection established');
    };
  }

  // Join room
  async function joinRoom() {
    try {
      const response = await fetch('/api/videolify/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          roomId,
          peerId: peerIdRef.current,
          data: {
            userName: userDisplayName,
            role,
          },
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to join room');
      }

      console.log('[Videolify SSE] Joined room, peers:', result.peers);

      // If there are other peers, initiate connection
      if (result.peers && result.peers.length > 0) {
        const remotePeer = result.peers[0];
        remotePeerIdRef.current = remotePeer.peerId;
        
        // Create peer connection and send offer
        await createPeerConnection(true);
      } else {
        // Wait for other peer via SSE
        console.log('[Videolify SSE] Waiting for peer...');
      }
    } catch (err) {
      console.error('[Videolify SSE] Error joining room:', err);
      setError('Không thể kết nối phòng học');
    }
  }

  // Create WebRTC peer connection
  async function createPeerConnection(createOffer: boolean) {
    try {
      const pc = new RTCPeerConnection(iceServers);
      peerConnectionRef.current = pc;

      // Add local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('[Videolify SSE] Received remote track');
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates (sent via REST API, received via SSE)
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await fetch('/api/videolify/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'ice',
              roomId,
              peerId: peerIdRef.current,
              data: { candidate: event.candidate },
            }),
          });
          console.log('[Videolify SSE] Sent ICE candidate');
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[Videolify SSE] Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setIsConnecting(false);
        } else if (pc.connectionState === 'failed') {
          setError('Kết nối thất bại');
        }
      };

      // Create and send offer if initiating
      if (createOffer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await fetch('/api/videolify/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'offer',
            roomId,
            peerId: peerIdRef.current,
            data: { offer },
          }),
        });

        console.log('[Videolify SSE] Sent offer');
      }
    } catch (err) {
      console.error('[Videolify SSE] Error creating peer connection:', err);
      setError('Không thể tạo kết nối');
    }
  }

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // End call
  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Notify server
    fetch('/api/videolify/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'leave',
        roomId,
        peerId: peerIdRef.current,
      }),
    }).catch(console.error);

    if (onCallEnd) {
      onCallEnd();
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Card className="p-8 bg-red-900/20 border-red-500">
          <p className="text-red-400 text-xl mb-4">{error}</p>
          <Button onClick={onCallEnd} variant="outline">
            Quay lại
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* Remote Video (Full Screen) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Local Video (Picture in Picture) */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="absolute top-4 right-4 w-64 h-48 object-cover rounded-lg border-2 border-white shadow-lg"
      />

      {/* Connecting Overlay */}
      {isConnecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
            <p className="text-white text-xl">Đang kết nối...</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
        <Button
          onClick={toggleVideo}
          size="lg"
          variant={isVideoEnabled ? 'default' : 'destructive'}
          className="rounded-full w-14 h-14"
        >
          {isVideoEnabled ? <Video /> : <VideoOff />}
        </Button>

        <Button
          onClick={toggleAudio}
          size="lg"
          variant={isAudioEnabled ? 'default' : 'destructive'}
          className="rounded-full w-14 h-14"
        >
          {isAudioEnabled ? <Mic /> : <MicOff />}
        </Button>

        <Button
          onClick={endCall}
          size="lg"
          variant="destructive"
          className="rounded-full w-14 h-14"
        >
          <PhoneOff />
        </Button>
      </div>

      {/* User Info */}
      <div className="absolute top-4 left-4 bg-black/50 px-4 py-2 rounded-lg">
        <p className="text-white font-semibold">{userDisplayName}</p>
        <p className="text-gray-300 text-sm">{role === 'tutor' ? 'Gia sư' : 'Học viên'}</p>
      </div>
    </div>
  );
}
