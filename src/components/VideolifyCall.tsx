'use client';

/**
 * Videolify Call Component
 * P2P WebRTC video call with whiteboard, screen share, chat
 * Optimized for LopHocTrucTuyen 1-on-1 tutoring
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { fabric } from 'fabric';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, MonitorOff,
  MessageSquare, FileText, Hand, Settings, Maximize, Minimize
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';

interface VideolifyCallProps {
  roomId: string;
  accessToken: string;
  userDisplayName: string;
  role: 'tutor' | 'student';
  onCallEnd?: () => void;
}

interface PeerConnection {
  connection: RTCPeerConnection;
  stream: MediaStream | null;
}

interface ChatMessage {
  peer_name: string;
  message: string;
  timestamp: number;
  fromMe: boolean;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

export function VideolifyCall({
  roomId,
  accessToken,
  userDisplayName,
  role,
  onCallEnd,
}: VideolifyCallProps) {
  // Socket.IO
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  // Media streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Peer connections
  const peerConnections = useRef<Map<string, PeerConnection>>(new Map());
  const remotePeerId = useRef<string | null>(null);

  // Media controls
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // UI state
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Whiteboard
  const whiteboardRef = useRef<HTMLCanvasElement>(null);
  const whiteboardCanvas = useRef<fabric.Canvas | null>(null);

  /**
   * Initialize Socket.IO connection
   */
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const newSocket = io(socketUrl, {
      path: '/videolify-socket',
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('[Videolify] Connected to signaling server');
      setConnected(true);
      setSocket(newSocket);
    });

    newSocket.on('disconnect', () => {
      console.log('[Videolify] Disconnected from signaling server');
      setConnected(false);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  /**
   * Initialize local media (camera + microphone)
   */
  useEffect(() => {
    const initLocalMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          },
        });

        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        console.log('[Videolify] Local media initialized');
      } catch (error) {
        console.error('[Videolify] Error accessing media devices:', error);
        alert('Không thể truy cập camera/microphone. Vui lòng kiểm tra quyền truy cập.');
      }
    };

    initLocalMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  /**
   * Join room when socket connected and local stream ready
   */
  useEffect(() => {
    if (socket && connected && localStream) {
      socket.emit('join', {
        room_id: roomId,
        peer_name: userDisplayName,
        access_token: accessToken,
        peer_video: videoEnabled,
        peer_audio: audioEnabled,
      });

      console.log('[Videolify] Joined room:', roomId);
    }
  }, [socket, connected, localStream, roomId, userDisplayName, accessToken]);

  /**
   * Handle add peer (someone joined)
   */
  useEffect(() => {
    if (!socket || !localStream) return;

    socket.on('addPeer', async (config: {
      peer_id: string;
      peer_name: string;
      should_create_offer: boolean;
    }) => {
      const { peer_id, should_create_offer } = config;
      remotePeerId.current = peer_id;

      console.log('[Videolify] Adding peer:', peer_id);

      // Create peer connection
      const peerConnection = new RTCPeerConnection(ICE_SERVERS);

      // Add local stream tracks
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('[Videolify] Received remote track');
        const [stream] = event.streams;
        setRemoteStream(stream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('relayICE', {
            peer_id,
            ice_candidate: event.candidate,
          });
        }
      };

      // Store peer connection
      peerConnections.current.set(peer_id, {
        connection: peerConnection,
        stream: null,
      });

      // Create offer if required
      if (should_create_offer) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('relaySDP', {
          peer_id,
          session_description: offer,
        });
        console.log('[Videolify] Sent offer to:', peer_id);
      }
    });

    return () => {
      socket.off('addPeer');
    };
  }, [socket, localStream]);

  /**
   * Handle session description (offer/answer)
   */
  useEffect(() => {
    if (!socket) return;

    socket.on('sessionDescription', async (config: {
      peer_id: string;
      session_description: RTCSessionDescriptionInit;
    }) => {
      const { peer_id, session_description } = config;
      const peerData = peerConnections.current.get(peer_id);

      if (peerData) {
        await peerData.connection.setRemoteDescription(
          new RTCSessionDescription(session_description)
        );

        if (session_description.type === 'offer') {
          const answer = await peerData.connection.createAnswer();
          await peerData.connection.setLocalDescription(answer);
          socket.emit('relaySDP', {
            peer_id,
            session_description: answer,
          });
          console.log('[Videolify] Sent answer to:', peer_id);
        }
      }
    });

    return () => {
      socket.off('sessionDescription');
    };
  }, [socket]);

  /**
   * Handle ICE candidates
   */
  useEffect(() => {
    if (!socket) return;

    socket.on('iceCandidate', async (config: {
      peer_id: string;
      ice_candidate: RTCIceCandidateInit;
    }) => {
      const { peer_id, ice_candidate } = config;
      const peerData = peerConnections.current.get(peer_id);

      if (peerData) {
        await peerData.connection.addIceCandidate(
          new RTCIceCandidate(ice_candidate)
        );
      }
    });

    return () => {
      socket.off('iceCandidate');
    };
  }, [socket]);

  /**
   * Handle remove peer (someone left)
   */
  useEffect(() => {
    if (!socket) return;

    socket.on('removePeer', (config: { peer_id: string }) => {
      const { peer_id } = config;
      const peerData = peerConnections.current.get(peer_id);

      if (peerData) {
        peerData.connection.close();
        peerConnections.current.delete(peer_id);
      }

      if (remotePeerId.current === peer_id) {
        setRemoteStream(null);
        remotePeerId.current = null;
      }

      console.log('[Videolify] Peer left:', peer_id);
    });

    return () => {
      socket.off('removePeer');
    };
  }, [socket]);

  /**
   * Handle chat messages
   */
  useEffect(() => {
    if (!socket) return;

    socket.on('message', (config: {
      peer_name: string;
      message: string;
    }) => {
      setChatMessages(prev => [...prev, {
        peer_name: config.peer_name,
        message: config.message,
        timestamp: Date.now(),
        fromMe: false,
      }]);
    });

    return () => {
      socket.off('message');
    };
  }, [socket]);

  /**
   * Initialize whiteboard
   */
  useEffect(() => {
    if (showWhiteboard && whiteboardRef.current && !whiteboardCanvas.current) {
      const canvas = new fabric.Canvas(whiteboardRef.current, {
        isDrawingMode: true,
        width: 800,
        height: 600,
        backgroundColor: '#ffffff',
      });

      canvas.freeDrawingBrush.width = 2;
      canvas.freeDrawingBrush.color = '#000000';

      // Sync whiteboard changes
      canvas.on('object:added', () => {
        if (socket) {
          socket.emit('wbCanvasToJson', {
            room_id: roomId,
            wbCanvasJson: JSON.stringify(canvas.toJSON()),
          });
        }
      });

      whiteboardCanvas.current = canvas;
    }
  }, [showWhiteboard, socket, roomId]);

  /**
   * Toggle audio
   */
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);

        if (socket) {
          socket.emit('peerStatus', {
            room_id: roomId,
            element: 'audio',
            status: audioTrack.enabled,
          });
        }
      }
    }
  }, [localStream, socket, roomId]);

  /**
   * Toggle video
   */
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);

        if (socket) {
          socket.emit('peerStatus', {
            room_id: roomId,
            element: 'video',
            status: videoTrack.enabled,
          });
        }
      }
    }
  }, [localStream, socket, roomId]);

  /**
   * Toggle screen share
   */
  const toggleScreenShare = useCallback(async () => {
    if (!remotePeerId.current) return;

    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            frameRate: { max: 30 },
          },
          audio: true,
        });

        const peerData = peerConnections.current.get(remotePeerId.current);
        if (peerData) {
          const videoSender = peerData.connection
            .getSenders()
            .find(sender => sender.track?.kind === 'video');

          if (videoSender) {
            videoSender.replaceTrack(screenStream.getVideoTracks()[0]);
          }
        }

        setIsScreenSharing(true);

        // Stop screen share when user clicks "Stop sharing"
        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };
      } else {
        if (localStream) {
          const peerData = peerConnections.current.get(remotePeerId.current);
          if (peerData) {
            const videoSender = peerData.connection
              .getSenders()
              .find(sender => sender.track?.kind === 'video');

            if (videoSender) {
              videoSender.replaceTrack(localStream.getVideoTracks()[0]);
            }
          }
        }
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('[Videolify] Screen share error:', error);
    }
  }, [isScreenSharing, localStream]);

  /**
   * Send chat message
   */
  const sendMessage = useCallback(() => {
    if (chatInput.trim() && socket) {
      socket.emit('message', {
        room_id: roomId,
        peer_name: userDisplayName,
        message: chatInput,
      });

      setChatMessages(prev => [...prev, {
        peer_name: userDisplayName,
        message: chatInput,
        timestamp: Date.now(),
        fromMe: true,
      }]);

      setChatInput('');
    }
  }, [chatInput, socket, roomId, userDisplayName]);

  /**
   * End call
   */
  const endCall = useCallback(() => {
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    // Close peer connections
    peerConnections.current.forEach(({ connection }) => {
      connection.close();
    });
    peerConnections.current.clear();

    // Disconnect socket
    if (socket) {
      socket.close();
    }

    // Callback
    if (onCallEnd) {
      onCallEnd();
    }
  }, [localStream, socket, onCallEnd]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Video container */}
      <div className="flex-1 relative">
        {/* Remote video (main) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Local video (pip) */}
        <div className="absolute top-4 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden shadow-xl">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
          />
          {!videoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <VideoOff className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Connection status */}
        {!connected && (
          <div className="absolute top-4 left-4">
            <Badge variant="destructive">Đang kết nối...</Badge>
          </div>
        )}

        {/* Whiteboard overlay */}
        {showWhiteboard && (
          <div className="absolute inset-0 bg-white/95 flex items-center justify-center">
            <Card className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Bảng trắng</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWhiteboard(false)}
                >
                  <Minimize className="w-4 h-4" />
                </Button>
              </div>
              <canvas ref={whiteboardRef} className="border border-gray-300" />
            </Card>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="bg-gray-900 p-4 flex items-center justify-center gap-2">
        <Button
          variant={audioEnabled ? "default" : "destructive"}
          size="lg"
          onClick={toggleAudio}
        >
          {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>

        <Button
          variant={videoEnabled ? "default" : "destructive"}
          size="lg"
          onClick={toggleVideo}
        >
          {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>

        <Button
          variant={isScreenSharing ? "secondary" : "default"}
          size="lg"
          onClick={toggleScreenShare}
        >
          {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </Button>

        <Button
          variant={showWhiteboard ? "secondary" : "default"}
          size="lg"
          onClick={() => setShowWhiteboard(!showWhiteboard)}
        >
          <FileText className="w-5 h-5" />
        </Button>

        <Button
          variant={showChat ? "secondary" : "default"}
          size="lg"
          onClick={() => setShowChat(!showChat)}
        >
          <MessageSquare className="w-5 h-5" />
        </Button>

        <Separator orientation="vertical" className="h-8 mx-2" />

        <Button
          variant="destructive"
          size="lg"
          onClick={endCall}
        >
          <PhoneOff className="w-5 h-5" />
        </Button>
      </div>

      {/* Chat panel */}
      {showChat && (
        <div className="absolute right-0 top-0 bottom-20 w-80 bg-white shadow-xl flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Trò chuyện</h3>
          </div>
          <ScrollArea className="flex-1 p-4">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`mb-3 ${msg.fromMe ? 'text-right' : 'text-left'}`}
              >
                <div className="text-xs text-gray-500 mb-1">
                  {msg.peer_name}
                </div>
                <div
                  className={`inline-block px-3 py-2 rounded-lg ${
                    msg.fromMe
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            ))}
          </ScrollArea>
          <div className="p-4 border-t flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Nhập tin nhắn..."
            />
            <Button onClick={sendMessage}>Gửi</Button>
          </div>
        </div>
      )}
    </div>
  );
}
