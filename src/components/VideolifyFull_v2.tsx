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
import { useExcalidrawSync } from './videolify/hooks/useExcalidrawSync';
import { useScreenShare } from './videolify/hooks/useScreenShare';
import { useFileTransfer } from './videolify/hooks/useFileTransfer';
import { useVirtualBackground } from './videolify/hooks/useVirtualBackground';
import { useRecording } from './videolify/hooks/useRecording';
import { useScreenRecording } from './videolify/hooks/useScreenRecording';
import { useConnectionEstablishment } from './videolify/hooks/useConnectionEstablishment';
import { useReactions } from './videolify/hooks/useReactions';
import { usePiPPreview } from './videolify/hooks/usePiPPreview';
import type { VideolifyFullProps } from './videolify/types';
import { addLocalTracksToPC, recreatePeerConnection } from '@/utils/webrtc-helpers';
import { loadPrejoinSettings } from '@/lib/prejoinSettings';

import Draggable from 'react-draggable';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { User, VideoOff, MicOff, Eye, Hand, Monitor, Maximize, Minimize, PictureInPicture2, X } from 'lucide-react';

// UI Components
import { VirtualBackgroundPanel } from './videolify/ui/VirtualBackgroundPanel';
import { ChatPanel } from './videolify/ui/ChatPanel';
import { WhiteboardExcalidraw } from './videolify/ui/WhiteboardExcalidraw';
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
  const [isRemoteSharing, setIsRemoteSharing] = useState(false); // Track if remote peer is sharing
  const [whiteboardDrawPermission, setWhiteboardDrawPermission] = useState(false); // For student: whether teacher granted draw permission
  const [studentRequestingDraw, setStudentRequestingDraw] = useState(false); // For teacher: whether student is requesting permission
  
  // ✅ VBG loading state for remote video - show loading while applying VBG for privacy
  const [remoteVbgLoading, setRemoteVbgLoading] = useState(false);
  const pendingRemoteVbgRef = useRef<any>(null); // Store VBG settings received before remote stream ready
  
  // Speaking detection disabled
  const isLocalSpeaking = false;
  const isRemoteSpeaking = false;

  // PiP controls - Separate for local and remote
  const [localPipSize, setLocalPipSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [localPipVisible, setLocalPipVisible] = useState(true);
  const [remotePipSize, setRemotePipSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [remotePipVisible, setRemotePipVisible] = useState(true);

  // Fullscreen state for screen share
  const [isScreenShareFullscreen, setIsScreenShareFullscreen] = useState(false);

  // PiP preview state
  const [pipPreviewManuallyClose, setPipPreviewManuallyClosed] = useState(false);

  // Individual PiP positions to allow separate dragging and avoid overlap
  const [localPos, setLocalPos] = useState({ x: 0, y: 0 });
  const [remotePos, setRemotePos] = useState({ x: 0, y: 160 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const localNodeRef = useRef<HTMLDivElement | null>(null);
  const remoteNodeRef = useRef<HTMLDivElement | null>(null);
  // Dragging flags to temporarily disable CSS transitions while dragging
  const [localDragging, setLocalDragging] = useState(false);
  const [remoteDragging, setRemoteDragging] = useState(false);

  const ensureNoOverlap = useCallback((moved: 'local' | 'remote') => {
    const localEl = localNodeRef.current as HTMLDivElement | null;
    const remoteEl = remoteNodeRef.current as HTMLDivElement | null;
    const containerEl = containerRef.current as HTMLDivElement | null;
    if (!localEl || !remoteEl || !containerEl) return;

    const lRect = localEl.getBoundingClientRect();
    const rRect = remoteEl.getBoundingClientRect();
    const cRect = containerEl.getBoundingClientRect();

    const gap = 20; // px — increased gap requested by user

    const intersects = !(lRect.right < rRect.left || lRect.left > rRect.right || lRect.bottom < rRect.top || lRect.top > rRect.bottom);
    if (!intersects) return;

    if (moved === 'local') {
      // move remote below local
      const desiredTop = lRect.bottom + gap;
      const newY = Math.max(0, Math.round(desiredTop - cRect.top));
      setRemotePos((p) => ({ x: p.x, y: newY }));
    } else {
      // moved remote -> move local above remote
      const desiredTop = rRect.top - gap - lRect.height;
      const newY = Math.max(0, Math.round(desiredTop - cRect.top));
      setLocalPos((p) => ({ x: p.x, y: newY }));
    }
  }, []);

  // File transfer
  const [isFileTransferMinimized, setIsFileTransferMinimized] = useState(false);

  // VBG category filter
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Track when a VBG change is in progress to avoid racey onClose behaviour
  const [vbgChangeInProgress, setVbgChangeInProgress] = useState(false);

  // Track initial VBG state when opening panel
  const [initialVbgEnabled, setInitialVbgEnabled] = useState(false);
  // Track a pending VBG selection so closing panel won't cancel it
  const vbgPendingRef = useRef<{ mode: string; blurAmount?: number; backgroundImage?: string } | null>(null);

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
  const screenShareVideoRef = useRef<HTMLVideoElement>(null); // ✅ Stable ref for local screen share video
  const remoteScreenShareVideoRef = useRef<HTMLVideoElement>(null); // ✅ Stable ref for remote screen share video
  const excalidrawAPIRef = useRef<any>(null);
  const remotePeerIdRef = useRef<string | null>(null);
  const controlChannelRef = useRef<RTCDataChannel | null>(null);
  // Debounce timers to avoid rapid renegotiation from UI actions
  const vbgDebounceRef = useRef<number | null>(null);
  const screenShareDebounceRef = useRef<number | null>(null);

  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);

  const media = useMediaDevices();
  const chat = useChat({
    userName: userDisplayName,
    onNewMessage: (message) => {
      if (!showChat) {
        setUnreadChatCount(prev => prev + 1);
        setLastMessageTime(Date.now());

        // Show toast notification
        toast({
          title: `💬 ${message.userName}`,
          description: message.message.substring(0, 100),
          duration: 3000,
        });
      }
    },
  });
  const excalidrawSync = useExcalidrawSync(roomId, role);
  const fileTransfer = useFileTransfer();
  // Auto-open file transfer panel when an incoming or outgoing transfer exists
  useEffect(() => {
    if (fileTransfer.incomingFile) {
      console.log('[VideolifyFull_v2] Incoming file offer detected - opening FileTransfer panel');
      setShowFileTransfer(true);
    } else if (fileTransfer.outgoingFile) {
      // Show outgoing transfers as well
      setShowFileTransfer(true);
    }
  }, [fileTransfer.incomingFile, fileTransfer.outgoingFile]);
  const vbg = useVirtualBackground();
  const recording = useRecording();
  const screenRecording = useScreenRecording();
  const reactions = useReactions(userDisplayName);
  const pipPreview = usePiPPreview();

  const webrtc = useWebRTC({
    peerId,
    onTrack: (event) => {
      console.log('[VideolifyFull_v2] 🎬 Remote track received:', event.track.kind, 'streamId:', event.streams[0]?.id);
      const stream = event.streams[0];

      if (!stream) {
        console.warn('[VideolifyFull_v2] ⚠️ No stream in track event!');
        return;
      }

      // ✅ Detect screen share by checking if stream has ONLY video track (no audio)
      // We need to wait a bit for all tracks to be added to the stream
      setTimeout(async () => {
        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();

        console.log('[VideolifyFull_v2] Stream analysis:', {
          streamId: stream.id,
          videoTracks: videoTracks.length,
          audioTracks: audioTracks.length,
          totalTracks: stream.getTracks().length
        });

        // Screen share = video only (1 video track, 0 audio tracks)
        // Camera = video + audio (1 video + 1 audio track)
        if (videoTracks.length === 1 && audioTracks.length === 0) {
          console.log('[VideolifyFull_v2] 📺 SCREEN SHARE detected from remote peer');
          setRemoteScreenStream(stream);
          setIsRemoteSharing(true); // Mark remote as sharing

          // ✅ CRITICAL: Listen for track ended to clear screen share
          event.track.onended = () => {
            console.log('[VideolifyFull_v2] Screen share track ended - clearing display');
            setRemoteScreenStream(null);
            setIsRemoteSharing(false); // Remote stopped sharing
          };
        } else if (videoTracks.length > 0 || audioTracks.length > 0) {
          console.log('[VideolifyFull_v2] 🎥 CAMERA stream detected');
          remoteCameraStreamRef.current = stream;
          
          // ✅ PRIVACY: Check for pending VBG settings and apply BEFORE showing video
          if (pendingRemoteVbgRef.current) {
            console.log('[VideolifyFull_v2] 🎨 Applying pending VBG settings before showing remote video');
            setRemoteVbgLoading(true);
            try {
              await vbg.applyRemoteVirtualBackground(stream, remoteVideoRef.current!, pendingRemoteVbgRef.current);
              console.log('[VideolifyFull_v2] ✅ Pending VBG applied successfully');
            } catch (err) {
              console.error('[VideolifyFull_v2] Failed to apply pending VBG:', err);
              // Fall back to showing original stream
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream;
              }
            } finally {
              setRemoteVbgLoading(false);
              pendingRemoteVbgRef.current = null;
            }
          } else {
            // No pending VBG, show original stream
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = stream;
            }
          }
        }
      }, 100);
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
      // Check if this is an ICE restart offer (special case)
      if ((candidate as any)?.type === 'ice-restart') {
        console.log('[VideolifyFull_v2] 🔄 Sending ICE restart offer');
        if (remotePeerIdRef.current) {
          signaling.sendOffer({ type: 'offer', sdp: (candidate as any).sdp }, remotePeerIdRef.current);
        }
        return;
      }
      
      console.log('[VideolifyFull_v2] Sending ICE candidate');
      if (remotePeerIdRef.current) {
        signaling.sendIceCandidate(candidate, remotePeerIdRef.current);
      }
    },
    onDataChannel: (channel) => {
      console.log('[VideolifyFull_v2] Data channel received:', channel.label);
      if (channel.label === 'chat') chat.setupChannel(channel);
      else if (channel.label === 'whiteboard') excalidrawSync.setupChannel(channel);
      else if (channel.label === 'control') setupControlChannel(channel);
      else if (channel.label === 'file') fileTransfer.setupChannel(channel);
    },
  });

  // ✅ Setup control channel handler (must be defined before connection hook)
  const setupControlChannel = useCallback((channel: RTCDataChannel) => {
    console.log('[VideolifyFull_v2] 📡 Setting up control channel, state:', channel.readyState);
    controlChannelRef.current = channel;

    // ✅ Function to broadcast initial settings (VBG + camera/mic state)
    const broadcastInitialStateOnOpen = () => {
      try {
        const stored = localStorage.getItem('videolify_prejoin_settings');
        console.log('[VideolifyFull_v2] 📦 Reading prejoin settings from localStorage:', stored ? 'found' : 'not found');
        
        if (stored) {
          const prejoinSettings = JSON.parse(stored);
          console.log('[VideolifyFull_v2] 📦 Parsed prejoin settings:', { 
            vbgEnabled: prejoinSettings.vbgEnabled, 
            vbgMode: prejoinSettings.vbgMode,
            isCameraEnabled: prejoinSettings.isCameraEnabled,
            isMicEnabled: prejoinSettings.isMicEnabled
          });
          
          // ✅ Broadcast camera/mic state from prejoin settings
          // This ensures peer sees correct initial state when joining
          const cameraEnabled = prejoinSettings.isCameraEnabled !== false; // default true
          const micEnabled = prejoinSettings.isMicEnabled !== false; // default true
          
          console.log('[VideolifyFull_v2] 📡 Broadcasting initial camera/mic state:', { cameraEnabled, micEnabled });
          channel.send(JSON.stringify({ type: 'video-toggle', enabled: cameraEnabled }));
          channel.send(JSON.stringify({ type: 'audio-toggle', enabled: micEnabled }));
          
          // ✅ Broadcast VBG settings if enabled
          if (prejoinSettings.vbgEnabled) {
            const vbgSettings = {
              enabled: true,
              mode: prejoinSettings.vbgMode || 'blur',
              blurAmount: prejoinSettings.vbgBlurAmount || 10,
              backgroundImage: prejoinSettings.vbgBackgroundImage || null
            };
            console.log('[VideolifyFull_v2] 🎨 Broadcasting VBG settings on channel open:', vbgSettings);
            channel.send(JSON.stringify({ type: 'vbg-settings', ...vbgSettings }));
          } else {
            console.log('[VideolifyFull_v2] 📦 VBG not enabled in prejoin settings, not broadcasting');
          }
        }
      } catch (err) {
        console.warn('[VideolifyFull_v2] Failed to send initial settings:', err);
      }
    };

    channel.onopen = () => {
      console.log('[VideolifyFull_v2] ✅ Control channel OPEN (via onopen)');
      broadcastInitialStateOnOpen();
    };

    // ✅ If channel is already open when we set up (answerer case), broadcast immediately
    if (channel.readyState === 'open') {
      console.log('[VideolifyFull_v2] ✅ Control channel already OPEN, broadcasting now');
      broadcastInitialStateOnOpen();
    }

    channel.onclose = () => {
      console.log('[VideolifyFull_v2] ⚠️ Control channel CLOSED');
    };

    channel.onerror = (error) => {
      console.error('[VideolifyFull_v2] ❌ Control channel ERROR:', error);
    };

    // ✅ IMPROVED Heartbeat + control message handling
    // Enhanced liveness detection with adaptive ping intervals and robust reconnect
    const lastPongRef = { current: Date.now() } as { current: number };
    const lastPingRef = { current: Date.now() } as { current: number };
    const recreateInProgressRef = { current: false } as { current: boolean };
    const consecutiveFailuresRef = { current: 0 } as { current: number };
    let heartbeatInterval: number | null = null;
    let livenessCheckInterval: number | null = null;
    let recreateAttempt = 0;
    const MAX_RECREATE_ATTEMPTS = 5;
    const PING_INTERVAL = 2000; // 2s ping interval for faster detection
    const LIVENESS_TIMEOUT = 8000; // 8s without pong = dead
    const LIVENESS_CHECK_INTERVAL = 2000; // Check every 2s

    const startHeartbeat = () => {
      if (heartbeatInterval) return;
      console.log('[VideolifyFull_v2] 💓 Starting heartbeat monitor');
      
      heartbeatInterval = window.setInterval(() => {
        try {
          if (controlChannelRef.current && controlChannelRef.current.readyState === 'open') {
            const now = Date.now();
            controlChannelRef.current.send(JSON.stringify({ type: 'ping', ts: now }));
            lastPingRef.current = now;
          }
        } catch (e) {
          console.warn('[VideolifyFull_v2] Ping send failed:', e);
          consecutiveFailuresRef.current++;
          if (consecutiveFailuresRef.current >= 3) {
            console.warn('[VideolifyFull_v2] Multiple ping failures - triggering reconnect');
            attemptRecreate();
          }
        }
      }, PING_INTERVAL) as unknown as number;

      livenessCheckInterval = window.setInterval(() => {
        const timeSinceLastPong = Date.now() - lastPongRef.current;
        
        // Log heartbeat status periodically
        if (Date.now() % 30000 < LIVENESS_CHECK_INTERVAL) {
          console.log('[VideolifyFull_v2] 💓 Heartbeat status - last pong:', timeSinceLastPong, 'ms ago');
        }
        
        // If no pong within LIVENESS_TIMEOUT, consider peer dead
        if (timeSinceLastPong > LIVENESS_TIMEOUT) {
          console.warn('[VideolifyFull_v2] ⚠️ No pong received in', timeSinceLastPong, 'ms - triggering reconnect');
          attemptRecreate();
        }
      }, LIVENESS_CHECK_INTERVAL) as unknown as number;
    };

    const stopHeartbeat = () => {
      console.log('[VideolifyFull_v2] 💔 Stopping heartbeat monitor');
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      if (livenessCheckInterval) {
        clearInterval(livenessCheckInterval);
        livenessCheckInterval = null;
      }
    };

    const attemptRecreate = async () => {
      if (recreateInProgressRef.current) return;
      if (!remotePeerIdRef.current) return;
      
      // ✅ Check max attempts
      if (recreateAttempt >= MAX_RECREATE_ATTEMPTS) {
        console.error('[VideolifyFull_v2] ❌ Max reconnect attempts reached - giving up');
        stopHeartbeat();
        toast({ title: '⚠️ Mất kết nối với người khác. Hãy thử F5 để kết nối lại.', variant: 'destructive' });
        return;
      }

      recreateInProgressRef.current = true;
      recreateAttempt++;
      consecutiveFailuresRef.current = 0; // Reset failures on reconnect attempt
      const backoff = Math.min(8000, 500 * Math.pow(2, recreateAttempt));
      console.log('[VideolifyFull_v2] 🔄 Attempting reconnect in', backoff, 'ms (attempt', recreateAttempt, '/', MAX_RECREATE_ATTEMPTS, ')');

      setTimeout(async () => {
        try {
          // ✅ First try ICE restart (faster) before full reconnect
          const pc = webrtc.peerConnection;
          if (pc && pc.connectionState !== 'closed' && pc.iceConnectionState !== 'closed') {
            console.log('[VideolifyFull_v2] 🧊 Trying ICE restart first...');
            const restartOffer = await webrtc.restartIce();
            if (restartOffer) {
              try {
                await signaling.sendOffer(restartOffer, remotePeerIdRef.current!);
                console.log('[VideolifyFull_v2] ✅ ICE restart offer sent');
                // Wait and check if connection restored
                await new Promise((res) => setTimeout(res, 3000));
                if (pc.connectionState === 'connected') {
                  console.log('[VideolifyFull_v2] ✅ ICE restart successful!');
                  recreateAttempt = 0;
                  lastPongRef.current = Date.now();
                  recreateInProgressRef.current = false;
                  return;
                }
              } catch (err) {
                console.warn('[VideolifyFull_v2] ICE restart send failed:', err);
              }
            }
          }

          // ✅ Full reconnect if ICE restart failed
          console.log('[VideolifyFull_v2] 🔌 Full reconnect - establishing new connection');
          const offer = await connection.establishConnection(remotePeerIdRef.current!, true, 'reconnect-heartbeat');
          if (offer) {
            console.log('[VideolifyFull_v2] Reconnect offer created, ensuring signaling connected');

            // Ensure signaling is connected before sending offer
            try {
              if (!signaling.isConnected) {
                console.warn('[VideolifyFull_v2] Signaling not connected - attempting reconnect before sending offer');
                await signaling.connect();
              }
            } catch (err) {
              console.error('[VideolifyFull_v2] Signaling reconnect failed, will not send offer:', err);
              return;
            }

            try {
              console.log('[VideolifyFull_v2] Sending reconnect offer to peer');
              await signaling.sendOffer(offer, remotePeerIdRef.current!);

              // Reset counters on success
              recreateAttempt = 0;
              lastPongRef.current = Date.now();
              console.log('[VideolifyFull_v2] ✅ Reconnect offer sent successfully');
            } catch (err) {
              console.error('[VideolifyFull_v2] Failed to send reconnect offer:', err);
            }
          } else {
            console.warn('[VideolifyFull_v2] Reconnect offer creation returned null');
          }
        } catch (err) {
          console.error('[VideolifyFull_v2] Reconnect attempt failed:', err);
        } finally {
          recreateInProgressRef.current = false;
        }
      }, backoff);
    };

    // Start heartbeat when channel opens
    if (channel.readyState === 'open') startHeartbeat();

    channel.onmessage = (e) => {
      let control: any;
      try {
        control = JSON.parse(e.data);
      } catch (err) {
        console.warn('[VideolifyFull_v2] Invalid control message', e.data);
        return;
      }

      // Handle ping/pong first - ✅ IMPROVED: track round-trip time
      if (control.type === 'ping') {
        try {
          channel.send(JSON.stringify({ type: 'pong', ts: control.ts, serverTs: Date.now() }));
        } catch (err) {
          console.warn('[VideolifyFull_v2] Failed to send pong:', err);
        }
        return;
      }

      if (control.type === 'pong') {
        const now = Date.now();
        const rtt = now - control.ts;
        lastPongRef.current = now;
        consecutiveFailuresRef.current = 0; // Reset failures on successful pong
        
        // Log RTT occasionally for debugging
        if (now % 30000 < LIVENESS_CHECK_INTERVAL) {
          console.log('[VideolifyFull_v2] 💓 Pong received, RTT:', rtt, 'ms');
        }
        return;
      }

      console.log('[VideolifyFull_v2] 📨 Control message received:', control);

      if (control.type === 'hand-raise') {
        setRemoteHandRaised(control.raised);
        if (control.userName) setRemoteUserName(control.userName);
      }
      else if (control.type === 'video-toggle') setRemoteVideoEnabled(control.enabled);
      else if (control.type === 'audio-toggle') setRemoteAudioEnabled(control.enabled);
      else if (control.type === 'screen-share-toggle') {
        console.log('[VideolifyFull_v2] Screen share toggle received:', control.isSharing);
        setIsRemoteSharing(control.isSharing); // Update remote sharing state

        // Clear remote screen stream when peer stops sharing
        if (!control.isSharing) {
          console.log('[VideolifyFull_v2] ✅ CLEARING remote screen stream');
          setRemoteScreenStream(null);
        }
      }
      else if (control.type === 'whiteboard-toggle') {
        console.log('[VideolifyFull_v2] Whiteboard toggle received:', control.isOpen);
        // Auto-open whiteboard when peer opens it
        setShowWhiteboard(control.isOpen);
        if (control.isOpen) {
          toast({ title: '📝 Bảng trắng đã được mở bởi người khác' });
        }
      }
      else if (control.type === 'whiteboard-draw-request') {
        console.log('[VideolifyFull_v2] Whiteboard draw permission request from:', control.userName);
        // Show toast to teacher that student is requesting permission
        if (role === 'tutor') {
          setStudentRequestingDraw(true);
          toast({
            title: '✋ Yêu cầu vẽ trên bảng',
            description: `${control.userName} muốn được vẽ trên bảng trắng - Nhấn nút "Đang khóa" để cho phép`,
            duration: 10000, // Longer duration for teacher to see
          });
        }
      }
      else if (control.type === 'whiteboard-permission') {
        console.log('[VideolifyFull_v2] Whiteboard permission received:', control.allowed);
        // Update student's draw permission state
        setWhiteboardDrawPermission(control.allowed);
      }
      else if (control.type === 'reaction') {
        console.log('[VideolifyFull_v2] Reaction received:', control.reactionType, 'from:', control.userName);
        // Add remote reaction
        reactions.addRemoteReaction({
          type: control.reactionType,
          emoji: control.emoji,
          fromMe: false,
          userName: control.userName,
        });
      }
      // ✅ NEW: Handle VBG settings via DataChannel for faster/more reliable delivery
      else if (control.type === 'vbg-settings') {
        console.log('[VideolifyFull_v2] 🎨 VBG settings received via DataChannel:', control);
        handleRemoteVbgSettings(control);
      }
    };

    // Cleanup heartbeat on channel close
    const origOnClose = channel.onclose;
    channel.onclose = (ev) => {
      stopHeartbeat();
      origOnClose && origOnClose(ev as any);
    };
  }, [reactions, role, toast]);

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
      if (channels.whiteboard) excalidrawSync.setupChannel(channels.whiteboard);
      if (channels.control) setupControlChannel(channels.control);
      if (channels.file) fileTransfer.setupChannel(channels.file);
    }, [chat, excalidrawSync, fileTransfer]),
  });

  const screenShare = useScreenShare(
    webrtc.peerConnection,
    async () => {
      // ✅ CRITICAL: Handle screen share stopped (by browser button or programmatically)
      console.log('[VideolifyFull_v2] Screen share stopped - notifying peer');

      // ✅ Send control message IMMEDIATELY to peer (for instant UI clear)
      console.log('[VideolifyFull_v2] Sending screen-share-toggle: false IMMEDIATELY');
      sendControl('screen-share-toggle', { isSharing: false });

      // ✅ Renegotiate immediately to remove track
      if (webrtc.peerConnection && remotePeerIdRef.current) {
        console.log('[VideolifyFull_v2] Creating new offer after screen share stopped');
        const offer = await webrtc.createOffer();
        if (offer) {
          await signaling.sendOffer(offer, remotePeerIdRef.current);
        }
      }
    },
    async () => {
      // ✅ CRITICAL: Renegotiate IMMEDIATELY after adding/removing screen track
      if (webrtc.peerConnection && remotePeerIdRef.current) {
        console.log('[VideolifyFull_v2] 🔄 Renegotiating immediately after screen share track change');
        console.log('[VideolifyFull_v2] PeerConnection state:', webrtc.peerConnection.connectionState);
        console.log('[VideolifyFull_v2] Signaling state:', webrtc.peerConnection.signalingState);

        const offer = await webrtc.createOffer();
        if (offer) {
          console.log('[VideolifyFull_v2] ✅ Offer created, sending to peer:', remotePeerIdRef.current);
          await signaling.sendOffer(offer, remotePeerIdRef.current);
          console.log('[VideolifyFull_v2] ✅ Offer sent successfully');
        } else {
          console.error('[VideolifyFull_v2] ❌ Failed to create offer!');
        }
      } else {
        console.error('[VideolifyFull_v2] ❌ Cannot renegotiate - missing PeerConnection or remotePeerId');
      }
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
        // ✅ Ensure local media is ready before attempting connection
        const waitForLocalStream = async (timeoutMs = 3000) => {
          const start = Date.now();
          while (Date.now() - start < timeoutMs) {
            if (media.localStream && media.localStream.getTracks().length > 0) return true;
            await new Promise((res) => setTimeout(res, 100));
          }
          return false;
        };

        const mediaReady = await waitForLocalStream(3000);
        if (!mediaReady) {
          console.warn('[VideolifyFull_v2] Local media not ready when peer joined - requesting permissions');
          try {
            await media.requestPermissions();
          } catch (err) {
            console.warn('[VideolifyFull_v2] Media permission request failed or was denied');
          }
          // Give a little time for user to accept
          await waitForLocalStream(3000);
        }

        // ✅ Use centralized connection establishment hook with retries
        // Sometimes initial establishConnection may return null due to timing; retry a few times with backoff
        if (!event.shouldInitiate) {
          console.log('[VideolifyFull_v2] 📥 Not initiator - waiting for offer');
          return;
        }

        let offer = null;
        for (let attempt = 0; attempt < 3 && !offer; attempt++) {
          console.log('[VideolifyFull_v2] 🔌 Attempting establishConnection (attempt', attempt + 1, ')');
          offer = await connection.establishConnection(event.peerId, event.shouldInitiate, 'peer-joined');
          if (offer) break;
          const backoff = 200 * Math.pow(2, attempt);
          console.warn('[VideolifyFull_v2] establishConnection returned null, retrying in', backoff, 'ms');
          await new Promise((res) => setTimeout(res, backoff));
        }

        if (offer) {
          console.log('[VideolifyFull_v2] ✅ Offer created by hook, sending to peer:', event.peerId);
          await signaling.sendOffer(offer, event.peerId);
        } else {
          console.error('[VideolifyFull_v2] ❌ Failed to create offer after retries - will wait for further events');
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
        // ✅ Delegate to handleRemoteVbgSettings for consistent handling
        console.log('[VideolifyFull_v2] 🎨 VBG settings received via SSE:', event);
        handleRemoteVbgSettings(event);
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

  // ✅ CRITICAL: Centralized handler for remote VBG settings (from SSE or DataChannel)
  // This ensures VBG is applied BEFORE showing video to protect privacy
  const handleRemoteVbgSettings = useCallback(async (settings: { 
    mode: 'none' | 'blur' | 'image';
    blurAmount?: number;
    backgroundImage?: string;
    enabled?: boolean;
  }) => {
    console.log('[VideolifyFull_v2] 🎨 handleRemoteVbgSettings called:', settings);
    
    // If mode is 'none' or disabled, just show original stream
    if (settings.mode === 'none' || settings.enabled === false) {
      console.log('[VideolifyFull_v2] VBG disabled - showing original stream');
      pendingRemoteVbgRef.current = null;
      if (remoteCameraStreamRef.current && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteCameraStreamRef.current;
      }
      setRemoteVbgLoading(false);
      return;
    }

    // If remote stream not ready yet, store settings for when it arrives
    if (!remoteCameraStreamRef.current || !remoteVideoRef.current) {
      console.log('[VideolifyFull_v2] 📥 Storing VBG settings (remote stream not ready)');
      pendingRemoteVbgRef.current = settings;
      setRemoteVbgLoading(true); // Show loading state
      return;
    }

    // Apply VBG immediately
    setRemoteVbgLoading(true);
    try {
      console.log('[VideolifyFull_v2] 🎨 Applying VBG to remote stream:', settings);
      await vbg.applyRemoteVirtualBackground(remoteCameraStreamRef.current, remoteVideoRef.current, settings);
      console.log('[VideolifyFull_v2] ✅ Remote VBG applied successfully');
      // ✅ Force frames check to true after successful VBG apply
      // The processed stream is valid, just needs time to render first frame
      setRemoteVideoHasFrames(true);
    } catch (err) {
      console.error('[VideolifyFull_v2] Failed to apply remote VBG:', err);
      // Fallback to original stream on error
      if (remoteVideoRef.current && remoteCameraStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteCameraStreamRef.current;
      }
    } finally {
      setRemoteVbgLoading(false);
      pendingRemoteVbgRef.current = null;
    }
  }, [vbg]);

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

      // ✅ CRITICAL: Skip both completed AND in-progress initialization
      // StrictMode will run mount → cleanup → mount within milliseconds
      // We should NOT run init twice regardless of completion status
      console.log('[VideolifyFull_v2] ⚠️ SKIPPING initialization (StrictMode remount)');
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

      // ✅ Load and apply prejoin settings
      const prejoinSettings = loadPrejoinSettings();
      console.log('[VideolifyFull_v2] Prejoin settings:', {
        camera: prejoinSettings.isCameraEnabled,
        mic: prejoinSettings.isMicEnabled,
        vbg: prejoinSettings.vbgEnabled,
      });

      // ✅ Get media stream
      let stream: MediaStream | null = media.localStream;
      if (!stream || stream.getTracks().every(t => t.readyState === 'ended')) {
        try {
          stream = await media.requestPermissions();
          console.log('[VideolifyFull_v2] Media stream ready');
        } catch (err) {
          console.error('[VideolifyFull_v2] Media permission error:', err);
          stream = null;
        }
      }

      // ✅ Apply prejoin settings to tracks AND React state (for toolbar icons)
      if (stream) {
        // Use applyTrackStates to sync both track.enabled AND React state
        media.applyTrackStates(prejoinSettings.isCameraEnabled, prejoinSettings.isMicEnabled);
        console.log('[VideolifyFull_v2] ✅ Prejoin track states applied:', {
          camera: prejoinSettings.isCameraEnabled,
          mic: prejoinSettings.isMicEnabled
        });
      }

      // ✅ Set srcObject - wait for video element if not ready
      if (stream) {
        const setSrcObject = async () => {
          // Wait up to 2 seconds for video element to be ready
          const maxWait = 2000;
          const startTime = Date.now();
          while (!localVideoRef.current && Date.now() - startTime < maxWait) {
            await new Promise(r => setTimeout(r, 50));
          }
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            console.log('[VideolifyFull_v2] ✅ srcObject set successfully');
          } else {
            console.warn('[VideolifyFull_v2] ⚠️ Video element not available after wait');
          }
        };
        await setSrcObject();
      }

      // ✅ Apply prejoin settings: Virtual Background
      if (prejoinSettings.vbgEnabled && stream && localVideoRef.current) {
        console.log('[VideolifyFull_v2] 🎭 Applying prejoin virtual background...', {
          mode: prejoinSettings.vbgMode,
          blurAmount: prejoinSettings.vbgBlurAmount,
          hasImage: !!prejoinSettings.vbgBackgroundImage,
        });

        try {
          if (prejoinSettings.vbgMode === 'blur') {
            // Apply blur background
            await vbg.enableVirtualBackground(
              stream,
              localVideoRef.current,
              'blur',
              { blurAmount: prejoinSettings.vbgBlurAmount }
            );
            console.log('[VideolifyFull_v2] ✅ Blur background applied from prejoin settings');
          } else if (prejoinSettings.vbgMode === 'image' && prejoinSettings.vbgBackgroundImage) {
            // Load and apply image background
            console.log('[VideolifyFull_v2] 🖼️ Loading background image:', prejoinSettings.vbgBackgroundImage.substring(0, 50) + '...');
            
            const img = new Image();
            img.crossOrigin = 'anonymous';

            await new Promise<void>((resolve, reject) => {
              img.onload = () => {
                console.log('[VideolifyFull_v2] ✅ Background image loaded successfully');
                resolve();
              };
              img.onerror = (e) => {
                console.error('[VideolifyFull_v2] ❌ Failed to load background image:', e);
                reject(new Error('Failed to load background image'));
              };
              img.src = prejoinSettings.vbgBackgroundImage!;
            });

            await vbg.enableVirtualBackground(
              stream,
              localVideoRef.current!,
              'image',
              { blurAmount: prejoinSettings.vbgBlurAmount, backgroundImage: img }
            );
            console.log('[VideolifyFull_v2] ✅ Image background applied from prejoin settings');
          }

          // ✅ CRITICAL: After VBG applies, the srcObject has a new canvas track
          // We need to set that track's enabled state to match camera setting
          if (!prejoinSettings.isCameraEnabled && localVideoRef.current.srcObject) {
            const vbgStream = localVideoRef.current.srcObject as MediaStream;
            vbgStream.getVideoTracks().forEach(track => {
              track.enabled = false;
              console.log('[VideolifyFull_v2] ✅ VBG video track disabled (camera OFF)');
            });
          }
        } catch (error) {
          console.error('[VideolifyFull_v2] ❌ Failed to apply prejoin VBG:', error);
        }
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
  // Store remoteVbgLoading in a ref so checkVideoFrames can access current value
  const remoteVbgLoadingRef = useRef(remoteVbgLoading);
  useEffect(() => {
    remoteVbgLoadingRef.current = remoteVbgLoading;
  }, [remoteVbgLoading]);

  useEffect(() => {
    const videoElement = remoteVideoRef.current;
    if (!videoElement) return;

    let frameCheckInterval: number | null = null;

    const checkVideoFrames = () => {
      // ✅ CRITICAL: Don't set hasFrames to false while VBG is loading
      // This prevents flicker when switching VBG modes on remote stream
      if (remoteVbgLoadingRef.current) {
        return; // Keep current hasFrames state while VBG is being applied
      }

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

  // ✅ Ensure local video srcObject is set when PiP becomes visible or media stream changes
  useEffect(() => {
    if (localPipVisible && localVideoRef.current && media.localStream) {
      if (localVideoRef.current.srcObject !== media.localStream) {
        localVideoRef.current.srcObject = media.localStream;
        console.log('[VideolifyFull_v2] Set local video srcObject');
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

  // ✅ Set local screen share video srcObject ONCE when stream changes (avoid flicker on re-render)
  useEffect(() => {
    if (screenShareVideoRef.current && screenShare.screenStream) {
      if (screenShareVideoRef.current.srcObject !== screenShare.screenStream) {
        screenShareVideoRef.current.srcObject = screenShare.screenStream;
        console.log('[VideolifyFull_v2] Local screen share video srcObject set');
      }
    }
  }, [screenShare.screenStream]);

  // ✅ Auto-create PiP preview when screen sharing starts (unless manually closed)
  useEffect(() => {
    if (screenShare.isSharing && screenShare.screenStream && !pipPreviewManuallyClose) {
      // Open PiP window with screen share stream
      pipPreview.createPiPWindow(screenShare.screenStream);
    } else if (!screenShare.isSharing) {
      // Close PiP window when screen share stops
      pipPreview.closePiPWindow();
      // Reset manual close flag when stop sharing
      setPipPreviewManuallyClosed(false);
    }
  }, [screenShare.isSharing, screenShare.screenStream, pipPreview, pipPreviewManuallyClose]);

  // ✅ Set remote screen share video srcObject ONCE when stream changes (avoid flicker on re-render)
  useEffect(() => {
    if (remoteScreenShareVideoRef.current && remoteScreenStream) {
      if (remoteScreenShareVideoRef.current.srcObject !== remoteScreenStream) {
        remoteScreenShareVideoRef.current.srcObject = remoteScreenStream;
        console.log('[VideolifyFull_v2] Remote screen share video srcObject set');
      }
    }
  }, [remoteScreenStream]);

  // ✅ Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsScreenShareFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleVideo = useCallback(() => {
    media.toggleVideo();
    sendControl('video-toggle', { enabled: !media.isVideoEnabled });
  }, [media, sendControl]);

  const handleToggleAudio = useCallback(() => {
    media.toggleAudio();
    sendControl('audio-toggle', { enabled: !media.isAudioEnabled });
  }, [media, sendControl]);

  const handleToggleScreenShare = useCallback(async () => {
    // Debounce screen-share toggles to avoid repeated renegotiations
    if (screenShareDebounceRef.current) clearTimeout(screenShareDebounceRef.current);
    screenShareDebounceRef.current = window.setTimeout(async () => {
      if (screenShare.isSharing) {
        // Stopping - onStopped callback will handle notification
        await screenShare.stopSharing();
      } else {
        // ✅ Check if remote peer is already sharing
        if (isRemoteSharing) {
          toast({
            title: 'Người kia đang chia sẻ màn hình',
            description: 'Vui lòng đợi họ dừng lại',
            variant: 'default',
          });
          return; // Block screen share
        }

        // ✅ Starting screen share - let hook handle everything including renegotiation
        await screenShare.startSharing();

        // Only notify peer if sharing actually started (user didn't cancel)
        if (screenShare.isSharing) {
          // ✅ Send control message to update button state at peer (non-blocking)
          console.log('[VideolifyFull_v2] Sending screen-share-toggle: true');
          sendControl('screen-share-toggle', { isSharing: true });
        } else {
          // User likely canceled the browser share picker; inform local user
          console.log('[VideolifyFull_v2] Screen share was not started (user canceled)');
          toast({ title: 'Chia sẻ màn hình bị hủy' });
        }
      }
    }, 250) as unknown as number;
  }, [screenShare, sendControl, isRemoteSharing, toast]);

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

  const handleSendReaction = useCallback((type: 'heart' | 'like' | 'clap' | 'fire') => {
    // Add local reaction
    reactions.sendReaction(type);

    // Emoji mapping
    const emojiMap = {
      heart: '❤️',
      like: '👍',
      clap: '👏',
      fire: '🔥',
    };

    // Send to peer via control channel
    sendControl('reaction', {
      reactionType: type,
      emoji: emojiMap[type],
      userName: userDisplayName,
    });
  }, [reactions, sendControl, userDisplayName]);

  const handleToggleWhiteboard = useCallback(() => {
    const newState = !showWhiteboard;
    setShowWhiteboard(newState);

    // Send control message to peer
    sendControl('whiteboard-toggle', { isOpen: newState });

    console.log('[VideolifyFull_v2] Whiteboard toggled:', newState);
  }, [showWhiteboard, sendControl]);

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
    // Start change-in-progress immediately so closing the panel won't cancel the selection.
    setActivePreset(null); // ✅ Clear active preset when selecting blur
    setVbgChangeInProgress(true);
    // Mark pending selection so panel close won't revert
    vbgPendingRef.current = { mode: 'blur', blurAmount: vbg.blurAmount };

    const vbgSettings = { enabled: true, mode: 'blur' as const, blurAmount: vbg.blurAmount };
    
    // ✅ Send via DataChannel (faster, more reliable) if available
    if (controlChannelRef.current?.readyState === 'open') {
      sendControl('vbg-settings', vbgSettings);
    }
    // Also send via SSE as backup
    if (remotePeerIdRef.current) {
      signaling.sendVbgSettings({ ...vbgSettings, toPeerId: remotePeerIdRef.current }).catch((e) => console.warn('sendVbgSettings failed:', e));
    }

    // Debounce the heavy enable operation to avoid thrashing the processor
    if (vbgDebounceRef.current) clearTimeout(vbgDebounceRef.current);
    vbgDebounceRef.current = window.setTimeout(async () => {
      if (localVideoRef.current && media.localStream) {
        try {
          await vbg.enableVirtualBackground(media.localStream, localVideoRef.current, 'blur');
        } catch (err) {
          console.error('[VideolifyFull_v2] VBG blur apply failed', err);
        } finally {
          setVbgChangeInProgress(false);
          vbgPendingRef.current = null;
        }
      } else {
        // Nothing to apply; clear the flag so UI behaves correctly
        setVbgChangeInProgress(false);
        vbgPendingRef.current = null;
      }
    }, 300) as unknown as number;
  };

  const handleVbgNone = async () => {
    // User explicitly disabled VBG; mark in-progress immediately and notify peer
    if (vbgDebounceRef.current) clearTimeout(vbgDebounceRef.current);
    setActivePreset(null); // ✅ Clear active preset when disabling VBG
    setVbgChangeInProgress(true);
    // Clear any pending selection since user explicitly disabled
    vbgPendingRef.current = null;
    
    const vbgSettings = { enabled: false, mode: 'none' as const };
    
    try {
      vbg.disableVirtualBackground(localVideoRef.current!);
      // ✅ Notify peer via DataChannel (faster) and SSE (backup)
      if (controlChannelRef.current?.readyState === 'open') {
        sendControl('vbg-settings', vbgSettings);
      }
      if (remotePeerIdRef.current) {
        signaling.sendVbgSettings({ ...vbgSettings, toPeerId: remotePeerIdRef.current }).catch((e) => console.warn('sendVbgSettings failed:', e));
      }
    } catch (err) {
      console.error('[VideolifyFull_v2] VBG disable failed', err);
    } finally {
      // small debounce to avoid rapid toggles
      vbgDebounceRef.current = window.setTimeout(() => setVbgChangeInProgress(false), 250) as unknown as number;
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
    // Start change-in-progress immediately so closing the panel won't cancel the selection.
    setVbgChangeInProgress(true);
    // Mark pending selection so panel close won't revert
    vbgPendingRef.current = { mode: 'image', backgroundImage: imageUrl };
    
    const vbgSettings = { enabled: true, mode: 'image' as const, backgroundImage: imageUrl };
    
    // ✅ Send via DataChannel (faster, more reliable) if available
    if (controlChannelRef.current?.readyState === 'open') {
      sendControl('vbg-settings', vbgSettings);
    }
    // Also send via SSE as backup
    if (remotePeerIdRef.current) {
      signaling.sendVbgSettings({ ...vbgSettings, toPeerId: remotePeerIdRef.current }).catch((e) => console.warn('sendVbgSettings failed:', e));
    }

    if (vbgDebounceRef.current) clearTimeout(vbgDebounceRef.current);
    vbgDebounceRef.current = window.setTimeout(async () => {
      if (localVideoRef.current && media.localStream) {
        try {
          await vbg.enableVirtualBackground(media.localStream, localVideoRef.current, 'image', { backgroundImage: img });
        } catch (err) {
          console.error('[VideolifyFull_v2] VBG image apply failed', err);
        } finally {
          setVbgChangeInProgress(false);
          vbgPendingRef.current = null;
        }
      } else {
        setVbgChangeInProgress(false);
        vbgPendingRef.current = null;
      }
    }, 300) as unknown as number;
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
      <div className="relative w-full h-screen bg-gray-900 flex flex-col" data-videocall-container>
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

        {/* Recording Indicator - Non-flashing, subtle */}
        {screenRecording.isRecording && (
          <div className="absolute top-3 left-8 z-50 flex items-center gap-2 bg-red-600/90 text-white px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-white"></div>
            <span className="text-xs font-medium">REC {screenRecording.getFormattedDuration()}</span>
          </div>
        )}


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
              <div ref={containerRef} className="relative w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
              {/* Local Screen Share - Show actual video (Google Meet style - allow loop but keep it smooth) */}
              {screenShare.isSharing && screenShare.screenStream && (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-950 to-slate-900 z-10 group">
                  <video
                    ref={screenShareVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain drop-shadow-2xl"
                    style={{
                      maxHeight: '100%',
                      maxWidth: '100%',
                      willChange: 'transform', // GPU acceleration
                      transform: 'translateZ(0)', // Force GPU layer
                    }}
                  />
                  {/* Toggle PiP Preview button (for local only - to see what you're sharing) */}
                  {!isScreenShareFullscreen && pipPreview.supportsPiP && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent event bubbling
                            if (pipPreview.isOpen || !pipPreviewManuallyClose) {
                              // Close PiP and mark as manually closed
                              pipPreview.closePiPWindow();
                              setPipPreviewManuallyClosed(true);
                            } else {
                              // Open PiP and clear manual close flag
                              setPipPreviewManuallyClosed(false);
                              if (screenShare.screenStream) {
                                pipPreview.createPiPWindow(screenShare.screenStream);
                              }
                            }
                          }}
                          className="absolute bottom-28 right-8 opacity-100 hover:opacity-100 transition-all duration-200 bg-white/98 hover:bg-white text-gray-800 border-2 border-gray-300 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-200/30 rounded-lg w-11 h-11 p-0 shadow-lg z-50 hover:scale-110 active:scale-95"
                          size="icon"
                        >
                          {pipPreview.isOpen ? (
                            <PictureInPicture2 className="w-5 h-5 text-blue-600" strokeWidth={2.5} />
                          ) : (
                            <PictureInPicture2 className="w-5 h-5 text-gray-700" strokeWidth={2.5} />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="bg-gray-900 text-white border-gray-700 px-3 py-2">
                        <p className="text-sm font-medium">{pipPreview.isOpen ? 'Ẩn cửa sổ xem trước' : 'Hiện cửa sổ xem trước'}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )}

              {/* Remote Screen Share Video (when peer is sharing) */}
              {!screenShare.isSharing && remoteScreenStream && (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-950 to-slate-900 z-10 group">
                  <video
                    ref={remoteScreenShareVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain drop-shadow-2xl"
                    style={{ maxHeight: '100%', maxWidth: '100%' }}
                  />
                  {/* Fullscreen button (for peer only - to see shared screen in detail) */}
                  {!isScreenShareFullscreen && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent event bubbling
                            if (remoteScreenShareVideoRef.current) {
                              remoteScreenShareVideoRef.current.requestFullscreen();
                            }
                          }}
                          className="absolute bottom-28 right-8 opacity-100 hover:opacity-100 transition-all duration-200 bg-white/98 hover:bg-white text-gray-800 border-2 border-gray-300 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-200/30 rounded-lg w-11 h-11 p-0 shadow-lg z-50 hover:scale-110 active:scale-95"
                          size="icon"
                        >
                          <Maximize className="w-5 h-5 text-gray-700" strokeWidth={2.5} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="bg-gray-900 text-white border-gray-700 px-3 py-2">
                        <p className="text-sm font-medium">Xem toàn màn hình</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )}

              {/* Welcome Screen with Logo (when not sharing) */}
              {!screenShare.isSharing && !remoteScreenStream && !showWhiteboard && (
                <div className="text-center space-y-8">
                  <div className="text-white text-6xl font-bold mb-4">
                    📚 Lớp Học Online
                  </div>
                  <div className="text-gray-500 text-lg">
                    Bắt đầu chia sẻ màn hình hoặc sử dụng bảng trắng để dạy học
                  </div>
                </div>
              )}

          {/* Individual draggable PiPs with collision avoidance */}
          {localPipVisible && (
            <Draggable
              bounds="parent"
              position={localPos}
              onStart={() => setLocalDragging(true)}
              onStop={(_, d) => {
                setLocalPos({ x: d.x, y: d.y });
                setLocalDragging(false);
                setTimeout(() => ensureNoOverlap('local'), 0);
              }}
            >
              <div
                ref={localNodeRef}
                style={{ position: 'absolute', top: 12, right: 12, zIndex: 30 }}
                className={`group ${localDragging ? 'transition-none' : 'transition-all duration-200'} ${localPipSize === 'small' ? 'w-32 h-24' : localPipSize === 'medium' ? 'w-48 h-36' : 'w-64 h-48'}`}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover rounded-lg shadow-lg cursor-move ${localDragging ? 'transition-none' : 'transition-all duration-200'} ${isLocalSpeaking ? 'border-[3px] border-blue-400 shadow-blue-400/50' : 'border-2 border-blue-500/50'} ${media.isVideoEnabled && localVideoHasFrames ? 'block' : 'hidden'}`}
                />

                {(!media.isVideoEnabled || !localVideoHasFrames) && (
                  <div className="border-2 border-blue-500 shadow-lg rounded-lg">
                    <CameraOffOverlay pipSize={localPipSize} />
                  </div>
                )}

                {!media.isAudioEnabled && (
                  <div className="absolute top-2 left-2 bg-red-500/90 text-white p-1.5 rounded-full flex items-center justify-center">
                    <MicOff className="w-4 h-4" />
                  </div>
                )}

                <PiPControlBar pipSize={localPipSize} onResize={toggleLocalPipSize} onHide={() => setLocalPipVisible(false)} />
              </div>
            </Draggable>
          )}

          {remotePipVisible && (
            <Draggable
              bounds="parent"
              position={remotePos}
              onStart={() => setRemoteDragging(true)}
              onStop={(_, d) => {
                setRemotePos({ x: d.x, y: d.y });
                setRemoteDragging(false);
                setTimeout(() => ensureNoOverlap('remote'), 0);
              }}
            >
              <div
                ref={remoteNodeRef}
                style={{ position: 'absolute', top: 12, right: 12, zIndex: 29 }}
                className={`group ${remoteDragging ? 'transition-none' : 'transition-all duration-200'} ${remotePipSize === 'small' ? 'w-32 h-24' : remotePipSize === 'medium' ? 'w-48 h-36' : 'w-64 h-48'}`}>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover rounded-lg shadow-lg cursor-move ${remoteDragging ? 'transition-none' : 'transition-all duration-200'} ${isRemoteSpeaking ? 'border-[3px] border-green-400 shadow-green-400/50' : 'border-2 border-green-500/50'} ${connectionStats.connected && remoteVideoEnabled && remoteVideoHasFrames && !remoteVbgLoading ? 'block' : 'hidden'}`}
                />

                {/* ✅ VBG Loading overlay - show while applying VBG for privacy */}
                {remoteVbgLoading && connectionStats.connected && (
                  <div className="absolute inset-0 bg-gray-900 rounded-lg flex items-center justify-center border-2 border-green-500/50">
                    <div className="text-center text-white">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <span className="text-xs">Đang tải nền ảo...</span>
                    </div>
                  </div>
                )}

                {/* ✅ Show CameraOffOverlay when:
                    - Not connected, OR
                    - Remote explicitly disabled camera, OR
                    - No video frames available (regardless of broadcast state)
                    This ensures no blank/broken video display */}
                {(!connectionStats.connected || !remoteVideoEnabled || !remoteVideoHasFrames) && !remoteVbgLoading && (
                  <div className="border-2 border-green-500 shadow-lg rounded-lg">
                    <CameraOffOverlay pipSize={remotePipSize} />
                  </div>
                )}

                {connectionStats.connected && !remoteAudioEnabled && (
                  <div className="absolute top-2 left-2 bg-red-500/90 text-white p-1.5 rounded-full flex items-center justify-center">
                    <MicOff className="w-4 h-4" />
                  </div>
                )}

                <PiPControlBar pipSize={remotePipSize} onResize={toggleRemotePipSize} onHide={() => setRemotePipVisible(false)} />
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

            {/* Remote Muted Badges removed from main area — status shown in PiP only */}
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
        isRemoteSharing={isRemoteSharing}
        showChat={showChat}
        showWhiteboard={showWhiteboard}
        showVbgPanel={showVbgPanel}
        onToggleChat={() => {
          setShowChat(!showChat);
          if (!showChat) {
            setUnreadChatCount(0);
          }
        }}
        unreadChatCount={unreadChatCount}
        onToggleWhiteboard={handleToggleWhiteboard}
        role={role}
        onToggleVbgPanel={() => {
          if (!showVbgPanel) {
            setInitialVbgEnabled(vbg.enabled);
          }
          setShowVbgPanel(!showVbgPanel);
        }}
        onFilePick={handleFilePick}
        vbgEnabled={vbg.enabled}
        handRaised={handRaised}
        onToggleHandRaise={toggleHandRaise}
        onSendReaction={handleSendReaction}
        isRecording={screenRecording.isRecording}
        onToggleRecording={() => screenRecording.toggleRecording()}
        showDebugStats={showDebugStats}
        onToggleDebugStats={() => setShowDebugStats(!showDebugStats)}
        onEndCall={endCall}
      />

      {/* Chat Panel */}
      <ChatPanel
        show={showChat}
        onClose={() => {
          setShowChat(false);
          setUnreadChatCount(0);
        }}
        messages={chat.messages}
        onSendMessage={(message) => {
          chat.sendMessage(message);
        }}
        onReaction={(messageIndex, emoji) => chat.addReaction(messageIndex, emoji)}
        typingUsers={chat.typingUsers}
        userDisplayName={userDisplayName}
        role={role as 'teacher' | 'student'}
      />

      {/* Excalidraw Whiteboard Panel */}
      <WhiteboardExcalidraw
        show={showWhiteboard}
        onClose={() => {
          setShowWhiteboard(false);
          // Notify peer that whiteboard is closed
          sendControl('whiteboard-toggle', { isOpen: false });
        }}
        excalidrawAPI={excalidrawAPIRef.current}
        onAPIReady={(api) => {
          excalidrawAPIRef.current = api;
          excalidrawSync.setExcalidrawAPI(api);
        }}
        onChange={excalidrawSync.handleChange}
        role={role === 'tutor' ? 'teacher' : 'student'}
        userName={userDisplayName}
        onSendControl={sendControl}
        drawPermissionGranted={whiteboardDrawPermission}
        studentRequestingDraw={studentRequestingDraw}
        onPermissionChange={(allowed) => {
          // When teacher grants/denies permission, clear the request flag
          setStudentRequestingDraw(false);
          sendControl('whiteboard-permission', { allowed });
        }}
      />

      <VirtualBackgroundPanel
        show={showVbgPanel}
        onClose={() => {
          setShowVbgPanel(false);
          // If a VBG change is in progress, don't revert on close. Also only
          // auto-disable only when nothing changed (vbg state equals initial),
          // there is no pending selection, and no change in progress. This
          // avoids cancelling quick selections when user clicks outside.
          if (!vbgChangeInProgress && !vbgPendingRef.current && vbg.enabled === initialVbgEnabled) {
            handleVbgNone();
          }
        }}
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

      {/* Floating Heart Animations */}
      {reactions.reactions.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
          {reactions.reactions.map((reaction) => (
            <div
              key={reaction.id}
              className="absolute animate-float-up"
              style={{
                left: `${reaction.x}%`,
                bottom: '0',
                animation: 'float-up 4s ease-out forwards',
              }}
            >
              <div className="text-5xl animate-sway">
                {reaction.emoji}
              </div>
            </div>
          ))}
        </div>
      )}

      </div>
    </TooltipProvider>
  );
}
