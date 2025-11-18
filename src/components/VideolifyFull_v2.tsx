/**
 * VideolifyFull v2 - Complete refactored version
 * ALL features with optimized code
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSignaling } from './videolify/hooks/useSignaling';
import { useWebRTC } from './videolify/hooks/useWebRTC';
import { useMediaDevices } from './videolify/hooks/useMediaDevices';
import { useChat } from './videolify/hooks/useChat';
import { useWhiteboard } from './videolify/hooks/useWhiteboard';
import { useScreenShare } from './videolify/hooks/useScreenShare';
import { useFileTransfer } from './videolify/hooks/useFileTransfer';
import { useVirtualBackground } from './videolify/hooks/useVirtualBackground';
import { useRecording } from './videolify/hooks/useRecording';
import type { VideolifyFullProps } from './videolify/types';

import Draggable from 'react-draggable';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { User, VideoOff, MicOff, Eye, EyeOff, Maximize2, Minimize2, Hand } from 'lucide-react';

// UI Components
import { VirtualBackgroundPanel } from './videolify/ui/VirtualBackgroundPanel';
import { ChatPanel } from './videolify/ui/ChatPanel';
import { WhiteboardPanel } from './videolify/ui/WhiteboardPanel';
import { VideoCallToolbar } from './videolify/ui/VideoCallToolbar';
import { FileTransferPanel } from './videolify/ui/FileTransferPanel';
import { DebugStatsPanel } from './videolify/ui/DebugStatsPanel';

// ✅ CRITICAL: Global initialization tracker to prevent StrictMode double-init
// MUST be outside component so it persists across component remounts
const initializedRooms = new Map<string, { initialized: boolean, timestamp: number }>();

export function VideolifyFull_v2({
  roomId,
  accessToken,
  userDisplayName,
  role,
  onCallEnd,
}: VideolifyFullProps) {
  const { toast } = useToast();

  // ✅ Log collector for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__videolifyLogs = (window as any).__videolifyLogs || [];
    }
  }, []);

  // ✅ CRITICAL: ALWAYS generate NEW peerId - make F5 identical to new join
  // This is the KEY to making F5 work reliably
  const peerIdRef = useRef<string>('');
  if (!peerIdRef.current) {
    peerIdRef.current = `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('[VideolifyFull_v2] Generated new peerId (fresh join):', peerIdRef.current);
  }
  const peerId = peerIdRef.current;

  // UI State
  const [showChat, setShowChat] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showFileTransfer, setShowFileTransfer] = useState(false);
  const [showVbgPanel, setShowVbgPanel] = useState(false);
  const [showDebugStats, setShowDebugStats] = useState(false);

  // Call State
  const [handRaised, setHandRaised] = useState(false);
  const [remoteHandRaised, setRemoteHandRaised] = useState(false);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);

  // PiP controls - Separate for local and remote
  const [localPipSize, setLocalPipSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [localPipVisible, setLocalPipVisible] = useState(true);
  const [remotePipSize, setRemotePipSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [remotePipVisible, setRemotePipVisible] = useState(true);

  // File transfer
  const [isFileTransferMinimized, setIsFileTransferMinimized] = useState(false);

  // VBG category filter
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Connection stats
  const [connectionStats, setConnectionStats] = useState({
    connected: false,
    iceConnectionState: 'new',
    connectionState: 'new',
    signalingState: 'stable',
    localCandidates: 0,
    remoteCandidates: 0,
    selectedLocalCandidate: undefined as string | undefined,
    selectedRemoteCandidate: undefined as string | undefined,
  });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const whiteboardCanvasRef = useRef<HTMLCanvasElement>(null);
  const remotePeerIdRef = useRef<string | null>(null);
  const controlChannelRef = useRef<RTCDataChannel | null>(null);

  const media = useMediaDevices();
  const chat = useChat({ userName: userDisplayName });
  const whiteboard = useWhiteboard(roomId);
  const fileTransfer = useFileTransfer();
  const vbg = useVirtualBackground();
  const recording = useRecording();

  const webrtc = useWebRTC({
    peerId,
    onTrack: (event) => {
      console.log('[VideolifyFull_v2] Remote track received');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    },
    onConnectionStateChange: (state) => {
      console.log('[VideolifyFull_v2] Connection state:', state);
      
      // Log for testing
      if (typeof window !== 'undefined') {
        (window as any).__videolifyLogs = (window as any).__videolifyLogs || [];
        (window as any).__videolifyLogs.push(`Connection state: ${state}`);
      }
      
      setConnectionStats((prev) => ({
        ...prev,
        connectionState: state,
        connected: state === 'connected',
      }));

      if (state === 'connected') {
        setIsConnecting(false);
        toast({ title: '✅ Đã kết nối thành công' });
      } else if (state === 'failed') {
        toast({ title: '❌ Mất kết nối', variant: 'destructive' });
      } else if (state === 'connecting') {
        setIsConnecting(true);
      }
    },
    onIceCandidate: (candidate) => {
      console.log('[VideolifyFull_v2] Sending ICE candidate');
      if (remotePeerIdRef.current) {
        signaling.sendIceCandidate(candidate, remotePeerIdRef.current);
      }
    },
    onDataChannel: (channel) => {
      console.log('[VideolifyFull_v2] Data channel received:', channel.label);
      if (channel.label === 'chat') chat.setupChannel(channel);
      else if (channel.label === 'whiteboard') whiteboard.setupChannel(channel);
      else if (channel.label === 'control') setupControlChannel(channel);
      else if (channel.label === 'file') fileTransfer.setupChannel(channel);
    },
  });

  const screenShare = useScreenShare(webrtc.peerConnection);

  const signaling = useSignaling({
    roomId,
    peerId,
    accessToken,
    userName: userDisplayName,
    role,
    callbacks: {
      onPeerJoined: async (event) => {
        remotePeerIdRef.current = event.peerId;
        
        // Close existing connection if any (for reconnection scenario)
        if (webrtc.peerConnection) {
          console.log('[VideolifyFull_v2] Closing existing connection before reconnection');
          webrtc.close();
        }
        
        // ✅ ALWAYS create PeerConnection for both initiator and answerer
        webrtc.createPeerConnection();

        // ✅ FIX F5: Add tracks if available, but DON'T WAIT
        // Connection works without media - user can enable later
        if (media.localStream) {
          console.log('[VideolifyFull_v2] Adding tracks to PC:', media.localStream.getTracks().length);
          media.localStream.getTracks().forEach((track) => {
            webrtc.addTrack(track, media.localStream!);
          });
        } else {
          console.log('[VideolifyFull_v2] No media stream yet - connecting without media (user can enable later)');
        }

        if (event.shouldInitiate) {
          const chatCh = webrtc.createDataChannel('chat', { ordered: true });
          const whiteboardCh = webrtc.createDataChannel('whiteboard', { ordered: true });
          const controlCh = webrtc.createDataChannel('control', { ordered: true });
          const fileCh = webrtc.createDataChannel('file', { ordered: false });

          if (chatCh) chat.setupChannel(chatCh);
          if (whiteboardCh) whiteboard.setupChannel(whiteboardCh);
          if (controlCh) setupControlChannel(controlCh);
          if (fileCh) fileTransfer.setupChannel(fileCh);

          const offer = await webrtc.createOffer();
          if (offer) await signaling.sendOffer(offer, event.peerId);
        }
      },
      onOffer: async (event) => {
        remotePeerIdRef.current = event.fromPeerId;
        
        // ✅ Create PC if not exists (backup for answerer)
        if (!webrtc.peerConnection) {
          webrtc.createPeerConnection();
          
          // ✅ FIX F5: Add tracks if available, but DON'T WAIT
          if (media.localStream) {
            console.log('[VideolifyFull_v2] Adding tracks in onOffer:', media.localStream.getTracks().length);
            media.localStream.getTracks().forEach((track) => {
              webrtc.addTrack(track, media.localStream!);
            });
          } else {
            console.log('[VideolifyFull_v2] No media stream in onOffer - answering without media');
          }
        }
        
        const answer = await webrtc.handleOffer(event.offer, event.fromPeerId);
        if (answer) await signaling.sendAnswer(answer, event.fromPeerId);
      },
      onAnswer: async (event) => {
        await webrtc.handleAnswer(event.answer);
      },
      onIceCandidate: async (event) => {
        await webrtc.addIceCandidate(event.candidate);
      },
      onVbgSettings: async (event) => {
        if (remoteVideoRef.current && media.localStream) {
          await vbg.applyRemoteVirtualBackground(media.localStream, remoteVideoRef.current, event);
        }
      },
      onPeerLeft: (event) => {
        console.log('[VideolifyFull_v2] Peer left:', event.peerId);
        // Only show toast if we had an active connection with this peer
        if (remotePeerIdRef.current === event.peerId && connectionStats.connected) {
          toast({ title: 'Người khác đã rời phòng', variant: 'destructive' });
          onCallEnd?.();
        } else {
          console.log('[VideolifyFull_v2] Ignoring peer-left for non-connected peer:', event.peerId);
        }
      },
    },
  });

  const setupControlChannel = useCallback((channel: RTCDataChannel) => {
    controlChannelRef.current = channel;
    channel.onmessage = (e) => {
      const control = JSON.parse(e.data);
      if (control.type === 'hand-raise') setRemoteHandRaised(control.raised);
      else if (control.type === 'video-toggle') setRemoteVideoEnabled(control.enabled);
      else if (control.type === 'audio-toggle') setRemoteAudioEnabled(control.enabled);
    };
  }, []);

  const sendControl = useCallback((type: string, data: any) => {
    if (controlChannelRef.current?.readyState === 'open') {
      controlChannelRef.current.send(JSON.stringify({ type, ...data }));
    }
  }, []);

  useEffect(() => {
    // ✅ CRITICAL FIX: Use GLOBAL flag to prevent React StrictMode double-init
    const roomKey = `${roomId}-${peerId}`;
    const now = Date.now();

    // Check if already initialized recently (within 1 second)
    const existing = initializedRooms.get(roomKey);
    if (existing && (now - existing.timestamp) < 1000) {
      console.log('[VideolifyFull_v2] ⚠️ Already initialized, skipping duplicate mount (StrictMode)');
      // ✅ CRITICAL: Return empty cleanup to prevent disconnecting on StrictMode remount
      return () => {
        console.log('[VideolifyFull_v2] Skipped mount cleanup - connections preserved');
      };
    }

    // Mark as initialized GLOBALLY
    initializedRooms.set(roomKey, { initialized: true, timestamp: now });
    console.log('[VideolifyFull_v2] ✅ Marked as initialized globally');

    // ✅ CRITICAL: Handle visibility change (tab switch, minimize)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[VideolifyFull_v2] Page hidden - connection will persist');
      } else {
        console.log('[VideolifyFull_v2] Page visible - connection active');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    (async () => {
      console.log('[VideolifyFull_v2] Initializing...');

      // ✅ CRITICAL FIX: Check if we already have a valid stream (F5 case)
      let stream: MediaStream | null = media.localStream;
      
      // If no stream or stream is inactive, request new one
      if (!stream || stream.getTracks().every(t => t.readyState === 'ended')) {
        console.log('[VideolifyFull_v2] Requesting media permissions...');
        try {
          stream = await media.requestPermissions();
          console.log('[VideolifyFull_v2] Media stream ready:', stream?.getTracks().length || 0, 'tracks');
        } catch (err) {
          console.error('[VideolifyFull_v2] Media permission error:', err);
          stream = null;
        }
      } else {
        console.log('[VideolifyFull_v2] Reusing existing media stream (F5 case)');
      }
      
      if (stream && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // ✅ Connect to SSE and join room (ALWAYS, even without media)
      console.log('[VideolifyFull_v2] Connecting to SSE...');
      await signaling.connect();
      console.log('[VideolifyFull_v2] SSE connected, now joining room...');

      const joinResponse = await signaling.joinRoom();
      console.log('[VideolifyFull_v2] Joined room, existing peers:', joinResponse.peers || []);
    })();

    return () => {
      console.log('[VideolifyFull_v2] Cleanup triggered');
      
      // Remove event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // ✅ CRITICAL for F5: Just disconnect SSE and close PC
      // DON'T send leave signal - let server timeout handle it (prevents race condition)
      // DON'T stop media - preserve for reconnection
      signaling.disconnect();
      webrtc.close();
      vbg.destroy();
      
      // Clear initialization flag immediately (allow re-init)
      initializedRooms.delete(roomKey);
    };
  }, [roomId, peerId]);

  useEffect(() => {
    if (showWhiteboard && whiteboardCanvasRef.current && !whiteboard.canvas) {
      whiteboard.initialize(whiteboardCanvasRef.current);
    }
  }, [showWhiteboard]);

  const handleToggleVideo = useCallback(() => {
    media.toggleVideo();
    sendControl('video-toggle', { enabled: !media.isVideoEnabled });
  }, [media, sendControl]);

  const handleToggleAudio = useCallback(() => {
    media.toggleAudio();
    sendControl('audio-toggle', { enabled: !media.isAudioEnabled });
  }, [media, sendControl]);

  const handleToggleScreenShare = useCallback(() => {
    screenShare.toggleSharing();
    sendControl('screen-share-toggle', { isSharing: !screenShare.isSharing });
  }, [screenShare, sendControl]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    chat.sendMessage(chatInput);
    setChatInput('');
  };

  const toggleHandRaise = () => {
    const newState = !handRaised;
    setHandRaised(newState);
    sendControl('hand-raise', { raised: newState });
  };

  const handleFilePick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        fileTransfer.sendFile(file);
        setShowFileTransfer(true);
      }
    };
    input.click();
  };

  const handleVbgBlur = async () => {
    if (localVideoRef.current && media.localStream) {
      await vbg.enableVirtualBackground(media.localStream, localVideoRef.current, 'blur');
      await signaling.sendVbgSettings({ enabled: true, mode: 'blur', blurAmount: vbg.blurAmount, toPeerId: remotePeerIdRef.current! });
    }
  };

  const handleVbgNone = async () => {
    if (localVideoRef.current) {
      vbg.disableVirtualBackground(localVideoRef.current);
      await signaling.sendVbgSettings({ enabled: false, mode: 'none', toPeerId: remotePeerIdRef.current! });
    }
  };

  const handleVbgImage = async (imageUrl: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = imageUrl;
    });

    if (localVideoRef.current && media.localStream) {
      await vbg.enableVirtualBackground(media.localStream, localVideoRef.current, 'image', { backgroundImage: img });
      await signaling.sendVbgSettings({
        enabled: true,
        mode: 'image',
        backgroundImage: imageUrl,
        toPeerId: remotePeerIdRef.current!,
      });
    }
  };

  const endCall = () => {
    signaling.leaveRoom();
    onCallEnd?.();
  };

  // PiP toggle functions
  const toggleLocalPipSize = () => {
    setLocalPipSize((prev) => (prev === 'small' ? 'medium' : prev === 'medium' ? 'large' : 'small'));
  };

  const toggleRemotePipSize = () => {
    setRemotePipSize((prev) => (prev === 'small' ? 'medium' : prev === 'medium' ? 'large' : 'small'));
  };

  return (
    <TooltipProvider>
      <div className="relative w-full h-screen bg-gray-900 flex flex-col">
        {/* Connection Status Indicator (exact v1 styling) */}
        <div className="absolute top-3 left-3 z-50">
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
            connectionStats.connected
              ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]'
              : isConnecting
              ? 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]'
              : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
          }`} />
        </div>


        {/* Main Area */}
        <div className="flex-1 flex">
          {/* Video Area with padding for control bar */}
          <div className="flex-1 relative bg-gray-800 pb-24">
            {/* Waiting/Connecting State (exact v1) */}
            {!connectionStats.connected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-center space-y-4 p-8">
                  {isConnecting ? (
                    <>
                      <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                      <h2 className="text-white text-2xl font-semibold">Đang kết nối...</h2>
                      <p className="text-gray-400 text-lg">Vui lòng đợi trong giây lát</p>
                      <Badge className="bg-blue-500/90 text-white px-4 py-2 text-base">
                        🔄 Đang thiết lập kết nối...
                      </Badge>
                    </>
                  ) : (
                    <>
                      <div className="text-6xl mb-4">👋</div>
                      <h2 className="text-white text-2xl font-semibold">Đang chờ người tham gia</h2>
                      <p className="text-gray-400 text-lg">Chia sẻ link này để bắt đầu buổi học</p>
                      <Badge className="bg-yellow-500/90 text-black px-4 py-2 text-base">
                        ⏳ Phòng đã sẵn sàng - đang chờ người khác tham gia...
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Main Content Area - Logo/Screen Share/Whiteboard */}
            <div className="relative w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
              {/* Screen Share Video (when sharing) */}
              {screenShare.isSharing && screenShare.screenStream && (
                <video
                  ref={(el) => {
                    if (el && screenShare.screenStream) {
                      el.srcObject = screenShare.screenStream;
                    }
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              )}

              {/* Welcome Screen with Logo (when not sharing) */}
              {!screenShare.isSharing && !showWhiteboard && (
                <div className="text-center space-y-8">
                  <div className="text-white text-6xl font-bold mb-4">
                    📚 Học trực tuyến
                  </div>
                  <p className="text-gray-400 text-2xl">Chào mừng đến với lớp học!</p>
                  <div className="text-gray-500 text-lg">
                    Bắt đầu chia sẻ màn hình hoặc sử dụng bảng trắng để dạy học
                  </div>
                </div>
              )}

          {/* Local Video PiP - Draggable */}
          {localPipVisible && (
            <Draggable bounds="parent" handle=".drag-handle" defaultPosition={{ x: 0, y: 0 }}>
              <div className={`absolute top-3 right-3 z-30 group ${
                localPipSize === 'small' ? 'w-40 h-30' :
                localPipSize === 'medium' ? 'w-64 h-48' :
                'w-96 h-72'
              }`}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover rounded-lg border-2 border-blue-500 shadow-lg cursor-move drag-handle ${
                    media.isVideoEnabled ? 'block' : 'hidden'
                  }`}
                />

                {/* Camera Off Overlay */}
                {!media.isVideoEnabled && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg border-2 border-blue-500 shadow-lg cursor-move drag-handle">
                    <div className={`rounded-full bg-gray-800 flex items-center justify-center shadow-xl mb-2 ${
                      localPipSize === 'small' ? 'w-12 h-12' :
                      localPipSize === 'medium' ? 'w-16 h-16' :
                      'w-24 h-24'
                    }`}>
                      <User className={`text-gray-400 ${
                        localPipSize === 'small' ? 'w-6 h-6' :
                        localPipSize === 'medium' ? 'w-8 h-8' :
                        'w-12 h-12'
                      }`} />
                    </div>
                    <div className="flex items-center gap-1">
                      <VideoOff className={`text-red-400 ${
                        localPipSize === 'small' ? 'w-3 h-3' :
                        localPipSize === 'medium' ? 'w-4 h-4' :
                        'w-5 h-5'
                      }`} />
                      <p className={`text-white font-semibold ${
                        localPipSize === 'small' ? 'text-xs' :
                        localPipSize === 'medium' ? 'text-sm' :
                        'text-base'
                      }`}>
                        Camera tắt
                      </p>
                    </div>
                  </div>
                )}

                {/* Name Label */}
                <div className="absolute bottom-2 left-2 bg-blue-500/90 text-white px-2 py-1 rounded text-xs font-semibold">
                  {userDisplayName}
                </div>

                {/* PiP Controls - Show on hover */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={toggleLocalPipSize}
                        size="sm"
                        variant="secondary"
                        className="h-7 w-7 p-0 bg-black/50 hover:bg-black/70"
                      >
                        {localPipSize === 'small' ? <Maximize2 className="w-3 h-3" /> :
                         localPipSize === 'medium' ? <Maximize2 className="w-4 h-4" /> :
                         <Minimize2 className="w-4 h-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {localPipSize === 'small' ? 'Phóng to' :
                       localPipSize === 'medium' ? 'Phóng to thêm' : 'Thu nhỏ'}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setLocalPipVisible(false)}
                        size="sm"
                        variant="secondary"
                        className="h-7 w-7 p-0 bg-black/50 hover:bg-black/70"
                      >
                        <EyeOff className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Ẩn video của tôi</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </Draggable>
          )}

          {/* Remote Video PiP - Below Local Video */}
          {remotePipVisible && (
            <Draggable bounds="parent" handle=".drag-handle-remote" defaultPosition={{ x: 0, y: 200 }}>
              <div className={`absolute top-52 right-3 z-30 group ${
                remotePipSize === 'small' ? 'w-40 h-30' :
                remotePipSize === 'medium' ? 'w-64 h-48' :
                'w-96 h-72'
              }`}>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover rounded-lg border-2 border-green-500 shadow-lg cursor-move drag-handle-remote ${
                    connectionStats.connected && remoteVideoEnabled ? 'block' : 'hidden'
                  }`}
                />

                {/* Camera Off Overlay */}
                {(!connectionStats.connected || !remoteVideoEnabled) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg border-2 border-green-500 shadow-lg cursor-move drag-handle-remote">
                    <div className={`rounded-full bg-gray-800 flex items-center justify-center shadow-xl mb-2 ${
                      remotePipSize === 'small' ? 'w-12 h-12' :
                      remotePipSize === 'medium' ? 'w-16 h-16' :
                      'w-24 h-24'
                    }`}>
                      <User className={`text-gray-400 ${
                        remotePipSize === 'small' ? 'w-6 h-6' :
                        remotePipSize === 'medium' ? 'w-8 h-8' :
                        'w-12 h-12'
                      }`} />
                    </div>
                    <p className={`text-white font-semibold ${
                      remotePipSize === 'small' ? 'text-xs' :
                      remotePipSize === 'medium' ? 'text-sm' :
                      'text-base'
                    }`}>
                      {role === 'tutor' ? 'Học viên' : 'Giáo viên'}
                    </p>
                  </div>
                )}

                {/* Name Label */}
                <div className="absolute bottom-2 left-2 bg-green-500/90 text-white px-2 py-1 rounded text-xs font-semibold">
                  {role === 'tutor' ? 'Học viên' : 'Giáo viên'}
                </div>

                {/* Mic Muted Indicator */}
                {connectionStats.connected && !remoteAudioEnabled && (
                  <div className="absolute top-2 left-2 bg-red-500/90 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                    <MicOff className="w-3 h-3" />
                    <span>Mic tắt</span>
                  </div>
                )}

                {/* PiP Controls - Show on hover */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={toggleRemotePipSize}
                        size="sm"
                        variant="secondary"
                        className="h-7 w-7 p-0 bg-black/50 hover:bg-black/70"
                      >
                        {remotePipSize === 'small' ? <Maximize2 className="w-3 h-3" /> :
                         remotePipSize === 'medium' ? <Maximize2 className="w-4 h-4" /> :
                         <Minimize2 className="w-4 h-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {remotePipSize === 'small' ? 'Phóng to' :
                       remotePipSize === 'medium' ? 'Phóng to thêm' : 'Thu nhỏ'}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setRemotePipVisible(false)}
                        size="sm"
                        variant="secondary"
                        className="h-7 w-7 p-0 bg-black/50 hover:bg-black/70"
                      >
                        <EyeOff className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Ẩn video người khác</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </Draggable>
          )}

          {/* Show Hidden Video Buttons */}
          <div className="absolute bottom-32 right-4 z-40 flex flex-col gap-2">
            {!localPipVisible && (
              <Button
                onClick={() => setLocalPipVisible(true)}
                variant="outline"
                size="sm"
                className="bg-blue-500/90 hover:bg-blue-600 border-blue-400 text-white"
              >
                <Eye className="w-4 h-4 mr-2" />
                Hiện video của tôi
              </Button>
            )}
            {!remotePipVisible && (
              <Button
                onClick={() => setRemotePipVisible(true)}
                variant="outline"
                size="sm"
                className="bg-green-500/90 hover:bg-green-600 border-green-400 text-white"
              >
                <Eye className="w-4 h-4 mr-2" />
                Hiện video {role === 'tutor' ? 'học viên' : 'giáo viên'}
              </Button>
            )}
          </div>

            {/* Remote camera/mic off indicators - REMOVED (now in PiP) */}
            {connectionStats.connected && false && (
              <>
                {!remoteVideoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center">
                      <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                        <User className="w-16 h-16 text-gray-400" />
                      </div>
                      <p className="text-white text-lg">Camera đã tắt</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Hand Raise Indicator */}
            {remoteHandRaised && connectionStats.connected && (
              <div className="absolute top-4 right-4 z-20 bg-yellow-500 text-white p-3 rounded-full shadow-lg animate-bounce">
                <Hand className="w-8 h-8" />
              </div>
            )}

            {/* Remote Muted Badges */}
            {connectionStats.connected && (
              <div className="absolute top-4 left-4 z-20 flex gap-2">
                {!remoteVideoEnabled && (
                  <Badge className="bg-red-500/90 text-white px-3 py-1">
                    <VideoOff className="w-3 h-3 mr-1" /> Camera tắt
                  </Badge>
                )}
                {!remoteAudioEnabled && (
                  <Badge className="bg-red-500/90 text-white px-3 py-1">
                    <MicOff className="w-3 h-3 mr-1" /> Mic tắt
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video Call Toolbar */}
      <VideoCallToolbar
        isVideoEnabled={media.isVideoEnabled}
        isAudioEnabled={media.isAudioEnabled}
        onToggleVideo={handleToggleVideo}
        onToggleAudio={handleToggleAudio}
        isScreenSharing={screenShare.isSharing}
        onToggleScreenShare={handleToggleScreenShare}
        showChat={showChat}
        showWhiteboard={showWhiteboard}
        showVbgPanel={showVbgPanel}
        onToggleChat={() => setShowChat(!showChat)}
        onToggleWhiteboard={() => setShowWhiteboard(!showWhiteboard)}
        onToggleVbgPanel={() => setShowVbgPanel(!showVbgPanel)}
        onFilePick={handleFilePick}
        vbgEnabled={vbg.enabled}
        handRaised={handRaised}
        onToggleHandRaise={toggleHandRaise}
        isRecording={recording.isRecording}
        onToggleRecording={() => recording.toggleRecording(media.localStream!)}
        showDebugStats={showDebugStats}
        onToggleDebugStats={() => setShowDebugStats(!showDebugStats)}
        onEndCall={endCall}
      />

      {/* Chat Panel */}
      <ChatPanel
        show={showChat}
        onClose={() => setShowChat(false)}
        messages={chat.messages.map((msg) => ({
          text: msg.message,
          fromMe: msg.fromMe,
          sender: msg.userName,
          timestamp: Date.now(),
        }))}
        onSendMessage={(message) => chat.sendMessage(message)}
        userDisplayName={userDisplayName}
      />

      {/* Whiteboard Panel */}
      <WhiteboardPanel
        show={showWhiteboard}
        onClose={() => setShowWhiteboard(false)}
        onClearCanvas={whiteboard.clearCanvas}
        canvasRef={whiteboardCanvasRef}
      />

      <VirtualBackgroundPanel
        show={showVbgPanel}
        onClose={() => setShowVbgPanel(false)}
        vbgEnabled={vbg.enabled}
        vbgMode={vbg.mode}
        blurAmount={vbg.blurAmount}
        activePreset={activePreset}
        selectedCategory={selectedCategory}
        onSetCategory={setSelectedCategory}
        onVbgNone={handleVbgNone}
        onVbgBlur={handleVbgBlur}
        onVbgImage={handleVbgImage}
        onSetActivePreset={setActivePreset}
        onUpdateBlurAmount={(amount) =>
          localVideoRef.current && vbg.updateBlurAmount(amount, localVideoRef.current)
        }
        localVideoRef={localVideoRef}
      />

      {/* File Transfer Panel */}
      <FileTransferPanel
        show={showFileTransfer}
        incomingFile={fileTransfer.incomingFile}
        outgoingFile={fileTransfer.outgoingFile}
        isMinimized={isFileTransferMinimized}
        onToggleMinimize={() => setIsFileTransferMinimized(!isFileTransferMinimized)}
        onAcceptFile={fileTransfer.acceptFile}
        onRejectFile={fileTransfer.rejectFile}
        onCancelTransfer={() => setShowFileTransfer(false)}
        onClose={() => setShowFileTransfer(false)}
      />

      {/* Debug Stats Panel */}
      <DebugStatsPanel
        show={showDebugStats}
        onClose={() => setShowDebugStats(false)}
        connectionStats={connectionStats}
        isRecording={recording.isRecording}
      />

      </div>
    </TooltipProvider>
  );
}
