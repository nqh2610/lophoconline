'use client';

/**
 * Videolify Full Platform
 * Architecture: Client-Heavy, Server-Light
 * 
 * Server: CHỈ SSE signaling (offer/answer/ICE relay)
 * Client: TẤT CẢ logic (video, chat, whiteboard, screen share, virtual bg)
 * 
 * Features:
 * ✅ Video/Audio P2P - WebRTC Media
 * ✅ Whiteboard - DataChannel P2P + Fabric.js
 * ✅ Chat - DataChannel P2P
 * ✅ Screen Share - WebRTC Media
 * ✅ Virtual Background - Client Canvas (optional)
 * ✅ Hand Raise - DataChannel P2P
 * ✅ Recording - Client MediaRecorder
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import Draggable from 'react-draggable';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, MonitorOff,
  MessageSquare, Pencil, Hand, Camera, Download, Maximize2, Minimize2,
  Upload, FileText, X, Check, Activity, EyeOff, Eye, Eraser
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface VideolifyFullProps {
  roomId: string;
  accessToken: string;
  userDisplayName: string;
  role: 'tutor' | 'student';
  onCallEnd?: () => void;
}

interface ChatMessage {
  userName: string;
  message: string;
  timestamp: number;
  fromMe: boolean;
}

interface DrawEvent {
  type: 'draw' | 'clear' | 'undo' | 'erase';
  data?: any;
  objectId?: string; // For erase events
}

interface FileMetadata {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
}

interface FileTransfer {
  metadata: FileMetadata;
  chunks: ArrayBuffer[];
  receivedChunks: number;
  progress: number;
  status: 'pending' | 'transferring' | 'completed' | 'failed';
}

// STUN servers for NAT traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function VideolifyFull({
  roomId,
  accessToken,
  userDisplayName,
  role,
  onCallEnd,
}: VideolifyFullProps) {
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const whiteboardCanvasRef = useRef<HTMLCanvasElement>(null);
  const whiteboardFabricRef = useRef<fabric.Canvas | null>(null);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const makingOfferRef = useRef<boolean>(false);
  const ignoreOfferRef = useRef<boolean>(false); // Perfect Negotiation: ignore offer when making one
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // Peer ID initialization - MUST be stable across StrictMode double-render
  const peerIdRef = useRef<string>('');
  
  // Initialize peer ID only once (not in render)
  if (!peerIdRef.current) {
    // Try to restore peerId with fallback chain:
    // 1. sessionStorage (F5 refresh - same browser session)
    // 2. localStorage (Full disconnect/reopen - persistent)
    // 3. Generate new (First time join)
    const sessionKey = `videolify-peer-${roomId}`;
    const localKey = `videolify-peer-${roomId}`;
    
    let savedPeerId: string | null = null;
    let source = '';
    
    if (typeof window !== 'undefined') {
      // Priority 1: Check sessionStorage (F5 case)
      savedPeerId = sessionStorage.getItem(sessionKey);
      if (savedPeerId) {
        source = 'sessionStorage';
      } else {
        // Priority 2: Check localStorage (disconnect/reconnect case)
        savedPeerId = localStorage.getItem(localKey);
        if (savedPeerId) {
          source = 'localStorage';
          // Also restore to sessionStorage for this session
          sessionStorage.setItem(sessionKey, savedPeerId);
        }
      }
    }
    
    if (savedPeerId) {
      // CRITICAL FIX: Handle case where old session saved object instead of string
      // If savedPeerId looks like JSON object, extract the peerId field
      try {
        if (savedPeerId.startsWith('{')) {
          const parsed = JSON.parse(savedPeerId);
          peerIdRef.current = parsed.peerId || savedPeerId;
          console.log(`🔄 [Videolify] Restored peer ID from ${source} (parsed object): ${peerIdRef.current}`);
        } else {
          peerIdRef.current = savedPeerId;
          console.log(`🔄 [Videolify] Restored peer ID from ${source}: ${peerIdRef.current}`);
        }
      } catch (e) {
        // If parse fails, use as-is (it's already a string)
        peerIdRef.current = savedPeerId;
        console.log(`🔄 [Videolify] Restored peer ID from ${source}: ${peerIdRef.current}`);
      }
    } else {
      // Generate NEW peer ID
      peerIdRef.current = `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log(`✨ [Videolify] Generated new peer ID: ${peerIdRef.current}`);
      
      // Save to BOTH sessionStorage AND localStorage  
      if (typeof window !== 'undefined') {
        // ENSURE we save string only, never object
        const peerIdString = String(peerIdRef.current);
        sessionStorage.setItem(sessionKey, peerIdString);
        localStorage.setItem(localKey, peerIdString);
        // Also save timestamp for optional cleanup
        localStorage.setItem(`${localKey}-timestamp`, Date.now().toString());
        console.log(`💾 [Videolify] Peer ID saved to session & local storage`);
      }
    }
  }
  
  const remotePeerIdRef = useRef<string | null>(null);
  const isPolitePeerRef = useRef<boolean>(false); // Perfect Negotiation: polite vs impolite
  
  // Media streams
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const mediaReadyRef = useRef<boolean>(false); // Track if media is initialized
  
  // Data Channels (P2P - NO SERVER!)
  const whiteboardChannelRef = useRef<RTCDataChannel | null>(null);
  const chatChannelRef = useRef<RTCDataChannel | null>(null);
  const controlChannelRef = useRef<RTCDataChannel | null>(null);
  const fileChannelRef = useRef<RTCDataChannel | null>(null);
  const iceQueueRef = useRef<any[]>([]);
  const outgoingChatQueueRef = useRef<string[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // Hooks
  const { toast } = useToast();
  const receivedMessageIdsRef = useRef<Set<string>>(new Set());
  const whiteboardQueueRef = useRef<any[]>([]);
  const controlQueueRef = useRef<any[]>([]);
  const negotiationInProgressRef = useRef<boolean>(false);
  const channelTimeoutsRef = useRef<{[key: string]: NodeJS.Timeout}>({});
  const hasJoinedRef = useRef<boolean>(false); // Prevent double join
  
  // UI state
  const [isConnecting, setIsConnecting] = useState(true);
  const [wasConnected, setWasConnected] = useState(false); // Track if connection was established before
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [virtualBgEnabled, setVirtualBgEnabled] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [remoteHandRaised, setRemoteHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [incomingFile, setIncomingFile] = useState<FileTransfer | null>(null);
  const [outgoingFile, setOutgoingFile] = useState<FileTransfer | null>(null);
  const [showFileTransfer, setShowFileTransfer] = useState(false);
  
  const [connectionStats, setConnectionStats] = useState({
    iceState: 'new',
    connected: false,
  });
  
  const [showDebugStats, setShowDebugStats] = useState(false);
  
  // DataChannel states for monitoring
  const [channelStates, setChannelStates] = useState({
    whiteboard: 'closed' as RTCDataChannelState,
    chat: 'closed' as RTCDataChannelState,
    control: 'closed' as RTCDataChannelState,
    file: 'closed' as RTCDataChannelState,
  });
  
  // PiP controls
  const [pipSize, setPipSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [pipVisible, setPipVisible] = useState(true);
  
  // Whiteboard ready state
  const [isWhiteboardReady, setIsWhiteboardReady] = useState(false);
  const [isEraserMode, setIsEraserMode] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  // Connection resilience tracking
  const iceRestartAttemptsRef = useRef<number>(0);
  const sseReconnectAttemptsRef = useRef<number>(0);
  const lastPongTimeRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hiddenStartTimeRef = useRef<number | null>(null);
  const iceGatheringTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const peerLeftTimeRef = useRef<number | null>(null);

  /**
   * Session Persistence - Save/Load connection state
   */
  const saveConnectionState = useCallback(() => {
    try {
      const state = {
        roomId,
        accessToken,
        userDisplayName,
        role,
        peerId: peerIdRef.current, // Save peer ID for F5 recovery
        timestamp: Date.now(),
      };
      sessionStorage.setItem('videolify-session', JSON.stringify(state));
      console.log('💾 [Videolify] Session state saved with peerId:', peerIdRef.current);
    } catch (e) {
      console.error('❌ [Videolify] Failed to save session:', e);
    }
  }, [roomId, accessToken, userDisplayName, role]);

  const loadConnectionState = useCallback(() => {
    try {
      const saved = sessionStorage.getItem('videolify-session');
      if (saved) {
        const state = JSON.parse(saved);
        // Check if session is recent (within 5 minutes)
        const age = Date.now() - state.timestamp;
        if (age < 5 * 60 * 1000) {
          console.log('✅ [Videolify] Found recent session, age:', Math.round(age / 1000), 's');
          return state;
        } else {
          console.log('⏰ [Videolify] Session too old, clearing');
          sessionStorage.removeItem('videolify-session');
        }
      }
    } catch (e) {
      console.error('❌ [Videolify] Failed to load session:', e);
    }
    return null;
  }, []);

  const clearConnectionState = useCallback(() => {
    const sessionKey = `videolify-peer-${roomId}`;
    const localKey = `videolify-peer-${roomId}`;
    
    // Clear sessionStorage (always)
    sessionStorage.removeItem(sessionKey);
    sessionStorage.removeItem('videolify-session');
    
    // KEEP localStorage for reconnection after full disconnect
    // Only clear if user explicitly ends call (not on component unmount)
    // This allows reconnection with same peerId after browser close/reopen
    
    console.log('🗑️ [Videolify] Session state cleared (sessionStorage only)');
    console.log('💾 [Videolify] localStorage preserved for future reconnection');
    
    // Optional: Cleanup old localStorage entries (24h+)
    if (typeof window !== 'undefined') {
      const timestamp = localStorage.getItem(`${localKey}-timestamp`);
      if (timestamp) {
        const age = Date.now() - parseInt(timestamp);
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        
        if (age > TWENTY_FOUR_HOURS) {
          localStorage.removeItem(localKey);
          localStorage.removeItem(`${localKey}-timestamp`);
          console.log('🧹 [Videolify] Cleaned up old localStorage (24h+)');
        }
      }
    }
  }, [roomId]);

  /**
   * 1. Initialize local media (camera + microphone)
   * CLIENT-SIDE ONLY - No server processing
   */
  useEffect(() => {
    const initMedia = async () => {
      try {
        // Check WebRTC support
        if (!navigator.mediaDevices || !window.RTCPeerConnection) {
          setError('Trình duyệt không hỗ trợ WebRTC. Vui lòng dùng Chrome, Edge, hoặc Firefox.');
          return;
        }

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: { echoCancellation: true, noiseSuppression: true },
          });

          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          console.log('[Videolify] Local media initialized');
        } catch (mediaErr) {
          console.warn('[Videolify] Could not access camera/mic, continuing without media:', mediaErr);
          // Create empty stream - allow user to join anyway
          localStreamRef.current = new MediaStream();
        }

        mediaReadyRef.current = true;
        setIsConnecting(false);
        
        // If connection already exists, add tracks now
        if (peerConnectionRef.current && localStreamRef.current) {
          const tracks = localStreamRef.current.getTracks();
          if (tracks.length > 0) {
            console.log('[Videolify] Adding late media tracks to existing connection');
            tracks.forEach(track => {
              const sender = peerConnectionRef.current!.getSenders().find(s => s.track?.kind === track.kind);
              if (!sender) {
                peerConnectionRef.current!.addTrack(track, localStreamRef.current!);
                console.log('[Videolify] Added late track:', track.kind);
              }
            });
          }
        }
        
        // Connect SSE and join room regardless of media access
        connectSSE();
        
        // Prevent duplicate joins from React StrictMode double-execution
        if (!hasJoinedRef.current) {
          hasJoinedRef.current = true; // Set BEFORE await to block StrictMode 2nd call
          await joinRoom();
        } else {
          console.log('[Videolify] Already joined, skipping duplicate join from StrictMode');
        }
        
        // Save session state after successful join
        saveConnectionState();
        
      } catch (err) {
        console.error('[Videolify] Fatal error:', err);
        setError('Không thể kết nối. Vui lòng thử lại.');
      }
    };

    // Handle page reload/close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Keep session state for quick rejoin
      console.log('⚠️ [Videolify] Page unloading, session will be preserved');
      // Don't clear session here - allow quick rejoin
    };

    // Handle page visibility change (tab switch, minimize)
    const handleVisibilityChange = () => {
      // Skip visibility handling in test mode (Puppeteer reloads trigger false positives)
      if ((window as any).__VIDEOLIFY_TEST_MODE__) {
        console.log('👁️ [Videolify] TEST MODE - Skipping visibility change handler');
        return;
      }
      
      if (document.hidden) {
        console.log('👁️ [Videolify] Page hidden - starting visibility timer');
        hiddenStartTimeRef.current = Date.now();
        
        // Set 2-minute timeout warning
        visibilityTimeoutRef.current = setTimeout(() => {
          console.warn('⚠️ [Videolify] Page hidden for >2 minutes - pausing heartbeat');
          
          // Pause heartbeat to conserve resources
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
          }
        }, 2 * 60 * 1000); // 2 minutes
        
      } else {
        console.log('👁️ [Videolify] Page visible - checking connection health');
        
        // Clear visibility timeout
        if (visibilityTimeoutRef.current) {
          clearTimeout(visibilityTimeoutRef.current);
          visibilityTimeoutRef.current = null;
        }
        
        // Calculate how long page was hidden
        const hiddenDuration = hiddenStartTimeRef.current 
          ? Date.now() - hiddenStartTimeRef.current 
          : 0;
        hiddenStartTimeRef.current = null;
        
        // Detect laptop sleep/wake via time gap
        const timeSinceLastPong = Date.now() - lastPongTimeRef.current;
        const probablySleep = timeSinceLastPong > 60 * 1000; // >60s gap = likely sleep
        
        if (probablySleep) {
          console.warn(`⚠️ [Videolify] SLEEP DETECTED - ${Math.round(timeSinceLastPong/1000)}s since last pong`);
          
          // After sleep, immediately restart connection
          const pc = peerConnectionRef.current;
          if (pc) {
            // Force ICE restart + SSE reconnect
            console.log('[Videolify] Forcing ICE restart after wake from sleep');
            handleICEFailure(pc);
            
            // Also check SSE connection
            if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
              console.log('[Videolify] Reconnecting SSE after wake from sleep');
              sseReconnectAttemptsRef.current = 0; // Reset counter
              connectSSE();
            }
          }
          
          return; // Skip normal visibility logic
        }
        
        if (hiddenDuration > 2 * 60 * 1000) {
          console.warn(`⚠️ [Videolify] Page was hidden for ${Math.round(hiddenDuration/1000)}s - checking connection`);
          
          // Resume heartbeat if control channel is open
          if (controlChannelRef.current?.readyState === 'open' && !heartbeatIntervalRef.current) {
            console.log('[Videolify] Resuming heartbeat after visibility restore');
            startHeartbeat();
          }
          
          // Check connection health
          const pc = peerConnectionRef.current;
          if (pc) {
            if (pc.connectionState === 'failed') {
              console.log('[Videolify] Connection failed while hidden - triggering full reconnect');
              fullReconnect();
            } else if (pc.connectionState === 'disconnected' || pc.iceConnectionState === 'disconnected') {
              console.log('[Videolify] Connection degraded while hidden - triggering ICE restart');
              handleICEFailure(pc);
            } else if (pc.connectionState === 'connected') {
              console.log('✅ [Videolify] Connection still healthy after visibility restore');
            }
          }
        } else {
          // Short hidden duration - just verify connection is okay
          if (peerConnectionRef.current?.connectionState === 'failed' || 
              peerConnectionRef.current?.connectionState === 'disconnected') {
            console.log('🔄 [Videolify] Connection lost while briefly hidden, attempting recovery');
            handleICEFailure(peerConnectionRef.current);
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    initMedia();

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Cleanup whiteboard
      if (whiteboardFabricRef.current) {
        whiteboardFabricRef.current.dispose();
        whiteboardFabricRef.current = null;
      }
      
      // Clear all timeouts
      Object.values(channelTimeoutsRef.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
      
      // Cleanup data channels
      if (whiteboardChannelRef.current) {
        whiteboardChannelRef.current.close();
      }
      if (chatChannelRef.current) {
        chatChannelRef.current.close();
      }
      if (controlChannelRef.current) {
        controlChannelRef.current.close();
      }
      if (fileChannelRef.current) {
        fileChannelRef.current.close();
      }
      
      // Cleanup media streams
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Cleanup connections
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      
      // Cleanup file transfer memory
      if ((window as any).__pendingFile) {
        delete (window as any).__pendingFile;
      }
    };
  }, []);

  /**
   * Save peer session before unload for F5 detection
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sessionKey = `videolify-peer-${roomId}`;
      sessionStorage.setItem(sessionKey, JSON.stringify({
        peerId: peerIdRef.current,
        timestamp: Date.now()
      }));
      console.log(`💾 [Videolify] Saved peer session before unload: ${peerIdRef.current}`);
      
      // CRITICAL: Clear active tab marker to prevent "another tab" error after F5
      const activeTabKey = `videolify-active-tab-${roomId}`;
      localStorage.removeItem(activeTabKey);
      console.log(`🗑️ [Videolify] Cleared active tab marker before unload`);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomId]);

  /**
   * Initialize whiteboard when showWhiteboard becomes true
   */
  useEffect(() => {
    if (showWhiteboard && !whiteboardFabricRef.current) {
      // Small delay to ensure canvas is in DOM
      setTimeout(() => {
        initializeWhiteboard();
      }, 100);
    }
  }, [showWhiteboard]);

  /**
   * Auto scroll chat to bottom when new message arrives
   */
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  /**
   * Expose test state for automated testing
   */
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__VIDEOLIFY_TEST_MODE__) {
      (window as any).__VIDEOLIFY_TEST_STATE__ = {
        channelStates,
        isConnecting,
        connectionStats,
        remotePeerId: remotePeerIdRef.current,
        peerConnectionState: peerConnectionRef.current?.connectionState,
        iceConnectionState: peerConnectionRef.current?.iceConnectionState,
        iceGatheringState: peerConnectionRef.current?.iceGatheringState,
        hasRemoteVideo: !!remoteVideoRef.current?.srcObject,
        hasLocalVideo: !!localVideoRef.current?.srcObject,
      };
    }
  });

  /**
   * Multiple tabs conflict detection
   */
  useEffect(() => {
    const tabId = `videolify-tab-${Date.now()}-${Math.random()}`;
    const activeTabKey = `videolify-active-tab-${roomId}`;
    
    // Check if another tab is already active
    const existingTab = localStorage.getItem(activeTabKey);
    if (existingTab) {
      const existingTabData = JSON.parse(existingTab);
      const timeSinceLastUpdate = Date.now() - existingTabData.timestamp;
      
      // If another tab is active and recent (<5s), show warning
      if (timeSinceLastUpdate < 5000) {
        console.warn('[Videolify] Another tab is already active for this room');
        setError('Cuộc gọi đang mở ở tab khác. Vui lòng đóng tab kia hoặc tải lại trang này.');
        return; // Don't proceed with connection
      }
    }
    
    // Register this tab as active
    const updateTabActivity = () => {
      localStorage.setItem(activeTabKey, JSON.stringify({
        tabId,
        timestamp: Date.now(),
      }));
    };
    
    updateTabActivity();
    const tabActivityInterval = setInterval(updateTabActivity, 2000); // Update every 2s
    
    // Listen for storage events (other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === activeTabKey && e.newValue) {
        const newTabData = JSON.parse(e.newValue);
        if (newTabData.tabId !== tabId) {
          console.warn('[Videolify] Another tab took over - disabling this tab');
          
          // Disable this tab's connection
          if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
          }
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
          
          setError('Cuộc gọi đã được mở ở tab khác.');
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      clearInterval(tabActivityInterval);
      window.removeEventListener('storage', handleStorageChange);
      
      // Only remove if we're the active tab
      const currentTab = localStorage.getItem(activeTabKey);
      if (currentTab) {
        const currentTabData = JSON.parse(currentTab);
        if (currentTabData.tabId === tabId) {
          localStorage.removeItem(activeTabKey);
        }
      }
    };
  }, [roomId]);

  /**
   * Network online/offline detection
   */
  useEffect(() => {
    const handleOnline = () => {
      console.log('✅ [Videolify] Network back online');
      
      // Reset retry counters
      iceRestartAttemptsRef.current = 0;
      sseReconnectAttemptsRef.current = 0;
      
      // Try to reconnect SSE if disconnected
      if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
        console.log('[Videolify] Reconnecting SSE after network restore');
        connectSSE();
      }
      
      // Check peer connection state
      const pc = peerConnectionRef.current;
      if (pc && (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected')) {
        console.log('[Videolify] Restarting ICE after network restore');
        handleICEFailure(pc);
      }
    };

    const handleOffline = () => {
      console.warn('⚠️ [Videolify] Network offline detected');
      
      // Clear all retry timeouts to prevent wasted attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Stop heartbeat during offline
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * 2. SSE Connection - MINIMAL SERVER
   * Server CHỈ relay signaling messages
   */
  function connectSSE() {
    const eventSource = new EventSource(
      `/api/videolify/stream?roomId=${roomId}&peerId=${peerIdRef.current}`
    );

    eventSourceRef.current = eventSource;

    // Reset SSE retry counter on successful connection
    eventSource.onopen = () => {
      console.log('✅ [Videolify] SSE connection opened');
      sseReconnectAttemptsRef.current = 0;
    };

    // Peer joined - BOTH peers create offers (Perfect Negotiation handles collision)
    eventSource.addEventListener('peer-joined', async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Videolify] Peer joined event:', data);

        // Check if this is a rejoin within 30s window
        const timeSinceLeft = peerLeftTimeRef.current 
          ? Date.now() - peerLeftTimeRef.current 
          : Infinity;
        
        if (timeSinceLeft < 30000) {
          console.log('[Videolify] Peer rejoined within 30s window - fast reconnect');
          peerLeftTimeRef.current = null;
        }

        // Always save remote peer ID if we don't have one yet
        if (!remotePeerIdRef.current) {
          remotePeerIdRef.current = data.peerId;
          console.log('[Videolify] Remote peer ID saved:', data.peerId);
        }
        
        // Check if connection exists
        const existingConnection = peerConnectionRef.current;
        
        // Check if connection is dead and needs recreation
        const isConnectionDead = existingConnection && (
          existingConnection.connectionState === 'closed' ||
          existingConnection.connectionState === 'failed' ||
          existingConnection.iceConnectionState === 'closed' ||
          existingConnection.iceConnectionState === 'failed' ||
          existingConnection.iceConnectionState === 'disconnected'
        );

        if (isConnectionDead) {
          console.log('[Videolify] 🔄 Connection is dead - recreating...', {
            connectionState: existingConnection.connectionState,
            iceConnectionState: existingConnection.iceConnectionState,
            peerId: data.peerId
          });
          
          // Close old connection properly
          existingConnection.close();
          peerConnectionRef.current = null;
          
          // Clear state for fresh reconnection
          makingOfferRef.current = false;
          ignoreOfferRef.current = false;
          
          // Recreate connection if we should initiate
          if (data.shouldInitiate) {
            console.log('[Videolify] Creating new connection to rejoining peer');
            await createPeerConnection(true);
          }
          return;
        }

        // If we don't have a connection yet AND server says initiate, create offer
        // This handles the case where WE are the EXISTING peer
        if (!peerConnectionRef.current && data.shouldInitiate) {
          console.log('[Videolify] Existing peer creating offer to new peer:', data.peerId);
          await createPeerConnection(true);
        } else if (peerConnectionRef.current) {
          // đŸ"„ F5 DETECTION: If we have a connection but to a DIFFERENT peer ID, close old and create new
          console.log('[Videolify] DEBUG - Checking F5 scenario:', {
            hasConnection: !!peerConnectionRef.current,
            currentRemotePeerId: remotePeerIdRef.current,
            newPeerId: data.peerId,
            isDifferent: remotePeerIdRef.current !== data.peerId,
          });
          
          if (remotePeerIdRef.current && remotePeerIdRef.current !== data.peerId) {
            console.log('[Videolify] 🔥 F5 detected - different peer ID joined, closing old connection', {
              oldPeerId: remotePeerIdRef.current,
              newPeerId: data.peerId,
            });
            
            // Close old connection
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
            
            // IMPORTANT: Clear remotePeerIdRef so we can accept offers from the new peer ID
            // The new remotePeerIdRef will be set when we receive their offer
            remotePeerIdRef.current = null;
            
            // Clear negotiation state
            makingOfferRef.current = false;
            ignoreOfferRef.current = false;
            
            // Don't create offer yet - wait for the refreshed peer to send their offer
            // This avoids targeting the wrong peer ID
            console.log('[Videolify] Waiting for offer from refreshed peer with new ID:', data.peerId);
          } else {
            console.log('[Videolify] Connection already exists, ignoring peer-joined');
          }
        } else {
          console.log('[Videolify] No initiate flag, waiting for their offer');
        }
      } catch (err) {
        console.error('[Videolify] Error handling peer-joined:', err);
      }
    });

    // Receive WebRTC offer
    eventSource.addEventListener('offer', async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Videolify] Received offer from peer', data.fromPeerId || 'unknown');

        // Deduplication: ignore if already processed
        if (data.messageId && receivedMessageIdsRef.current.has(data.messageId)) {
          console.log('[Videolify] Duplicate offer messageId, ignoring');
          return;
        }
        if (data.messageId) {
          receivedMessageIdsRef.current.add(data.messageId);
        }

        // If offer has toPeerId and it's not for us, ignore
        if (data.toPeerId && data.toPeerId !== peerIdRef.current) {
          console.log('[Videolify] Offer not for us (toPeerId:', data.toPeerId, '), ignoring');
          return;
        }

        // Create peer connection if we don't have one yet
        // Don't wait for media - it can be added later
        if (!peerConnectionRef.current) {
          console.log('[Videolify] No peer connection yet, creating one (answerer)');
          await createPeerConnection(false);
        }

        const pc = peerConnectionRef.current;
        if (!pc) {
          console.error('[Videolify] No RTCPeerConnection available to handle offer');
          return;
        }

        // Save remote peer ID and determine polite/impolite
        if (data.fromPeerId) {
          if (!remotePeerIdRef.current) {
            remotePeerIdRef.current = data.fromPeerId;
          }
          // Determine if this peer is polite (lexicographic comparison)
          isPolitePeerRef.current = peerIdRef.current < data.fromPeerId;
          console.log(`🤝 [Videolify] Peer role assigned: ${isPolitePeerRef.current ? 'POLITE' : 'IMPOLITE'} (local: ${peerIdRef.current}, remote: ${data.fromPeerId})`);
        }

        // Perfect Negotiation Pattern
        const offerCollision = pc.signalingState !== 'stable' || makingOfferRef.current;
        
        ignoreOfferRef.current = !isPolitePeerRef.current && offerCollision;
        if (ignoreOfferRef.current) {
          console.warn('⚠️ [Videolify] IMPOLITE peer ignoring colliding offer');
          return;
        }

        // Polite peer: rollback on collision ONLY if not already stable
        if (offerCollision && isPolitePeerRef.current) {
          console.log(`🔄 [Videolify] POLITE peer detected collision (signalingState: ${pc.signalingState}, makingOffer: ${makingOfferRef.current})`);
          
          // Only rollback if we're in a non-stable state (e.g., have-local-offer)
          if (pc.signalingState !== 'stable') {
            console.log('🔄 [Videolify] Performing rollback to accept incoming offer');
            try {
              await pc.setLocalDescription({ type: 'rollback' } as any);
              console.log('✅ [Videolify] Rollback successful, now in stable state');
            } catch (rbErr) {
              console.error('❌ [Videolify] Rollback failed:', rbErr);
              // If rollback fails and we're not stable, we can't proceed safely
              if (pc.signalingState !== 'stable') {
                console.error('❌ [Videolify] Cannot accept offer - signaling state unstable:', pc.signalingState);
                return;
              }
            }
          } else {
            console.log('ℹ️ [Videolify] Already in stable state, no rollback needed');
          }
          
          // Reset makingOffer flag after handling collision
          makingOfferRef.current = false;
        }

        // At this point we're either in stable state or we've rolled back and can accept the offer
        console.log(`[Videolify] Setting remote description (offer) - signalingState: ${pc.signalingState}`);
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

        // After setting remote description we should be in have-remote-offer
        console.log('[Videolify] signalingState after setRemoteDescription:', pc.signalingState);

        // Drain queued ICE candidates now that remote description is set
        if (iceQueueRef.current.length > 0) {
          console.log('[Videolify] Draining queued ICE candidates:', iceQueueRef.current.length);
          while (iceQueueRef.current.length > 0) {
            const cand = iceQueueRef.current.shift();
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {
              console.warn('[Videolify] Failed to add queued ICE candidate:', e);
            }
          }
        }

        if (pc.signalingState === 'have-remote-offer' || pc.remoteDescription) {
          console.log('[Videolify] Creating answer...');
          const answer = await pc.createAnswer();

          // Defensive: ensure signaling state is correct before setting local description
          if (pc.signalingState !== 'have-remote-offer') {
            console.warn('[Videolify] Unexpected signalingState before setLocalDescription:', pc.signalingState);
            // Don't proceed if state changed during async operations
            if (pc.signalingState === 'stable') {
              console.log('[Videolify] Already stable (likely answered elsewhere), skipping setLocalDescription');
              return;
            }
          }

          try {
            await pc.setLocalDescription(answer);
            console.log('[Videolify] Local description set (answer)');
          } catch (answerErr) {
            console.error('[Videolify] Failed to set local description (answer):', answerErr);
            // If we're already stable, this is expected (race condition with collision resolution)
            if (pc.signalingState === 'stable') {
              console.log('[Videolify] Ignoring setLocalDescription error - already in stable state');
              return;
            }
            throw answerErr; // Re-throw if it's an unexpected error
          }

          // Send answer back (targeted to fromPeerId) with unique messageId
          const messageId = `answer-${peerIdRef.current}-${Date.now()}`;
          await fetch('/api/videolify/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'answer',
              roomId,
              peerId: peerIdRef.current,
              data: { 
                answer,
                toPeerId: data.fromPeerId, // Send answer to whoever sent offer
                messageId,
              },
            }),
          });
          console.log('[Videolify] Answer sent to signaling server (targeted to:', data.fromPeerId, 'messageId:', messageId, ')');
        } else {
          console.warn('[Videolify] Remote description set but signaling state not in have-remote-offer - skipping answer');
        }
      } catch (err) {
        console.error('[Videolify] Error handling offer:', err);
        console.error('[Videolify] Offer error stack:', err instanceof Error ? err.stack : err);
      }
    });    // Receive WebRTC answer
    eventSource.addEventListener('answer', async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Videolify] Received answer from peer', data.fromPeerId || 'unknown');

        // Deduplication: ignore if already processed
        if (data.messageId && receivedMessageIdsRef.current.has(data.messageId)) {
          console.log('[Videolify] Duplicate answer messageId, ignoring');
          return;
        }
        if (data.messageId) {
          receivedMessageIdsRef.current.add(data.messageId);
        }

        // If answer has toPeerId and it's not for us, ignore
        if (data.toPeerId && data.toPeerId !== peerIdRef.current) {
          console.log('[Videolify] Answer not for us (toPeerId:', data.toPeerId, '), ignoring');
          return;
        }

        const pc = peerConnectionRef.current;
        if (pc) {
          // Check signaling state before setting remote description
          console.log(`[Videolify] Setting remote description (answer) - signalingState: ${pc.signalingState}`);
          
          // We should be in have-local-offer state to accept an answer
          if (pc.signalingState === 'have-local-offer') {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
              console.log('✅ [Videolify] Remote description (answer) set successfully');
            } catch (setErr) {
              console.error('[Videolify] Failed to set remote description (answer):', setErr);
              // If state changed during async operations, this is expected
              if (pc.signalingState === 'stable') {
                console.log('[Videolify] Ignoring setRemoteDescription error - already in stable state (race condition)');
                return;
              }
              throw setErr; // Re-throw if unexpected
            }
          } else if (pc.signalingState === 'stable') {
            console.warn('⚠️ [Videolify] Already in stable state, ignoring duplicate answer');
            return;
          } else {
            console.error(`❌ [Videolify] Unexpected signaling state for answer: ${pc.signalingState}`);
            return;
          }

          // Drain queued ICE candidates now that remote description is set
          if (iceQueueRef.current.length > 0) {
            console.log('[Videolify] Draining queued ICE candidates (answer):', iceQueueRef.current.length);
            while (iceQueueRef.current.length > 0) {
              const cand = iceQueueRef.current.shift();
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {
                console.warn('[Videolify] Failed to add queued ICE candidate (answer):', e);
              }
            }
          }

          negotiationInProgressRef.current = false;
        } else {
          console.log('[Videolify] Skipping answer - no peer connection');
        }
      } catch (err) {
        console.error('[Videolify] Error handling answer:', err);
        console.error('[Videolify] Answer error stack:', err instanceof Error ? err.stack : err);
        negotiationInProgressRef.current = false;
      }
    });

    // Receive ICE candidate
    eventSource.addEventListener('ice-candidate', async (event) => {
      try {
        const data = JSON.parse(event.data);
        const pc = peerConnectionRef.current;
        if (pc && pc.remoteDescription) {
          console.log('[Videolify] Adding ICE candidate');
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log('[Videolify] ICE candidate added successfully');
        } else {
          console.warn('[Videolify] Queuing ICE candidate - remote description not ready');
          // Queue ICE candidates until remoteDescription is set
          iceQueueRef.current.push(data.candidate);
        }
      } catch (err) {
        console.error('[Videolify] Error adding ICE candidate:', err);
      }
    });

    // Peer left
    eventSource.addEventListener('peer-left', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.peerId === remotePeerIdRef.current) {
          console.log('[Videolify] Peer left - initiating graceful disconnect');
          
          // Mark when peer left for rejoin window
          peerLeftTimeRef.current = Date.now();
          
          // Close peer connection gracefully
          const pc = peerConnectionRef.current;
          if (pc) {
            console.log('[Videolify] Closing peer connection gracefully');
            
            // Close data channels
            if (chatChannelRef.current) {
              chatChannelRef.current.close();
              chatChannelRef.current = null;
            }
            if (whiteboardChannelRef.current) {
              whiteboardChannelRef.current.close();
              whiteboardChannelRef.current = null;
            }
            if (controlChannelRef.current) {
              controlChannelRef.current.close();
              controlChannelRef.current = null;
            }
            
            // Close peer connection
            pc.close();
            peerConnectionRef.current = null;
          }
          
          // Clear remote video
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          
          // Clear remote peer ID (but keep in ref for potential rejoin)
          const oldRemotePeerId = remotePeerIdRef.current;
          remotePeerIdRef.current = null;
          
          // Show notification
          setIsConnecting(true);
          // Set 30s rejoin window
          setTimeout(() => {
            const timeSinceLeft = peerLeftTimeRef.current 
              ? Date.now() - peerLeftTimeRef.current 
              : 0;
            
            if (timeSinceLeft < 35000 && !remotePeerIdRef.current) {
              // Peer didn't rejoin within 30s
              console.log('[Videolify] Peer did not rejoin within 30s');
              peerLeftTimeRef.current = null;
            }
          }, 30000);
        }
      } catch (err) {
        console.error('[Videolify] Error handling peer-left:', err);
      }
    });
    eventSource.onerror = (error) => {
      console.error('[Videolify] SSE error:', error);
      
      const attempts = sseReconnectAttemptsRef.current;
      const maxAttempts = 10;
      
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
      const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
      
      if (attempts < maxAttempts) {
        console.log(`[Videolify] Signaling disconnected - reconnecting in ${delay/1000}s (Attempt ${attempts + 1}/${maxAttempts})`);
        
        setTimeout(() => {
          if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
            sseReconnectAttemptsRef.current++;
            connectSSE();
          }
        }, delay);
      } else {
        // Max retries exceeded - check if network is online
        if (navigator.onLine) {
          // Network is online but SSE failed - likely server restart
          console.warn('[Videolify] SSE failed with network online - assuming server restart');
          
          // Reset counter and retry indefinitely every 10s during server restart
          sseReconnectAttemptsRef.current = 0;
          
          const serverRestartRetry = () => {
            if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
              console.log('[Videolify] Retrying SSE connection during server restart');
              sseReconnectAttemptsRef.current = 0; // Keep resetting to allow infinite retries
              connectSSE();
            }
          };
          
          setTimeout(serverRestartRetry, 10000); // Retry every 10s
        } else {
          // Network offline - trigger full reconnect when back online
          console.log('[Videolify] Network offline - will reconnect when network restored');
        }
      }
    };
  }

  /**
   * 3. Join room via REST API
   */
  async function joinRoom() {
    try {
      console.log('[Videolify] Joining room:', roomId, 'as peer:', peerIdRef.current);
      
      const response = await fetch('/api/videolify/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          roomId,
          peerId: peerIdRef.current,
          data: { userName: userDisplayName, role },
        }),
      });

      const result = await response.json();
      console.log('[Videolify] Joined room:', result);

      // ALWAYS try to create offer if there are existing peers
      // Both peers will create offers → Perfect Negotiation handles collision
      if (result.peers && result.peers.length > 0) {
        // Filter out ourselves from the peers list
        const otherPeers = result.peers.filter((p: any) => p.peerId !== peerIdRef.current);
        
        if (otherPeers.length > 0) {
          remotePeerIdRef.current = otherPeers[0].peerId;
          console.log('[Videolify] Found existing peer:', remotePeerIdRef.current);
          
          // Create connection IMMEDIATELY - don't wait for media
          // Media will be added when ready (tracks can be added later)
          console.log('[Videolify] Creating offer to existing peer (media will follow):', remotePeerIdRef.current);
          await createPeerConnection(true);
        } else {
          console.log('[Videolify] No other peers (only ourselves), waiting for someone to join');
        }
      } else {
        console.log('[Videolify] No existing peers, waiting for someone to join');
      }
    } catch (err) {
      console.error('[Videolify] Error joining room:', err);
      setError('Không thể kết nối phòng học');
    }
  }

  /**
   * 4. Create WebRTC Peer Connection with DATA CHANNELS
   * ALL features P2P - NO SERVER!
   */
  async function createPeerConnection(createOffer: boolean) {
    try {
      console.log(`[Videolify] Creating peer connection, createOffer: ${createOffer}`);
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Add local media tracks
      if (localStreamRef.current) {
        const tracks = localStreamRef.current.getTracks();
        console.log(`[Videolify] Adding ${tracks.length} local tracks to peer connection`);
        tracks.forEach(track => {
          console.log(`[Videolify] Adding track: ${track.kind}`);
          pc.addTrack(track, localStreamRef.current!);
        });
      } else {
        console.warn('[Videolify] No local stream available to add tracks!');
      }

      // Receive remote media
      pc.ontrack = (event) => {
        console.log('[Videolify] ontrack event fired!');
        console.log('[Videolify] Track kind:', event.track.kind);
        console.log('[Videolify] Streams:', event.streams);
        console.log('[Videolify] remoteVideoRef.current:', remoteVideoRef.current);
        
        if (event.streams && event.streams[0]) {
          // Attach stream to remote video element
          const attachStream = () => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = event.streams[0];
              console.log('✅ [Videolify] Remote video stream attached');
              return true;
            }
            return false;
          };
          
          // Try to attach immediately
          if (!attachStream()) {
            // If ref not ready, retry a few times (React might still be rendering)
            console.warn('[Videolify] Remote video ref not ready, retrying...');
            let retries = 0;
            const retryInterval = setInterval(() => {
              if (attachStream() || retries++ > 10) {
                clearInterval(retryInterval);
                if (retries > 10) {
                  console.error('[Videolify] Failed to attach stream after retries');
                }
              }
            }, 100); // Try every 100ms for up to 1 second
          }
        } else {
          console.warn('[Videolify] No stream in ontrack event');
        }
        setIsConnecting(false);
      };

      // ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('[Videolify] Sending ICE candidate to signaling server');
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
          console.log('[Videolify] ICE candidate sent');
        } else {
          console.log('[Videolify] ICE gathering complete (null candidate)');
          // Clear gathering timeout when complete
          if (iceGatheringTimeoutRef.current) {
            clearTimeout(iceGatheringTimeoutRef.current);
            iceGatheringTimeoutRef.current = null;
          }
        }
      };

      // ICE Gathering State - timeout detection
      pc.onicegatheringstatechange = () => {
        console.log('[Videolify] ICE gathering state:', pc.iceGatheringState);
        
        if (pc.iceGatheringState === 'gathering') {
          // Set timeout for stuck ICE gathering
          iceGatheringTimeoutRef.current = setTimeout(() => {
            if (pc.iceGatheringState === 'gathering') {
              console.warn('⚠️ [Videolify] ICE gathering stuck >15s - forcing completion');
              
              // If gathering fails, trigger ICE restart
              setTimeout(() => {
                if (pc.iceGatheringState === 'gathering' || pc.iceConnectionState === 'failed') {
                  console.error('[Videolify] ICE gathering failed - triggering restart');
                  handleICEFailure(pc);
                }
              }, 5000); // Give 5 more seconds before forcing restart
            }
          }, 15000); // 15 seconds
        } else if (pc.iceGatheringState === 'complete') {
          console.log('✅ [Videolify] ICE gathering completed successfully');
          if (iceGatheringTimeoutRef.current) {
            clearTimeout(iceGatheringTimeoutRef.current);
            iceGatheringTimeoutRef.current = null;
          }
        }
      };

      // Connection state
      pc.onconnectionstatechange = () => {
        console.log('[Videolify] Connection state:', pc.connectionState);
        
        if (pc.connectionState === 'connected') {
          console.log('✅ [Videolify] P2P Connection Established - Server load now 0%');
          setIsConnecting(false);
          setWasConnected(true); // Mark that connection was established
          setConnectionStats(prev => ({ ...prev, connected: true }));
          negotiationInProgressRef.current = false;
          
          // Reset all retry counters on successful connection
          iceRestartAttemptsRef.current = 0;
          sseReconnectAttemptsRef.current = 0;
        } else if (pc.connectionState === 'connecting') {
          console.log('🔄 [Videolify] Connection establishing...');
          setIsConnecting(true);
        } else if (pc.connectionState === 'disconnected') {
          console.warn('⚠️ [Videolify] Connection disconnected - waiting 10s before retry');
          setConnectionStats(prev => ({ ...prev, connected: false }));
          setIsConnecting(true);
          
          // Wait 10s to see if it recovers naturally
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            if (pc.connectionState === 'disconnected') {
              console.log('[Videolify] Still disconnected after 10s, triggering ICE restart');
              handleICEFailure(pc);
            }
          }, 10000);
        } else if (pc.connectionState === 'failed') {
          console.error('❌ [Videolify] Connection FAILED - triggering full reconnect');
          setConnectionStats(prev => ({ ...prev, connected: false }));
          negotiationInProgressRef.current = false;
          
          // Connection state 'failed' is terminal - trigger full reconnect immediately
          fullReconnect();
        } else if (pc.connectionState === 'closed') {
          console.log('[Videolify] Connection closed');
          setConnectionStats(prev => ({ ...prev, connected: false }));
          setIsConnecting(false);
        }
      };

      // ICE connection state (more detailed)
      pc.oniceconnectionstatechange = () => {
        console.log('[Videolify] ICE connection state:', pc.iceConnectionState);
        setConnectionStats(prev => ({ ...prev, iceState: pc.iceConnectionState }));
        
        // Auto-retry on ICE failure
        if (pc.iceConnectionState === 'failed') {
          console.error('❌ [Videolify] ICE Connection FAILED - attempting recovery');
          handleICEFailure(pc);
        } else if (pc.iceConnectionState === 'disconnected') {
          console.warn('⚠️ [Videolify] ICE Disconnected - monitoring for recovery');
          // Give it 5s to recover naturally before forcing restart
          reconnectTimeoutRef.current = setTimeout(() => {
            if (pc.iceConnectionState === 'disconnected') {
              console.warn('[Videolify] ICE still disconnected after 5s, forcing restart');
              handleICEFailure(pc);
            }
          }, 5000);
        } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          console.log('✅ [Videolify] ICE Connection established/restored');
          iceRestartAttemptsRef.current = 0; // Reset counter on success
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        }
      };

      // CREATE DATA CHANNELS (P2P - KEY FEATURE!)
      setupDataChannels(pc, createOffer);

      // Create offer if initiating
      if (createOffer) {
        console.log('[Videolify] Creating and sending offer to remotePeer:', remotePeerIdRef.current);
        
        if (!remotePeerIdRef.current) {
          console.error('[Videolify] ERROR: Cannot create offer - no remote peer ID!');
          setError('Lỗi: Không tìm thấy peer để kết nối');
          return;
        }
        
        makingOfferRef.current = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        makingOfferRef.current = false;
        console.log('[Videolify] Local description set (offer)');

        // Send offer with target peer and unique messageId
        const messageId = `offer-${peerIdRef.current}-${Date.now()}`;
        await fetch('/api/videolify/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'offer',
            roomId,
            peerId: peerIdRef.current,
            data: { 
              offer,
              toPeerId: remotePeerIdRef.current,
              messageId,
            },
          }),
        });
        console.log('[Videolify] Offer sent to:', remotePeerIdRef.current, 'with messageId:', messageId);
      } else {
        console.log('[Videolify] Waiting to receive offer (answerer mode)');
      }
    } catch (err) {
      console.error('[Videolify] Error creating peer connection:', err);
      setError('Không thể tạo kết nối');
    }
  }

  /**
   * 5. Setup Data Channels - ALL P2P!
   * Whiteboard, Chat, Controls - NO SERVER RELAY
   */
  function setupDataChannels(pc: RTCPeerConnection, createChannels: boolean) {
    // Set timeout to detect failed DataChannel creation
    const channelTimeout = setTimeout(() => {
      console.warn('[Videolify] DataChannels not opening - connection may have issues');
      
      // Check channel states
      const channels = {
        whiteboard: whiteboardChannelRef.current?.readyState,
        chat: chatChannelRef.current?.readyState,
        control: controlChannelRef.current?.readyState,
        file: fileChannelRef.current?.readyState,
      };
      
      console.log('[Videolify] Channel states after timeout:', channels);
      
      // If no channels are open, attempt reconnection
      const anyOpen = Object.values(channels).some(state => state === 'open');
      if (!anyOpen && peerConnectionRef.current && remotePeerIdRef.current) {
        console.log('[Videolify] No DataChannels open - attempting ICE restart');
        // Trigger ICE restart (will be handled by connection recovery logic)
      }
    }, 10000);
    
    channelTimeoutsRef.current.dataChannel = channelTimeout;
    
    if (createChannels) {
      // Create channels (offerer)
      whiteboardChannelRef.current = pc.createDataChannel('whiteboard');
      chatChannelRef.current = pc.createDataChannel('chat');
      controlChannelRef.current = pc.createDataChannel('control');
      fileChannelRef.current = pc.createDataChannel('file');

      setupWhiteboardChannel(whiteboardChannelRef.current);
      setupChatChannel(chatChannelRef.current);
      setupControlChannel(controlChannelRef.current);
      setupFileChannel(fileChannelRef.current);
    } else {
      // Receive channels (answerer)
      pc.ondatachannel = (event) => {
        const channel = event.channel;
        
        if (channel.label === 'whiteboard') {
          whiteboardChannelRef.current = channel;
          setupWhiteboardChannel(channel);
        } else if (channel.label === 'chat') {
          chatChannelRef.current = channel;
          setupChatChannel(channel);
        } else if (channel.label === 'control') {
          controlChannelRef.current = channel;
          setupControlChannel(channel);
        } else if (channel.label === 'file') {
          fileChannelRef.current = channel;
          setupFileChannel(channel);
        }
      };
    }
  }

  /**
   * 6. Whiteboard Data Channel - P2P Drawing
   */
  function setupWhiteboardChannel(channel: RTCDataChannel) {
    console.log('🎨 [Videolify] Setting up whiteboard channel, current state:', channel.readyState);
    setChannelStates(prev => ({ ...prev, whiteboard: channel.readyState }));
    
    channel.onopen = () => {
      console.log('✅ [Videolify] Whiteboard DataChannel OPEN - Ready for P2P drawing');
      setChannelStates(prev => ({ ...prev, whiteboard: 'open' }));
      setIsWhiteboardReady(true); // NEW: Signal whiteboard is ready
      
      // Clear timeout since channel opened successfully
      if (channelTimeoutsRef.current.dataChannel) {
        clearTimeout(channelTimeoutsRef.current.dataChannel);
      }
      
      // Initialize whiteboard if not already initialized
      if (!whiteboardFabricRef.current && showWhiteboard) {
        initializeWhiteboard();
      }
      
      // Drain queued whiteboard events
      if (whiteboardQueueRef.current.length > 0) {
        console.log('📤 [Videolify] Draining queued whiteboard events:', whiteboardQueueRef.current.length);
        const queuedEvents = [...whiteboardQueueRef.current];
        whiteboardQueueRef.current = [];
        
        queuedEvents.forEach((evt, index) => {
          try {
            if (channel.readyState === 'open') {
              channel.send(evt);
              console.log(`✅ [Videolify] Sent queued event ${index + 1}/${queuedEvents.length}`);
            } else {
              console.warn(`⚠️ [Videolify] Channel closed while draining, re-queuing event ${index + 1}`);
              whiteboardQueueRef.current.push(evt);
            }
          } catch (e) {
            console.error(`❌ [Videolify] Failed to send queued event ${index + 1}:`, e);
            whiteboardQueueRef.current.push(evt);
          }
        });
      }
    };

    channel.onclose = () => {
      console.warn('⚠️ [Videolify] Whiteboard DataChannel CLOSED');
      setChannelStates(prev => ({ ...prev, whiteboard: 'closed' }));
      setIsWhiteboardReady(false);
      
      // Try to recreate channel if peer connection is still connected
      const pc = peerConnectionRef.current;
      if (pc && (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed')) {
        console.log('[Videolify] Attempting to recreate whiteboard channel...');
        
        setTimeout(() => {
          try {
            const newChannel = pc.createDataChannel('whiteboard');
            whiteboardChannelRef.current = newChannel;
            setupWhiteboardChannel(newChannel);
          } catch (e) {
            console.error('[Videolify] Failed to recreate whiteboard channel:', e);
            handleICEFailure(pc);
          }
        }, 1000);
      }
    };

    channel.onerror = (error) => {
      console.error('❌ [Videolify] Whiteboard DataChannel ERROR:', error);
    };

    channel.onmessage = (event) => {
      try {
        const drawEvent: DrawEvent = JSON.parse(event.data);
        console.log('📥 [Videolify] Whiteboard event RECEIVED:', drawEvent.type);
        applyDrawEvent(drawEvent);
      } catch (e) {
        console.error('❌ [Videolify] Failed to parse whiteboard event:', e);
      }
    };
  }

  function initializeWhiteboard() {
    if (!whiteboardCanvasRef.current || whiteboardFabricRef.current) return;

    console.log('🎨 [Videolify] Initializing whiteboard canvas');
    const canvas = new fabric.Canvas(whiteboardCanvasRef.current, {
      width: 1280,
      height: 720,
      isDrawingMode: true,
    });

    canvas.freeDrawingBrush.width = 2;
    canvas.freeDrawingBrush.color = '#000000';

    // Load saved canvas state from localStorage
    const savedCanvas = localStorage.getItem(`whiteboard-${roomId}`);
    if (savedCanvas) {
      try {
        canvas.loadFromJSON(savedCanvas, () => {
          canvas.renderAll();
          console.log('✅ [Videolify] Loaded saved whiteboard state');
        });
      } catch (e) {
        console.error('❌ [Videolify] Failed to load saved canvas:', e);
      }
    }

    // Send drawing events P2P
    canvas.on('path:created', (e: any) => {
      const path = e.path;
      // Assign unique ID to each object for eraser
      path.set('id', `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
      
      sendDrawEvent({
        type: 'draw',
        data: path.toJSON(['id']), // Include custom 'id' property
      });
      console.log('✏️ [Videolify] Drawing sent via P2P');
      
      // Save canvas state
      saveCanvasState(canvas);
    });

    // Handle object removal (for eraser mode)
    canvas.on('object:removed', (e: any) => {
      const obj = e.target;
      if (obj && obj.id) {
        sendDrawEvent({
          type: 'erase',
          objectId: obj.id,
        });
        console.log('🗑️ [Videolify] Erase event sent for object:', obj.id);
      }
      
      // Save canvas state
      saveCanvasState(canvas);
    });

    whiteboardFabricRef.current = canvas;
    console.log('✅ [Videolify] Whiteboard ready');
  }

  // Debounced save function
  const saveCanvasState = useCallback((canvas: fabric.Canvas) => {
    if (!canvas) return;
    
    // Debounce save to avoid too frequent saves
    const timeoutId = setTimeout(() => {
      try {
        const json = JSON.stringify(canvas.toJSON(['id'])); // Include custom 'id' property
        localStorage.setItem(`whiteboard-${roomId}`, json);
        console.log('💾 [Videolify] Canvas state saved to localStorage');
      } catch (e) {
        console.error('❌ [Videolify] Failed to save canvas:', e);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [roomId]);

  function sendDrawEvent(event: DrawEvent) {
    const data = JSON.stringify(event);
    const channel = whiteboardChannelRef.current;
    
    // Max queue size to prevent memory issues
    const MAX_QUEUE_SIZE = 100;
    
    if (!channel) {
      console.warn('⚠️ [Videolify] Whiteboard channel not created yet - queueing event');
      if (whiteboardQueueRef.current.length < MAX_QUEUE_SIZE) {
        whiteboardQueueRef.current.push(data);
      } else {
        console.error('❌ [Videolify] Queue full! Dropping event:', event.type);
        toast({
          title: '⚠️ Bảng trắng chưa sẵn sàng',
          description: 'Vui lòng đợi kết nối hoàn tất',
          variant: 'destructive',
          duration: 3000,
        });
      }
      return;
    }
    
    if (channel.readyState === 'open') {
      try {
        channel.send(data);
        console.log('✅ [Videolify] Draw event SENT immediately, type:', event.type);
      } catch (e) {
        console.error('❌ [Videolify] Failed to send draw event:', e);
        if (whiteboardQueueRef.current.length < MAX_QUEUE_SIZE) {
          whiteboardQueueRef.current.push(data);
        }
      }
    } else {
      console.warn(`⚠️ [Videolify] Channel state is "${channel.readyState}" - queueing event (type: ${event.type})`);
      if (whiteboardQueueRef.current.length < MAX_QUEUE_SIZE) {
        whiteboardQueueRef.current.push(data);
        console.log(`📋 [Videolify] Queue size now: ${whiteboardQueueRef.current.length} events`);
      } else {
        console.error('❌ [Videolify] Queue full! Dropping event');
        toast({
          title: '⚠️ Quá nhiều vẽ chưa gửi',
          description: 'Kết nối bảng trắng gặp vấn đề',
          variant: 'destructive',
          duration: 3000,
        });
      }
    }
  }

  function applyDrawEvent(event: DrawEvent) {
    const canvas = whiteboardFabricRef.current;
    if (!canvas) return;

    if (event.type === 'draw' && event.data) {
      fabric.util.enlivenObjects(
        [event.data],
        (objects: fabric.Object[]) => {
          objects.forEach((obj) => canvas.add(obj));
          canvas.renderAll();
        },
        ''
      );
      console.log('🎨 [Videolify] Remote drawing applied to canvas');
      saveCanvasState(canvas);
    } else if (event.type === 'erase' && event.objectId) {
      // Find and remove object by ID
      const objects = canvas.getObjects();
      const objToRemove = objects.find((obj: any) => obj.id === event.objectId);
      if (objToRemove) {
        canvas.remove(objToRemove);
        canvas.renderAll();
        console.log('🗑️ [Videolify] Remote erase applied, removed object:', event.objectId);
        saveCanvasState(canvas);
      }
    } else if (event.type === 'clear') {
      canvas.clear();
      console.log('🧹 [Videolify] Whiteboard cleared');
      localStorage.removeItem(`whiteboard-${roomId}`);
    }
  }

  /**
   * Connection Recovery Functions
   */
  async function handleICEFailure(pc: RTCPeerConnection) {
    const MAX_ICE_RETRIES = 3;
    iceRestartAttemptsRef.current++;
    
    if (iceRestartAttemptsRef.current > MAX_ICE_RETRIES) {
      console.error(`❌ [Videolify] ICE restart failed ${MAX_ICE_RETRIES} times, attempting full rejoin`);
      
      // Full rejoin as last resort
      await fullReconnect();
      return;
    }
    
    const backoffDelay = Math.min(1000 * Math.pow(2, iceRestartAttemptsRef.current - 1), 10000);
    console.log(`🔄 [Videolify] ICE restart attempt ${iceRestartAttemptsRef.current}/${MAX_ICE_RETRIES}, delay: ${backoffDelay}ms`);
    
    setTimeout(async () => {
      try {
        if (!pc || pc.connectionState === 'closed') {
          console.warn('[Videolify] PeerConnection closed, cannot restart ICE');
          return;
        }
        
        console.log('[Videolify] Creating ICE restart offer...');
        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(offer);
        
        if (!remotePeerIdRef.current) {
          console.error('[Videolify] No remote peer for ICE restart');
          return;
        }
        
        const messageId = `ice-restart-${peerIdRef.current}-${Date.now()}`;
        await fetch('/api/videolify/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'offer',
            roomId,
            peerId: peerIdRef.current,
            data: { 
              offer,
              toPeerId: remotePeerIdRef.current,
              messageId,
            },
          }),
        });
        console.log('✅ [Videolify] ICE restart offer sent');
      } catch (err) {
        console.error('❌ [Videolify] ICE restart failed:', err);
        handleICEFailure(pc); // Retry
      }
    }, backoffDelay);
  }

  async function fullReconnect() {
    console.log('🔄 [Videolify] Starting full reconnect...');
    
    // Cleanup existing connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    // Reset state
    iceRestartAttemptsRef.current = 0;
    sseReconnectAttemptsRef.current = 0;
    hasJoinedRef.current = false;
    remotePeerIdRef.current = null;
    
    // Reconnect
    try {
      connectSSE();
      await joinRoom();
    } catch (err) {
      console.error('❌ [Videolify] Full reconnect failed:', err);
      setError('Không thể kết nối lại. Vui lòng tải lại trang.');
    }
  }

  function startHeartbeat() {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      const channel = controlChannelRef.current;
      if (channel && channel.readyState === 'open') {
        try {
          const ping = { type: 'ping', timestamp: Date.now() };
          channel.send(JSON.stringify(ping));
          
          // Check if last pong was too long ago
          const timeSinceLastPong = Date.now() - lastPongTimeRef.current;
          if (timeSinceLastPong > 15000) {
            console.warn(`⚠️ [Videolify] No pong received for ${timeSinceLastPong}ms - connection may be dead`);
            
            // If no pong for 30s, assume dead
            if (timeSinceLastPong > 30000 && peerConnectionRef.current) {
              console.error('❌ [Videolify] Heartbeat timeout - triggering ICE restart');
              handleICEFailure(peerConnectionRef.current);
            }
          }
        } catch (e) {
          console.error('❌ [Videolify] Failed to send heartbeat:', e);
        }
      }
    }, 5000); // Ping every 5s
  }

  /**
   * 7. Chat Data Channel - P2P Messages
   */
  function setupChatChannel(channel: RTCDataChannel) {
    console.log('💬 [Videolify] Setting up chat channel, current state:', channel.readyState);
    setChannelStates(prev => ({ ...prev, chat: channel.readyState }));
    
    channel.onopen = () => {
      console.log('✅ [Videolify] Chat DataChannel OPEN - Ready for P2P messaging');
      setChannelStates(prev => ({ ...prev, chat: 'open' }));
      
      // Drain any queued outgoing chat messages
      if (outgoingChatQueueRef.current.length > 0) {
        console.log('📤 [Videolify] Sending queued chat messages:', outgoingChatQueueRef.current.length);
        while (outgoingChatQueueRef.current.length > 0) {
          const raw = outgoingChatQueueRef.current.shift();
          if (!raw) break;
          try {
            channel.send(raw);
          } catch (e) {
            console.warn('[Videolify] Failed to send queued chat message:', e);
            // re-queue and break to avoid tight loop
            outgoingChatQueueRef.current.unshift(raw);
            break;
          }
        }
      }
    };

    channel.onclose = () => {
      console.warn('⚠️ [Videolify] Chat DataChannel CLOSED');
      setChannelStates(prev => ({ ...prev, chat: 'closed' }));
      
      // Try to recreate channel if peer connection is still connected
      const pc = peerConnectionRef.current;
      if (pc && (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed')) {
        console.log('[Videolify] Attempting to recreate chat channel...');
        
        setTimeout(() => {
          try {
            const newChannel = pc.createDataChannel('chat');
            chatChannelRef.current = newChannel;
            setupChatChannel(newChannel);
          } catch (e) {
            console.error('[Videolify] Failed to recreate chat channel:', e);
            handleICEFailure(pc);
          }
        }, 1000);
      }
    };

    channel.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const latency = Date.now() - msg.timestamp;
      console.log(`📥 [Videolify] Chat message received, latency: ${latency}ms`);
      setChatMessages(prev => [...prev, {
        ...msg,
        fromMe: false,
      }]);
    };
  }

  function sendChatMessage() {
    if (!chatInput.trim() || !chatChannelRef.current) return;

    // If channel not ready, queue the message so it is sent when channel opens
    if (chatChannelRef.current.readyState !== 'open') {
      console.warn('[Videolify] Chat channel not ready - queueing message');
      const message: ChatMessage = {
        userName: userDisplayName,
        message: chatInput,
        timestamp: Date.now(),
        fromMe: true,
      };
      outgoingChatQueueRef.current.push(JSON.stringify(message));
      setChatMessages(prev => [...prev, message]);
      setChatInput('');
      return;
    }

    const message: ChatMessage = {
      userName: userDisplayName,
      message: chatInput,
      timestamp: Date.now(),
      fromMe: true,
    };

    chatChannelRef.current.send(JSON.stringify(message));
    setChatMessages(prev => [...prev, message]);
    setChatInput('');
    console.log('💬 [Videolify] Chat message sent');
  }

  /**
   * 8. Control Data Channel - Hand Raise, etc
   */
  function setupControlChannel(channel: RTCDataChannel) {
    console.log('🎛️ [Videolify] Setting up control channel, current state:', channel.readyState);
    setChannelStates(prev => ({ ...prev, control: channel.readyState }));
    
    channel.onopen = () => {
      console.log('✅ [Videolify] Control DataChannel OPEN');
      setChannelStates(prev => ({ ...prev, control: 'open' }));
      
      // Start heartbeat when control channel is ready
      startHeartbeat();
      
      // Drain queued control messages
      if (controlQueueRef.current.length > 0) {
        console.log('📤 [Videolify] Sending queued control messages:', controlQueueRef.current.length);
        while (controlQueueRef.current.length > 0) {
          const msg = controlQueueRef.current.shift();
          if (!msg) break;
          try {
            channel.send(msg);
          } catch (e) {
            console.warn('[Videolify] Failed to send queued control message:', e);
            controlQueueRef.current.unshift(msg);
            break;
          }
        }
      }
    };

    channel.onclose = () => {
      console.warn('⚠️ [Videolify] Control DataChannel CLOSED');
      setChannelStates(prev => ({ ...prev, control: 'closed' }));
      
      // Stop heartbeat when channel closes
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      // Try to recreate channel if peer connection is still connected
      const pc = peerConnectionRef.current;
      if (pc && (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed')) {
        console.log('[Videolify] Attempting to recreate control channel...');
        toast({
          title: "Control channel reconnecting...",
          description: "Attempting to restore control connection",
        });
        
        setTimeout(() => {
          try {
            const newChannel = pc.createDataChannel('control');
            controlChannelRef.current = newChannel;
            setupControlChannel(newChannel);
          } catch (e) {
            console.error('[Videolify] Failed to recreate control channel:', e);
            // If recreation fails, trigger ICE restart
            handleICEFailure(pc);
          }
        }, 1000);
      }
    };

    channel.onmessage = (event) => {
      const control = JSON.parse(event.data);
      console.log('📥 [Videolify] Control message received:', control.type);
      
      if (control.type === 'ping') {
        // Respond with pong
        try {
          const pong = { type: 'pong', timestamp: Date.now() };
          channel.send(JSON.stringify(pong));
        } catch (e) {
          console.error('❌ [Videolify] Failed to send pong:', e);
        }
      } else if (control.type === 'pong') {
        // Update last pong time
        lastPongTimeRef.current = Date.now();
        const latency = Date.now() - control.timestamp;
        if (latency > 500) {
          console.warn(`⚠️ [Videolify] High latency: ${latency}ms`);
        }
      } else if (control.type === 'hand-raise') {
        setRemoteHandRaised(control.raised);
      }
    };
  }

  function toggleHandRaise() {
    const newState = !handRaised;
    setHandRaised(newState);
    console.log(`✋ [Videolify] Hand ${newState ? 'RAISED' : 'LOWERED'}`);

    const msg = JSON.stringify({
      type: 'hand-raise',
      raised: newState,
    });

    if (controlChannelRef.current?.readyState === 'open') {
      controlChannelRef.current.send(msg);
    } else {
      console.warn('[Videolify] Control channel not ready - queueing hand raise');
      controlQueueRef.current.push(msg);
    }
  }

  /**
   * 10. File Sharing Data Channel - P2P Transfer
   */
  const CHUNK_SIZE = 16384; // 16KB chunks

  function setupFileChannel(channel: RTCDataChannel) {
    console.log('📁 [Videolify] Setting up file channel, current state:', channel.readyState);
    setChannelStates(prev => ({ ...prev, file: channel.readyState }));
    
    channel.onopen = () => {
      console.log('✅ [Videolify] File DataChannel OPEN - Ready for P2P file transfer');
      setChannelStates(prev => ({ ...prev, file: 'open' }));
    };

    channel.onclose = () => {
      console.warn('⚠️ [Videolify] File DataChannel CLOSED');
      setChannelStates(prev => ({ ...prev, file: 'closed' }));
    };

    channel.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        // Metadata or control message
        const msg = JSON.parse(event.data);
        console.log('📥 [Videolify] File control message:', msg.type);
        
        if (msg.type === 'file-offer') {
          console.log('[Videolify] File offer received:', msg.metadata.fileName, 
            `(${(msg.metadata.fileSize / 1024 / 1024).toFixed(2)} MB)`);
          handleFileOffer(msg.metadata);
        } else if (msg.type === 'file-accept') {
          console.log('[Videolify] File accepted, starting P2P transfer...');
          startFileSending(msg.fileId);
        } else if (msg.type === 'file-reject') {
          console.log('[Videolify] File rejected by peer');
          setOutgoingFile(null);
        }
      } else {
        // File chunk (ArrayBuffer)
        handleFileChunk(event.data);
      }
    };
  }

  function handleFileOffer(metadata: FileMetadata) {
    // Show incoming file notification
    setIncomingFile({
      metadata,
      chunks: [],
      receivedChunks: 0,
      progress: 0,
      status: 'pending',
    });
    setShowFileTransfer(true);
  }

  function acceptFile() {
    if (!incomingFile || !fileChannelRef.current) return;

    setIncomingFile(prev => prev ? { ...prev, status: 'transferring' } : null);

    fileChannelRef.current.send(JSON.stringify({
      type: 'file-accept',
      fileId: incomingFile.metadata.fileId,
    }));
  }

  function rejectFile() {
    if (!incomingFile || !fileChannelRef.current) return;

    fileChannelRef.current.send(JSON.stringify({
      type: 'file-reject',
      fileId: incomingFile.metadata.fileId,
    }));

    setIncomingFile(null);
  }

  async function sendFile(file: File) {
    if (!fileChannelRef.current || fileChannelRef.current.readyState !== 'open') {
      alert('File channel chưa sẵn sàng. Vui lòng đợi kết nối.');
      return;
    }

    // Validate file size (warn for large files)
    const maxSafeSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSafeSize) {
      if (!confirm(`File rất lớn (${(file.size / 1024 / 1024).toFixed(2)} MB). Việc truyền có thể mất nhiều thời gian. Tiếp tục?`)) {
        return;
      }
    }

    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    const metadata: FileMetadata = {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      totalChunks,
    };

    // Send offer
    fileChannelRef.current.send(JSON.stringify({
      type: 'file-offer',
      metadata,
    }));

    // Setup outgoing file state
    setOutgoingFile({
      metadata,
      chunks: [],
      receivedChunks: 0,
      progress: 0,
      status: 'pending',
    });

    // Store file for sending
    (window as any).__pendingFile = file;
    setShowFileTransfer(true);
  }

  async function startFileSending(fileId: string) {
    const file = (window as any).__pendingFile as File;
    if (!file || !fileChannelRef.current) return;

    console.log(`[Videolify] Starting P2P file transfer: ${file.name}`);
    const startTime = performance.now();

    setOutgoingFile(prev => prev ? { ...prev, status: 'transferring' } : null);

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const arrayBuffer = await chunk.arrayBuffer();

      // Check buffer size before sending (prevent overflow)
      const channel = fileChannelRef.current;
      while (channel.bufferedAmount > CHUNK_SIZE * 10) {
        // Wait for buffer to drain
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Send chunk P2P
      channel.send(arrayBuffer);

      // Update progress
      const progress = Math.round(((i + 1) / totalChunks) * 100);
      setOutgoingFile(prev => prev ? { ...prev, progress } : null);

      // Small delay to avoid buffer overflow
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000; // seconds
    const speed = (file.size / 1024 / 1024) / duration; // MB/s
    console.log(`✅ [Videolify] File sent successfully in ${duration.toFixed(2)}s, speed: ${speed.toFixed(2)} MB/s`);

    setOutgoingFile(prev => prev ? { ...prev, status: 'completed', progress: 100 } : null);
    delete (window as any).__pendingFile;
  }

  function handleFileChunk(arrayBuffer: ArrayBuffer) {
    if (!incomingFile) return;

    const chunks = [...incomingFile.chunks, arrayBuffer];
    const receivedChunks = chunks.length;
    const progress = Math.round((receivedChunks / incomingFile.metadata.totalChunks) * 100);

    setIncomingFile(prev => {
      if (!prev) return null;
      
      const updated = {
        ...prev,
        chunks,
        receivedChunks,
        progress,
      };

      // Check if complete
      if (receivedChunks === prev.metadata.totalChunks) {
        updated.status = 'completed';
        downloadReceivedFile(updated);
      }

      return updated;
    });
  }

  function downloadReceivedFile(transfer: FileTransfer) {
    // Combine chunks into Blob
    const blob = new Blob(transfer.chunks, { type: transfer.metadata.fileType });
    const url = URL.createObjectURL(blob);
    
    console.log(`✅ [Videolify] File received successfully: ${transfer.metadata.fileName} (${transfer.chunks.length} chunks)`);
    
    // Download
    const a = document.createElement('a');
    a.href = url;
    a.download = transfer.metadata.fileName;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * 11. Screen Sharing - WebRTC Media Track
   */
  async function toggleScreenShare() {
    try {
      if (isScreenSharing) {
        console.log('[Videolify] Stopping screen share, reverting to camera');
        // Stop screen share
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
        }
        
        // Re-add camera track
        if (localStreamRef.current && peerConnectionRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        }
        
        setIsScreenSharing(false);
      } else {
        console.log('[Videolify] Starting screen share via P2P');
        // Start screen share
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        
        screenStreamRef.current = screenStream;
        
        // Replace camera with screen track
        if (peerConnectionRef.current) {
          const screenTrack = screenStream.getVideoTracks()[0];
          const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(screenTrack);
            console.log('✅ [Videolify] Screen share active (P2P stream)');
          }
        }
        
        // Handle screen share stop
        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };
        
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.error('[Videolify] Screen share error:', err);
    }
  }

  /**
   * 10. Recording - Client-side MediaRecorder
   * NO SERVER STORAGE - Save to client device
   */
  function toggleRecording() {
    if (isRecording) {
      // Stop recording
      console.log('[Videolify] Stopping recording');
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Start recording
      if (!localStreamRef.current) {
        alert('Không có stream để ghi');
        return;
      }

      try {
        console.log('[Videolify] Starting client-side recording (no server storage)');
        const mediaRecorder = new MediaRecorder(localStreamRef.current, {
          mimeType: 'video/webm;codecs=vp8,opus'
        });
        mediaRecorderRef.current = mediaRecorder;
        recordedChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `videolify-${Date.now()}.webm`;
          a.click();
          URL.revokeObjectURL(url);
          console.log(`✅ [Videolify] Recording saved: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
        };

        mediaRecorder.onerror = (event: any) => {
          console.error('[Videolify] Recording error:', event.error);
          setIsRecording(false);
        };

        mediaRecorder.start();
        setIsRecording(true);
        console.log('✅ [Videolify] Recording started successfully');
      } catch (err) {
        console.error('[Videolify] Failed to start recording:', err);
        alert('Không thể bắt đầu ghi. Trình duyệt có thể không hỗ trợ.');
      }
    }
  }

  /**
   * 11. Media controls
   */
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log(`🎥 [Videolify] Video ${videoTrack.enabled ? 'ON' : 'OFF'}`);
        
        // Toast notification
        toast({
          title: videoTrack.enabled ? '📹 Camera đã bật' : '📹 Camera đã tắt',
          description: videoTrack.enabled ? 'Người khác có thể nhìn thấy bạn' : 'Người khác không nhìn thấy bạn',
          duration: 2000,
        });
      } else {
        console.warn('[Videolify] No video track available');
        toast({
          title: '⚠️ Không tìm thấy camera',
          description: 'Vui lòng kiểm tra quyền truy cập camera',
          variant: 'destructive',
        });
      }
    } else {
      console.warn('[Videolify] No local stream available');
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log(`🎤 [Videolify] Audio ${audioTrack.enabled ? 'ON' : 'OFF'}`);
        
        // Toast notification
        toast({
          title: audioTrack.enabled ? '🎤 Mic đã bật' : '🎤 Mic đã tắt',
          description: audioTrack.enabled ? 'Người khác có thể nghe thấy bạn' : 'Người khác không nghe thấy bạn',
          duration: 2000,
        });
      } else {
        console.warn('[Videolify] No audio track available');
        toast({
          title: '⚠️ Không tìm thấy microphone',
          description: 'Vui lòng kiểm tra quyền truy cập microphone',
          variant: 'destructive',
        });
      }
    } else {
      console.warn('[Videolify] No local stream available');
    }
  };

  const toggleEraserMode = () => {
    const canvas = whiteboardFabricRef.current;
    if (!canvas) return;

    const newMode = !isEraserMode;
    setIsEraserMode(newMode);

    if (newMode) {
      // Eraser mode: enable selection, disable drawing
      canvas.isDrawingMode = false;
      canvas.selection = true;
      canvas.forEachObject((obj: any) => {
        obj.selectable = true;
        obj.evented = true;
      });

      // Handle object selection to delete
      canvas.on('mouse:down', (e: any) => {
        if (isEraserMode && e.target) {
          canvas.remove(e.target);
          canvas.renderAll();
        }
      });

      toast({
        title: '🗑️ Bút xóa đã bật',
        description: 'Click vào nét vẽ để xóa',
        duration: 2000,
      });
    } else {
      // Drawing mode: disable selection, enable drawing
      canvas.isDrawingMode = true;
      canvas.selection = false;
      canvas.forEachObject((obj: any) => {
        obj.selectable = false;
        obj.evented = false;
      });

      // Remove mouse:down listener
      canvas.off('mouse:down');

      toast({
        title: '✏️ Bút vẽ đã bật',
        description: 'Vẽ bình thường trên bảng',
        duration: 2000,
      });
    }

    console.log(`🎨 [Videolify] Whiteboard mode: ${newMode ? 'ERASER' : 'DRAW'}`);
  };

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

    fetch('/api/videolify/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'leave',
        roomId,
        peerId: peerIdRef.current,
      }),
    }).catch(console.error);

    // Clear session when explicitly ending call
    clearConnectionState();

    if (onCallEnd) {
      onCallEnd();
    }
  };

  // Reconnect function - Manually reconnect after disconnection
  const handleReconnect = async () => {
    console.log('🔄 [Videolify] Manual reconnect initiated');
    
    // Close existing connection if any
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Reset state
    remotePeerIdRef.current = null;
    makingOfferRef.current = false;
    ignoreOfferRef.current = false;
    setIsConnecting(true);
    
    // Rejoin room to get existing peers
    await joinRoom();
    
    console.log('✅ [Videolify] Reconnect completed');
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Card className="p-8 bg-red-900/20 border-red-500">
          <p className="text-red-400 text-xl mb-4">{error}</p>
          <Button onClick={onCallEnd} variant="outline">Quay lại</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-gray-900 flex flex-col">
      {/* Connection Status Indicator - Top Right Corner */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-700">
        <div className={`w-2 h-2 rounded-full ${
          connectionStats.connected 
            ? 'bg-green-500 animate-pulse' 
            : connectionStats.iceState === 'checking' || connectionStats.iceState === 'connecting'
            ? 'bg-yellow-500 animate-pulse'
            : 'bg-red-500'
        }`} />
        <span className="text-xs text-gray-300">
          {connectionStats.connected 
            ? 'Connected' 
            : connectionStats.iceState === 'checking' || connectionStats.iceState === 'connecting'
            ? 'Connecting...'
            : 'Disconnected'}
        </span>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex">
        {/* Video/Whiteboard Area */}
        <div className="flex-1 relative bg-gray-800">
          {/* Waiting State - Show when no peer connected */}
          {!connectionStats.connected && !showWhiteboard && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-center space-y-4 p-8">
                {wasConnected ? (
                  // Disconnected state - show reconnect button
                  <>
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-white text-2xl font-semibold">Đã mất kết nối</h2>
                    <p className="text-gray-400 text-lg">Kết nối với người khác đã bị ngắt</p>
                    <Button 
                      onClick={handleReconnect}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg"
                    >
                      🔄 Kết nối lại
                    </Button>
                  </>
                ) : (
                  // Waiting for first connection
                  <>
                    <div className="text-6xl mb-4">👋</div>
                    <h2 className="text-white text-2xl font-semibold">Waiting for participant</h2>
                    <p className="text-gray-400 text-lg">Share this link with your peer to start the session</p>
                    <Badge className="bg-yellow-500/90 text-black px-4 py-2 text-base">
                      ⏳ Room is ready - waiting for peer to join...
                    </Badge>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Remote Video - Always rendered but hidden if not connected */}
          <video
            ref={remoteVideoRef}
            data-testid="remote-video"
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${
              !showWhiteboard && connectionStats.connected ? 'block' : 'hidden'
            }`}
          />
          
          {/* Waiting for Peer Placeholder */}
          {!showWhiteboard && !connectionStats.connected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center mb-6 animate-pulse">
                <Video className="w-16 h-16 text-gray-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">
                {isConnecting ? 'Đang kết nối...' : 'Đang chờ người khác tham gia'}
              </h3>
              <p className="text-gray-400">
                {isConnecting ? 'Vui lòng đợi trong giây lát' : 'Chia sẻ link phòng để mời người khác'}
              </p>
              {isConnecting && (
                <div className="mt-6 flex gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          )}

          {/* Whiteboard */}
          {showWhiteboard && (
            <div className="relative w-full h-full">
              <canvas
                ref={whiteboardCanvasRef}
                className="w-full h-full bg-white"
              />
              
              {/* Warning Overlay when channel not ready */}
              {channelStates.whiteboard !== 'open' && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20 pointer-events-none">
                  <div className="bg-gray-800/90 rounded-lg p-6 text-center border-2 border-yellow-500">
                    <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                      {channelStates.whiteboard === 'connecting' ? (
                        <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Activity className="w-8 h-8 text-red-500" />
                      )}
                    </div>
                    <h3 className="text-white text-xl font-semibold mb-2">
                      {channelStates.whiteboard === 'connecting' ? 'Đang kết nối bảng trắng...' : 'Bảng trắng chưa sẵn sàng'}
                    </h3>
                    <p className="text-gray-300">
                      {channelStates.whiteboard === 'connecting' 
                        ? 'Vui lòng đợi kết nối hoàn tất. Nét vẽ sẽ được gửi sau khi kết nối.' 
                        : 'Vui lòng kiểm tra kết nối mạng và thử lại.'}
                    </p>
                    {whiteboardQueueRef.current && whiteboardQueueRef.current.length > 0 && (
                      <Badge className="mt-3 bg-blue-500">
                        📋 {whiteboardQueueRef.current.length} nét vẽ đang chờ gửi
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              {/* Whiteboard Toolbar */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 flex items-center gap-3 shadow-xl border border-gray-700">
                {/* Channel Status Indicator */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          channelStates.whiteboard === 'open' ? 'bg-green-500 animate-pulse' : 
                          channelStates.whiteboard === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                          'bg-red-500'
                        }`} />
                        <span className="text-white text-xs font-medium">
                          {channelStates.whiteboard === 'open' ? '✅ Ready' : 
                           channelStates.whiteboard === 'connecting' ? '🔄 Connecting' : 
                           '❌ Disconnected'}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Trạng thái kết nối bảng trắng: {channelStates.whiteboard}</p>
                      {channelStates.whiteboard !== 'open' && (
                        <p className="text-yellow-400">Vẽ sẽ được gửi khi kết nối xong</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <div className="h-6 w-px bg-gray-600" />
                
                {/* Color Picker */}
                <div className="flex gap-2">
                  {['#000000', '#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FF00FF'].map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        if (whiteboardFabricRef.current) {
                          whiteboardFabricRef.current.freeDrawingBrush.color = color;
                        }
                      }}
                      className="w-8 h-8 rounded-full border-2 border-white hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>

                <div className="h-6 w-px bg-gray-600" />

                {/* Brush Size */}
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm">Size:</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    defaultValue="2"
                    onChange={(e) => {
                      if (whiteboardFabricRef.current) {
                        whiteboardFabricRef.current.freeDrawingBrush.width = Number(e.target.value);
                      }
                    }}
                    className="w-24"
                  />
                </div>

                <div className="h-6 w-px bg-gray-600" />

                {/* Eraser Tool */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={toggleEraserMode}
                        variant={isEraserMode ? 'default' : 'secondary'}
                        size="sm"
                        className={`gap-2 ${isEraserMode ? 'bg-red-500 hover:bg-red-600' : ''}`}
                      >
                        <Eraser className="w-4 h-4" />
                        {isEraserMode ? 'Eraser ON' : 'Eraser'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isEraserMode ? 'Click vào nét vẽ để xóa' : 'Bật bút xóa'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <div className="h-6 w-px bg-gray-600" />

                {/* Clear Button */}
                <Button
                  onClick={() => {
                    if (whiteboardFabricRef.current) {
                      whiteboardFabricRef.current.clear();
                      sendDrawEvent({ type: 'clear' });
                    }
                  }}
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Local Video (PiP) - Draggable */}
          {pipVisible && (
            <Draggable
              bounds="parent"
              handle=".drag-handle"
              defaultPosition={{ x: 0, y: 0 }}
            >
              <div 
                className={`absolute top-4 right-4 z-10 group ${
                  pipSize === 'small' ? 'w-40 h-30' : 
                  pipSize === 'medium' ? 'w-64 h-48' : 
                  'w-96 h-72'
                }`}
              >
                <video
                  ref={localVideoRef}
                  data-testid="local-video"
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover rounded-lg border-2 border-white shadow-lg cursor-move drag-handle"
                />
                
                {/* PiP Controls - Show on hover */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  {/* Size Toggle */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => setPipSize(prev => 
                            prev === 'small' ? 'medium' : 
                            prev === 'medium' ? 'large' : 'small'
                          )}
                          size="sm"
                          variant="secondary"
                          className="h-7 w-7 p-0 bg-black/50 hover:bg-black/70"
                        >
                          {pipSize === 'small' ? <Maximize2 className="w-3 h-3" /> : 
                           pipSize === 'medium' ? <Maximize2 className="w-4 h-4" /> : 
                           <Minimize2 className="w-4 h-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {pipSize === 'small' ? 'Phóng to' : 
                         pipSize === 'medium' ? 'Phóng to thêm' : 'Thu nhỏ'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {/* Hide Toggle */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => setPipVisible(false)}
                          size="sm"
                          variant="secondary"
                          className="h-7 w-7 p-0 bg-black/50 hover:bg-black/70"
                        >
                          <EyeOff className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ẩn video của tôi</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </Draggable>
          )}
          
          {/* Show PiP button when hidden */}
          {!pipVisible && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setPipVisible(true)}
                    size="sm"
                    className="absolute top-4 right-4 z-10 gap-2 bg-blue-500 hover:bg-blue-600"
                  >
                    <Eye className="w-4 h-4" />
                    Hiện video của tôi
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Hiển thị lại video cá nhân</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Hand Raise Badge */}
          {remoteHandRaised && (
            <Badge className="absolute top-4 left-4 bg-yellow-500 z-10">
              <Hand className="w-4 h-4 mr-2" />
              Peer raised hand
            </Badge>
          )}

          {/* Connection Status Indicator */}
          <div className="absolute bottom-4 left-4 z-10">
            {isConnecting && !connectionStats.connected && (
              <Badge className="bg-blue-500/90 backdrop-blur-sm flex items-center gap-2 px-4 py-2 shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="font-medium">Đang kết nối...</span>
              </Badge>
            )}
            
            {connectionStats.connected && connectionStats.iceState === 'connected' && (
              <Badge className="bg-green-500/90 backdrop-blur-sm flex items-center gap-2 px-4 py-2 shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full" />
                <span className="font-medium">Đã kết nối</span>
              </Badge>
            )}
            
            {connectionStats.connected && connectionStats.iceState === 'checking' && (
              <Badge className="bg-yellow-500/90 backdrop-blur-sm flex items-center gap-2 px-4 py-2 shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="font-medium">Kết nối yếu</span>
              </Badge>
            )}
            
            {!connectionStats.connected && !isConnecting && (
              <Badge className="bg-red-500/90 backdrop-blur-sm flex items-center gap-2 px-4 py-2 shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full" />
                <span className="font-medium">Mất kết nối</span>
              </Badge>
            )}
          </div>

          {/* Debug Stats Panel */}
          {showDebugStats && (
            <Card className="absolute top-4 left-4 bg-black/80 border-gray-600 p-4 text-xs text-white max-w-sm">
              <div className="space-y-1">
                <p><strong>🔗 Connection:</strong> {connectionStats.connected ? '✅ Connected' : '❌ Disconnected'}</p>
                <p><strong>🧊 ICE State:</strong> {connectionStats.iceState}</p>
                <p><strong>📡 Channels:</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>Whiteboard: {whiteboardChannelRef.current?.readyState || 'closed'}</li>
                  <li>Chat: {chatChannelRef.current?.readyState || 'closed'}</li>
                  <li>Control: {controlChannelRef.current?.readyState || 'closed'}</li>
                  <li>File: {fileChannelRef.current?.readyState || 'closed'}</li>
                </ul>
                <p><strong>💬 Chat Messages:</strong> {chatMessages.length}</p>
                <p><strong>🎥 Local Tracks:</strong> {localStreamRef.current?.getTracks().length || 0}</p>
                <p><strong>👤 Peer ID:</strong> {peerIdRef.current.substring(0, 20)}...</p>
              </div>
            </Card>
          )}
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <Card className="w-80 bg-gray-800 border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold">Chat</h3>
            </div>
            
            <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
              {chatMessages.length === 0 && (
                <div className="text-center text-gray-500 mt-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Chưa có tin nhắn nào</p>
                  <p className="text-xs mt-1">Gửi tin nhắn đầu tiên!</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`mb-3 ${msg.fromMe ? 'text-right' : ''}`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <p className={`text-xs text-gray-400 ${msg.fromMe ? 'order-2' : 'order-1'}`}>
                      {msg.userName}
                    </p>
                    <p className={`text-xs text-gray-500 ${msg.fromMe ? 'order-1' : 'order-2'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  <p className={`inline-block px-3 py-2 rounded-lg ${
                    msg.fromMe ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
                  }`}>
                    {msg.message}
                  </p>
                </div>
              ))}
            </ScrollArea>

            <div className="p-4 border-t border-gray-700 flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Nhập tin nhắn..."
                className="flex-1"
              />
              <Button onClick={sendChatMessage} size="sm">Gửi</Button>
            </div>
          </Card>
        )}
      </div>

      {/* File Transfer Modal */}
      {(incomingFile || outgoingFile) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
          <Card className="w-96 bg-gray-800 border-gray-700 p-6">
            {incomingFile && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Incoming File
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIncomingFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="mb-4">
                  <p className="text-white text-sm mb-1">{incomingFile.metadata.fileName}</p>
                  <p className="text-gray-400 text-xs">
                    {(incomingFile.metadata.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                {incomingFile.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button onClick={acceptFile} className="flex-1">
                      <Check className="w-4 h-4 mr-2" />
                      Accept
                    </Button>
                    <Button onClick={rejectFile} variant="destructive" className="flex-1">
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}

                {incomingFile.status === 'transferring' && (
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-gray-400">Receiving...</span>
                      <span className="text-white">{incomingFile.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${incomingFile.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {incomingFile.status === 'completed' && (
                  <div className="text-center">
                    <Check className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <p className="text-white">File received successfully!</p>
                  </div>
                )}
              </>
            )}

            {outgoingFile && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Sending File
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOutgoingFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="mb-4">
                  <p className="text-white text-sm mb-1">{outgoingFile.metadata.fileName}</p>
                  <p className="text-gray-400 text-xs">
                    {(outgoingFile.metadata.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                {outgoingFile.status === 'pending' && (
                  <p className="text-gray-400 text-sm">Waiting for peer to accept...</p>
                )}

                {outgoingFile.status === 'transferring' && (
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-gray-400">Sending...</span>
                      <span className="text-white">{outgoingFile.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${outgoingFile.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {outgoingFile.status === 'completed' && (
                  <div className="text-center">
                    <Check className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <p className="text-white">File sent successfully!</p>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      {/* Controls */}
      <TooltipProvider>
        <div className="bg-gray-900 border-t border-gray-700 p-4 flex justify-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="toggle-video-btn"
                onClick={toggleVideo}
                variant={isVideoEnabled ? 'default' : 'destructive'}
                size="lg"
                className={`rounded-full transition-all hover:scale-110 ${
                  isVideoEnabled 
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/50' 
                    : 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/50'
                }`}
              >
                {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="toggle-audio-btn"
                onClick={toggleAudio}
                variant={isAudioEnabled ? 'default' : 'destructive'}
                size="lg"
                className={`rounded-full transition-all hover:scale-110 ${
                  isAudioEnabled 
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/50' 
                    : 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/50'
                }`}
              >
                {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="toggle-screen-share-btn"
                onClick={toggleScreenShare}
                variant={isScreenSharing ? 'default' : 'outline'}
                size="lg"
                className={`rounded-full transition-all hover:scale-110 ${
                  isScreenSharing 
                    ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/50' 
                    : 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white'
                }`}
              >
                {isScreenSharing ? <Monitor className="w-5 h-5" /> : <MonitorOff className="w-5 h-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isScreenSharing ? 'Stop sharing screen' : 'Share screen'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="toggle-whiteboard-btn"
                onClick={() => setShowWhiteboard(!showWhiteboard)}
                variant={showWhiteboard ? 'default' : 'outline'}
                size="lg"
                className={`rounded-full transition-all hover:scale-110 ${
                  showWhiteboard 
                    ? 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/50' 
                    : 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white'
                }`}
              >
                <Pencil className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{showWhiteboard ? 'Hide whiteboard' : 'Show whiteboard'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="toggle-chat-btn"
                onClick={() => setShowChat(!showChat)}
                variant={showChat ? 'default' : 'outline'}
                size="lg"
                className={`rounded-full transition-all hover:scale-110 relative ${
                  showChat 
                    ? 'bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-500/50' 
                    : 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                {chatMessages.length > 0 && !showChat && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {chatMessages.length}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{showChat ? 'Hide chat' : 'Show chat'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="send-file-btn"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) sendFile(file);
                  };
                  input.click();
                }}
                variant="outline"
                size="lg"
                className="rounded-full transition-all hover:scale-110 bg-gray-700 hover:bg-gray-600 border-gray-600 text-white"
                disabled={!connectionStats.connected}
              >
                <Upload className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{connectionStats.connected ? 'Send file to peer' : 'Wait for peer to connect'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="toggle-hand-raise-btn"
                onClick={toggleHandRaise}
                variant={handRaised ? 'default' : 'outline'}
                size="lg"
                className={`rounded-full transition-all hover:scale-110 ${
                  handRaised 
                    ? 'bg-yellow-600 hover:bg-yellow-700 shadow-lg shadow-yellow-500/50' 
                    : 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white'
                }`}
                disabled={!connectionStats.connected}
              >
                <Hand className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{handRaised ? 'Lower hand' : 'Raise hand'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="toggle-recording-btn"
                onClick={toggleRecording}
                variant={isRecording ? 'destructive' : 'outline'}
                size="lg"
                className={`rounded-full transition-all hover:scale-110 ${
                  isRecording 
                    ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/50 animate-pulse' 
                    : 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white'
                }`}
              >
                <Download className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isRecording ? 'Stop recording' : 'Start recording session'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="toggle-debug-stats-btn"
                onClick={() => setShowDebugStats(!showDebugStats)}
                variant="outline"
                size="lg"
                className={`rounded-full transition-all hover:scale-110 ${
                  showDebugStats 
                    ? 'bg-cyan-600 hover:bg-cyan-700 shadow-lg shadow-cyan-500/50' 
                    : 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white'
                }`}
              >
                <Activity className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{showDebugStats ? 'Hide debug info' : 'Show connection stats'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="end-call-btn"
                onClick={endCall}
                variant="destructive"
                size="lg"
                className="rounded-full transition-all hover:scale-110 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/50 ml-2"
              >
                <PhoneOff className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>End call and leave session</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
