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
import { useConnectionEstablishment } from './videolify/hooks/useConnectionEstablishment';
import type { VideolifyFullProps } from './videolify/types';
import { addLocalTracksToPC, recreatePeerConnection } from '@/utils/webrtc-helpers';

import Draggable from 'react-draggable';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { User, VideoOff, MicOff, Eye, Hand } from 'lucide-react';

// UI Components
import { VirtualBackgroundPanel } from './videolify/ui/VirtualBackgroundPanel';
import { ChatPanel } from './videolify/ui/ChatPanel';
import { WhiteboardPanel } from './videolify/ui/WhiteboardPanel';
import { VideoCallToolbar } from './videolify/ui/VideoCallToolbar';
import { FileTransferPanel } from './videolify/ui/FileTransferPanel';
import { DebugStatsPanel } from './videolify/ui/DebugStatsPanel';
import { CameraOffOverlay } from './videolify/ui/CameraOffOverlay';
import { NameBadge } from './videolify/ui/NameBadge';
import { PiPControlBar } from './videolify/ui/PiPControlBar';

// ✅ CRITICAL: Global initialization tracker to prevent StrictMode double-init
// MUST be outside component so it persists across component remounts
const initializedRooms = new Map<string, {
  initialized: boolean;
  timestamp: number;
  completed: boolean; // Track if async initialization completed
}>();


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
  const [chatInput, setChatInput] = useState('');

  // Call State
  const [handRaised, setHandRaised] = useState(false);
  const [remoteHandRaised, setRemoteHandRaised] = useState(false);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [remoteScreenStream, setRemoteScreenStream] = useState<MediaStream | null>(null);
  const remoteCameraStreamRef = useRef<MediaStream | null>(null);
  const [remoteUserName, setRemoteUserName] = useState<string>('');
  const [remoteVideoHasFrames, setRemoteVideoHasFrames] = useState(false);
  const [localVideoHasFrames, setLocalVideoHasFrames] = useState(false);
  // Speaking detection disabled
  const isLocalSpeaking = false;
  const isRemoteSpeaking = false;

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
      console.log('[VideolifyFull_v2] 🎬 Remote track received:', event.track.kind, 'streamId:', event.streams[0]?.id);
      const stream = event.streams[0];

      if (!stream) {
        console.warn('[VideolifyFull_v2] ⚠️ No stream in track event!');
        return;
      }

      // Wait a bit for all tracks to be added to stream
      setTimeout(() => {
        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();

        // Get track settings to check for screen share
        const trackSettings = event.track.kind === 'video' ? (event.track as MediaStreamTrack).getSettings() : {};

        console.log('[VideolifyFull_v2] 📊 Stream analysis:', {
          streamId: stream.id,
          trackKind: event.track.kind,
          trackLabel: event.track.label,
          trackSettings: trackSettings,
          videoTracks: videoTracks.length,
          audioTracks: audioTracks.length,
          totalTracks: stream.getTracks().length
        });

        // ✅ Detect screen share using multiple methods (in priority order):
        // 1. Check track label (contains "screen", "window", etc.)
        // 2. Check displaySurface setting (exists only for screen share)
        // 3. Fallback: video-only stream (no audio)
        const trackLabel = event.track.label.toLowerCase();
        const hasScreenLabel = trackLabel.includes('screen') ||
                               trackLabel.includes('window') ||
                               trackLabel.includes('monitor') ||
                               trackLabel.includes('display');
        const hasDisplaySurface = 'displaySurface' in trackSettings;
        const isVideoOnly = event.track.kind === 'video' && videoTracks.length > 0 && audioTracks.length === 0;

        const isScreenShare = hasScreenLabel || hasDisplaySurface || isVideoOnly;

        console.log('[VideolifyFull_v2] 🔍 Screen share detection:', {
          hasScreenLabel,
          hasDisplaySurface,
          isVideoOnly,
          finalDecision: isScreenShare
        });

        if (isScreenShare) {
          console.log('[VideolifyFull_v2] 📺 SCREEN SHARE detected - setting to main area');
          setRemoteScreenStream(stream);

          // Listen for track ended to clear screen share
          event.track.onended = () => {
            console.log('[VideolifyFull_v2] Screen share track ended - clearing display');
            setRemoteScreenStream(null);
          };
        } else {
          console.log('[VideolifyFull_v2] 🎥 CAMERA stream detected - setting to camera frame');
          remoteCameraStreamRef.current = stream;

          if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== stream) {
            console.log('[VideolifyFull_v2] 🎥 Setting remote video srcObject to stream:', stream.id);
            remoteVideoRef.current.srcObject = stream;
          }

          // Listen for track ended
          event.track.onended = () => {
            console.log('[VideolifyFull_v2] ⚠️ Camera track ended:', event.track.kind);
          };
        }
      }, 100); // Wait 100ms for all tracks to be added
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

  // ✅ Setup control channel handler (must be defined before connection hook)
  const setupControlChannel = useCallback((channel: RTCDataChannel) => {
    console.log('[VideolifyFull_v2] 📡 Setting up control channel, state:', channel.readyState);
    controlChannelRef.current = channel;

    channel.onopen = () => {
      console.log('[VideolifyFull_v2] ✅ Control channel OPEN');
    };

    channel.onclose = () => {
      console.log('[VideolifyFull_v2] ⚠️ Control channel CLOSED');
    };

    channel.onerror = (error) => {
      console.error('[VideolifyFull_v2] ❌ Control channel ERROR:', error);
    };

    channel.onmessage = (e) => {
      const control = JSON.parse(e.data);
      console.log('[VideolifyFull_v2] 📨 Control message received:', control);

      if (control.type === 'hand-raise') {
        setRemoteHandRaised(control.raised);
        if (control.userName) setRemoteUserName(control.userName);
      }
      else if (control.type === 'video-toggle') setRemoteVideoEnabled(control.enabled);
      else if (control.type === 'audio-toggle') setRemoteAudioEnabled(control.enabled);
      else if (control.type === 'screen-share-toggle') {
        console.log('[VideolifyFull_v2] Screen share toggle received:', control.isSharing);
        // Clear remote screen stream when peer stops sharing
        if (!control.isSharing) {
          console.log('[VideolifyFull_v2] ✅ CLEARING remote screen stream');
          setRemoteScreenStream(null);
        }
      }
    };
  }, []);

  // ✅ Connection establishment hook - centralized logic for all connection scenarios
  const connection = useConnectionEstablishment({
    webrtc,
    media,
    remotePeerIdRef,
    onDataChannelsCreated: useCallback((channels: {
      chat: RTCDataChannel | null;
      whiteboard: RTCDataChannel | null;
      control: RTCDataChannel | null;
      file: RTCDataChannel | null;
    }) => {
      console.log('[VideolifyFull_v2] Data channels created by hook - setting up handlers');
      if (channels.chat) chat.setupChannel(channels.chat);
      if (channels.whiteboard) whiteboard.setupChannel(channels.whiteboard);
      if (channels.control) setupControlChannel(channels.control);
      if (channels.file) fileTransfer.setupChannel(channels.file);
    }, [chat, whiteboard, fileTransfer]),
  });

  const screenShare = useScreenShare(
    webrtc.peerConnection,
    async () => {
      // ✅ CRITICAL: Handle screen share stopped (by browser button or programmatically)
      console.log('[VideolifyFull_v2] Screen share stopped - notifying peer');
      
      // Wait for track removal
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Renegotiate
      if (webrtc.peerConnection && remotePeerIdRef.current) {
        console.log('[VideolifyFull_v2] Creating new offer after screen share stopped');
        const offer = await webrtc.createOffer();
        if (offer) {
          await signaling.sendOffer(offer, remotePeerIdRef.current);
        }
      }
      
      // Send control message to peer
      console.log('[VideolifyFull_v2] Sending screen-share-toggle: false');
      sendControl('screen-share-toggle', { isSharing: false });
    }
  );

  const signaling = useSignaling({
    roomId,
    peerId,
    accessToken,
    userName: userDisplayName,
    role,
    callbacks: {
      onPeerJoined: async (event) => {
        console.log('[VideolifyFull_v2] 🔔 Peer joined:', event.peerId, 'shouldInitiate:', event.shouldInitiate);

        // ✅ Use centralized connection establishment hook
        const offer = await connection.establishConnection(
          event.peerId,
          event.shouldInitiate,
          'peer-joined'
        );

        // ✅ Send offer if we're the initiator
        if (offer) {
          console.log('[VideolifyFull_v2] ✅ Offer created by hook, sending to peer:', event.peerId);
          await signaling.sendOffer(offer, event.peerId);
        } else if (event.shouldInitiate) {
          console.error('[VideolifyFull_v2] ❌ Failed to create offer - hook returned null');
        } else {
          console.log('[VideolifyFull_v2] 📥 Not initiator - waiting for offer');
        }
      },
      onOffer: async (event) => {
        console.log('[VideolifyFull_v2] 📥 Offer received from:', event.fromPeerId);

        // ✅ Use hook to ensure PeerConnection exists with tracks
        connection.ensurePeerConnection(event.fromPeerId, 'onOffer');

        console.log('[VideolifyFull_v2] Processing offer and creating answer...');
        const answer = await webrtc.handleOffer(event.offer, event.fromPeerId);
        if (answer) {
          console.log('[VideolifyFull_v2] ✅ Answer created, sending to peer:', event.fromPeerId);
          await signaling.sendAnswer(answer, event.fromPeerId);
        } else {
          console.error('[VideolifyFull_v2] ❌ Failed to create answer!');
        }
      },
      onAnswer: async (event) => {
        console.log('[VideolifyFull_v2] 📨 Answer received from:', event.fromPeerId);
        await webrtc.handleAnswer(event.answer);
        console.log('[VideolifyFull_v2] ✅ Answer processed');
      },
      onIceCandidate: async (event) => {
        console.log('[VideolifyFull_v2] 🧊 ICE candidate received from:', event.fromPeerId);
        await webrtc.addIceCandidate(event.candidate);
      },
      onVbgSettings: async (event) => {
        if (remoteVideoRef.current && media.localStream) {
          await vbg.applyRemoteVirtualBackground(media.localStream, remoteVideoRef.current, event);
        }
      },
      onPeerLeft: (event) => {
        console.log('[VideolifyFull_v2] Peer left:', event.peerId);

        // ✅ CRITICAL FIX: Reset connection if this was our connected peer
        if (remotePeerIdRef.current === event.peerId) {
          console.log('[VideolifyFull_v2] 🔴 Connected peer left - resetting connection state');

          // Close existing connection
          webrtc.close();

          // Reset remote peer ref to allow new connection
          remotePeerIdRef.current = null;

          // Reset remote streams
          remoteCameraStreamRef.current = null;
          setRemoteScreenStream(null);

          // Clear remote video
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }

          // Show toast only if we were actually connected
          if (connectionStats.connected) {
            toast({ title: 'Người khác đã rời phòng - chờ kết nối lại...', variant: 'default' });
          }

          console.log('[VideolifyFull_v2] ✅ Connection reset complete - ready for new peer-joined');
        } else {
          console.log('[VideolifyFull_v2] Ignoring peer-left for non-connected peer:', event.peerId);
        }
      },
    },
  });

  const sendControl = useCallback((type: string, data: any) => {
    if (controlChannelRef.current?.readyState === 'open') {
      const message = JSON.stringify({ type, ...data });
      console.log('[VideolifyFull_v2] Sending control message:', message);
      controlChannelRef.current.send(message);
    } else {
      console.warn('[VideolifyFull_v2] Cannot send control - DataChannel not open:', controlChannelRef.current?.readyState);
    }
  }, []);

  useEffect(() => {
    // ✅ CRITICAL FIX: Use ROOM-BASED key (NOT peerId) to prevent StrictMode double-init
    // roomKey based on roomId + userId only (peerId changes every mount!)
    const roomKey = `${roomId}`;
    const now = Date.now();

    console.log('[VideolifyFull_v2] 🚀 Component mounting - roomKey:', roomKey);

    // ✅ CRITICAL: Check if already initialized recently (StrictMode remount)
    const existing = initializedRooms.get(roomKey);
    if (existing && (now - existing.timestamp) < 2000) {
      const timeSinceInit = now - existing.timestamp;
      console.log('[VideolifyFull_v2] ⚠️ Already initialized', timeSinceInit, 'ms ago');

      // ✅ CRITICAL: Only skip if initialization COMPLETED
      if (existing.completed) {
        console.log('[VideolifyFull_v2] ⚠️ SKIPPING initialization (StrictMode remount + completed)');
        console.log('[VideolifyFull_v2] 📊 Debug info:', {
          roomKey,
          timeSinceInit,
          peerId,
          completed: existing.completed,
          existingTimestamp: new Date(existing.timestamp).toISOString(),
          currentTimestamp: new Date(now).toISOString()
        });

        // Return cleanup that does nothing
        return () => {
          console.log('[VideolifyFull_v2] Cleanup for skipped mount - no action needed');
        };
      } else {
        console.log('[VideolifyFull_v2] ⚠️ Initialization in progress - allowing mount 2 to complete it');
        // ✅ CRITICAL: Clear handled peers to allow fresh peer-joined events
        signaling.clearHandledPeers();
      }
    }

    // Mark as initialized (for StrictMode detection in cleanup)
    initializedRooms.set(roomKey, { initialized: true, timestamp: now, completed: false });
    console.log('[VideolifyFull_v2] ✅ First mount - proceeding with initialization at', new Date(now).toISOString());

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
      console.log('[VideolifyFull_v2] Time:', new Date().toISOString());

      try {
        await signaling.connect();
        console.log('[VideolifyFull_v2] ✅ SSE connected successfully!');
        console.log('[VideolifyFull_v2] Time:', new Date().toISOString());
      } catch (err) {
        console.error('[VideolifyFull_v2] ❌ SSE connection failed:', err);
        console.error('[VideolifyFull_v2] This is a CRITICAL error - cannot proceed without signaling');
        toast({
          title: 'Lỗi kết nối',
          description: 'Không thể kết nối đến server. Vui lòng tải lại trang.',
          variant: 'destructive',
        });
        return; // Stop initialization
      }

      console.log('[VideolifyFull_v2] Now joining room...');
      try {
        const joinResponse = await signaling.joinRoom();
        console.log('[VideolifyFull_v2] ✅ Joined room successfully!');
        console.log('[VideolifyFull_v2] Existing peers:', joinResponse.peers || []);
        console.log('[VideolifyFull_v2] Time:', new Date().toISOString());

        // ✅ Mark initialization as completed
        const current = initializedRooms.get(roomKey);
        if (current) {
          initializedRooms.set(roomKey, { ...current, completed: true });
          console.log('[VideolifyFull_v2] ✅ Initialization completed and marked');
        }
      } catch (err) {
        console.error('[VideolifyFull_v2] ❌ Join room failed:', err);
        toast({
          title: 'Lỗi tham gia phòng',
          description: 'Không thể tham gia phòng học. Vui lòng thử lại.',
          variant: 'destructive',
        });
      }
    })();

    return () => {
      console.log('[VideolifyFull_v2] Cleanup triggered - checking if StrictMode or real unmount');

      // Remove event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // ✅ CRITICAL: Check if this is StrictMode (flag exists and recent)
      const existing = initializedRooms.get(roomKey);
      const isStrictMode = existing && (Date.now() - existing.timestamp) < 2000;

      if (isStrictMode) {
        console.log('[VideolifyFull_v2] ⚠️ StrictMode cleanup detected - NOT disconnecting');
        // Don't disconnect - StrictMode will remount immediately
        return;
      }

      console.log('[VideolifyFull_v2] 🔴 REAL unmount - cleaning up connections');

      // Cleanup connections
      signaling.disconnect();
      webrtc.close();
      vbg.destroy();

      // Clear initialization flag
      initializedRooms.delete(roomKey);
      console.log('[VideolifyFull_v2] Initialization flag cleared');
    };
  }, [roomId, peerId]);

  // ✅ Monitor remote video element for frames
  useEffect(() => {
    const videoElement = remoteVideoRef.current;
    if (!videoElement) return;

    let frameCheckInterval: number | null = null;

    const checkVideoFrames = () => {
      if (!videoElement.srcObject) {
        setRemoteVideoHasFrames(false);
        return;
      }

      const stream = videoElement.srcObject as MediaStream;
      const videoTracks = stream.getVideoTracks();

      if (videoTracks.length === 0) {
        setRemoteVideoHasFrames(false);
        return;
      }

      const videoTrack = videoTracks[0];

      // Check if track is live and enabled
      const isLive = videoTrack.readyState === 'live';
      const isEnabled = videoTrack.enabled;

      // Check if video element has actual video frames
      const hasVideoData = videoElement.videoWidth > 0 && videoElement.videoHeight > 0;

      const hasFrames = isLive && isEnabled && hasVideoData;
      setRemoteVideoHasFrames(hasFrames);

      console.log('[VideolifyFull_v2] 🎥 Remote video frame check:', {
        isLive,
        isEnabled,
        hasVideoData,
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
        hasFrames
      });
    };

    // Check frames every 500ms
    frameCheckInterval = window.setInterval(checkVideoFrames, 500);

    // Also check on certain video events
    videoElement.addEventListener('loadedmetadata', checkVideoFrames);
    videoElement.addEventListener('playing', checkVideoFrames);
    videoElement.addEventListener('emptied', () => setRemoteVideoHasFrames(false));

    // Initial check
    checkVideoFrames();

    return () => {
      if (frameCheckInterval) clearInterval(frameCheckInterval);
      videoElement.removeEventListener('loadedmetadata', checkVideoFrames);
      videoElement.removeEventListener('playing', checkVideoFrames);
      videoElement.removeEventListener('emptied', () => setRemoteVideoHasFrames(false));
    };
  }, []);

  // ✅ Monitor local video element for frames
  useEffect(() => {
    const videoElement = localVideoRef.current;
    if (!videoElement) return;

    let frameCheckInterval: number | null = null;

    const checkVideoFrames = () => {
      if (!videoElement.srcObject) {
        setLocalVideoHasFrames(false);
        return;
      }

      const stream = videoElement.srcObject as MediaStream;
      const videoTracks = stream.getVideoTracks();

      if (videoTracks.length === 0) {
        setLocalVideoHasFrames(false);
        return;
      }

      const videoTrack = videoTracks[0];
      const isLive = videoTrack.readyState === 'live';
      const isEnabled = videoTrack.enabled;
      const hasVideoData = videoElement.videoWidth > 0 && videoElement.videoHeight > 0;

      const hasFrames = isLive && isEnabled && hasVideoData;
      setLocalVideoHasFrames(hasFrames);
    };

    // Check frames every 500ms
    frameCheckInterval = window.setInterval(checkVideoFrames, 500);

    videoElement.addEventListener('loadedmetadata', checkVideoFrames);
    videoElement.addEventListener('playing', checkVideoFrames);
    videoElement.addEventListener('emptied', () => setLocalVideoHasFrames(false));

    // Initial check
    checkVideoFrames();

    return () => {
      if (frameCheckInterval) clearInterval(frameCheckInterval);
      videoElement.removeEventListener('loadedmetadata', checkVideoFrames);
      videoElement.removeEventListener('playing', checkVideoFrames);
      videoElement.removeEventListener('emptied', () => setLocalVideoHasFrames(false));
    };
  }, []);

  // ✅ Ensure local video srcObject is set when PiP becomes visible
  useEffect(() => {
    if (localPipVisible && localVideoRef.current && media.localStream) {
      if (localVideoRef.current.srcObject !== media.localStream) {
        localVideoRef.current.srcObject = media.localStream;
        console.log('[VideolifyFull_v2] Restored local video srcObject');
      }
    }
  }, [localPipVisible, media.localStream]);

  // ✅ Ensure remote video srcObject is set when PiP becomes visible
  useEffect(() => {
    if (remotePipVisible && remoteVideoRef.current && remoteCameraStreamRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteCameraStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteCameraStreamRef.current;
        console.log('[VideolifyFull_v2] Restored remote video srcObject');
      }
    }
  }, [remotePipVisible]);

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

  const handleToggleScreenShare = useCallback(async () => {
    if (screenShare.isSharing) {
      // Stopping - onStopped callback will handle notification
      await screenShare.stopSharing();
    } else {
      // Starting screen share
      await screenShare.startSharing();
      
      // Wait for track to be added
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Renegotiate
      if (webrtc.peerConnection && remotePeerIdRef.current) {
        console.log('[VideolifyFull_v2] Screen share started - creating new offer');
        const offer = await webrtc.createOffer();
        if (offer) {
          console.log('[VideolifyFull_v2] Sending offer to peer:', remotePeerIdRef.current);
          await signaling.sendOffer(offer, remotePeerIdRef.current);
        }
      }
      
      // Send control message
      console.log('[VideolifyFull_v2] Sending screen-share-toggle: true');
      sendControl('screen-share-toggle', { isSharing: true });
    }
  }, [screenShare, webrtc, signaling, sendControl]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    chat.sendMessage(chatInput);
    setChatInput('');
  };

  const toggleHandRaise = () => {
    const newState = !handRaised;
    setHandRaised(newState);
    sendControl('hand-raise', { raised: newState, userName: userDisplayName });
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
        <div className="flex-1 flex overflow-hidden">
          {/* Video Area - Full height */}
          <div className="flex-1 relative bg-gray-800">
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
            <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
              {/* Local Screen Share Video (when I'm sharing) */}
              {screenShare.isSharing && screenShare.screenStream && (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-950 to-slate-900">
                  <video
                    ref={(el) => {
                      if (el && screenShare.screenStream) {
                        el.srcObject = screenShare.screenStream;
                      }
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain drop-shadow-2xl"
                    style={{ maxHeight: '100%', maxWidth: '100%' }}
                  />
                </div>
              )}

              {/* Remote Screen Share Video (when peer is sharing) */}
              {!screenShare.isSharing && remoteScreenStream && (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-950 to-slate-900">
                  <video
                    ref={(el) => {
                      if (el && remoteScreenStream) {
                        el.srcObject = remoteScreenStream;
                      }
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain drop-shadow-2xl"
                    style={{ maxHeight: '100%', maxWidth: '100%' }}
                  />
                </div>
              )}

              {/* Welcome Screen with Logo (when not sharing) */}
              {!screenShare.isSharing && !remoteScreenStream && !showWhiteboard && (
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

          {/* Local Video PiP - Draggable - Smaller and positioned for horizontal layout */}
          {localPipVisible && (
            <Draggable bounds="parent" handle=".drag-handle" defaultPosition={{ x: 0, y: 0 }}>
              <div className={`absolute top-3 right-3 z-30 group ${
                localPipSize === 'small' ? 'w-32 h-24' :
                localPipSize === 'medium' ? 'w-48 h-36' :
                'w-64 h-48'
              }`}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover rounded-lg shadow-lg cursor-move drag-handle transition-all duration-200 ${
                    isLocalSpeaking
                      ? 'border-[3px] border-blue-400 shadow-blue-400/50'
                      : 'border-2 border-blue-500/50'
                  } ${media.isVideoEnabled && localVideoHasFrames ? 'block' : 'hidden'}`}
                />

                {/* Camera Off Overlay - Show when: video disabled or no video frames (blocked/permission denied) */}
                {(!media.isVideoEnabled || !localVideoHasFrames) && (
                  <div className="border-2 border-blue-500 shadow-lg cursor-move drag-handle rounded-lg">
                    <CameraOffOverlay pipSize={localPipSize} />
                  </div>
                )}

                {/* Mic Muted Indicator - Local */}
                {!media.isAudioEnabled && (
                  <div className="absolute top-2 left-2 bg-red-500/90 text-white p-1.5 rounded-full flex items-center justify-center">
                    <MicOff className="w-4 h-4" />
                  </div>
                )}

                {/* PiP Controls - Show on hover */}
                <PiPControlBar
                  pipSize={localPipSize}
                  onResize={toggleLocalPipSize}
                  onHide={() => setLocalPipVisible(false)}
                />
              </div>
            </Draggable>
          )}

          {/* Remote Video PiP - Positioned to the left of Local Video (horizontal layout) */}
          {remotePipVisible && (
            <Draggable bounds="parent" handle=".drag-handle-remote" defaultPosition={{ x: -210, y: 0 }}>
              <div className={`absolute top-3 right-3 z-30 group ${
                remotePipSize === 'small' ? 'w-32 h-24' :
                remotePipSize === 'medium' ? 'w-48 h-36' :
                'w-64 h-48'
              }`}>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover rounded-lg shadow-lg cursor-move drag-handle-remote transition-all duration-200 ${
                    isRemoteSpeaking
                      ? 'border-[3px] border-green-400 shadow-green-400/50'
                      : 'border-2 border-green-500/50'
                  } ${connectionStats.connected && remoteVideoEnabled && remoteVideoHasFrames ? 'block' : 'hidden'}`}
                />

                {/* Camera Off Overlay - Show when: not connected, video disabled, or no video frames */}
                {(!connectionStats.connected || !remoteVideoEnabled || !remoteVideoHasFrames) && (
                  <div className="border-2 border-green-500 shadow-lg cursor-move drag-handle-remote rounded-lg">
                    <CameraOffOverlay pipSize={remotePipSize} />
                  </div>
                )}

                {/* Mic Muted Indicator */}
                {connectionStats.connected && !remoteAudioEnabled && (
                  <div className="absolute top-2 left-2 bg-red-500/90 text-white p-1.5 rounded-full flex items-center justify-center">
                    <MicOff className="w-4 h-4" />
                  </div>
                )}

                {/* PiP Controls - Show on hover */}
                <PiPControlBar
                  pipSize={remotePipSize}
                  onResize={toggleRemotePipSize}
                  onHide={() => setRemotePipVisible(false)}
                />
              </div>
            </Draggable>
          )}

          {/* Show Hidden Video Buttons - Compact, bottom-right corner */}
          <div className="absolute bottom-4 right-4 z-40 flex gap-2">
            {!localPipVisible && (
              <Button
                onClick={() => setLocalPipVisible(true)}
                variant="outline"
                size="icon"
                className="bg-blue-500/90 hover:bg-blue-600 border-blue-400 text-white w-10 h-10"
                title="Hiện video của tôi"
              >
                <Eye className="w-5 h-5" />
              </Button>
            )}
            {!remotePipVisible && (
              <Button
                onClick={() => setRemotePipVisible(true)}
                variant="outline"
                size="icon"
                className="bg-green-500/90 hover:bg-green-600 border-green-400 text-white w-10 h-10"
                title={`Hiện video ${role === 'tutor' ? 'học viên' : 'giáo viên'}`}
              >
                <Eye className="w-5 h-5" />
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

            {/* Hand Raise Indicator - Centered for visibility */}
            {remoteHandRaised && connectionStats.connected && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-3">
                <div className="bg-yellow-500 text-white p-6 rounded-full shadow-2xl animate-bounce">
                  <Hand className="w-16 h-16" />
                </div>
                <div className="bg-yellow-500/95 text-white px-6 py-3 rounded-full shadow-xl">
                  <p className="text-xl font-bold">{remoteUserName || 'Người dùng'} giơ tay!</p>
                </div>
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
                  <Badge className="bg-red-500/90 text-white px-2 py-1">
                    <MicOff className="w-4 h-4" />
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
