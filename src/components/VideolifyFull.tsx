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
  Upload, FileText, X, Check, Activity, EyeOff, Eye, Eraser, User, Image as ImageIcon, Sparkles,
  MonitorUp, MonitorStop
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { VirtualBackgroundProcessor, type BackgroundMode } from '@/lib/virtualBackground';
import { Logo } from './Logo';

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
  
  // ✅ NEW: Separate VBG processors for local and remote video
  const virtualBgProcessorRef = useRef<VirtualBackgroundProcessor | null>(null); // For LOCAL preview
  const remoteVbgProcessorRef = useRef<VirtualBackgroundProcessor | null>(null); // For REMOTE peer video
  const originalStreamRef = useRef<MediaStream | null>(null); // Original local stream
  const remoteOriginalStreamRef = useRef<MediaStream | null>(null); // Original remote stream (before VBG)
  const pendingRemoteVbgSettingsRef = useRef<any | null>(null); // Store VBG settings received before remote stream ready
  
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
    
    // CRITICAL: Detect if this is a page reload (F5) vs new tab
    const isPageReload = typeof window !== 'undefined' && 
      (performance.navigation?.type === 1 || performance.getEntriesByType?.('navigation')?.[0]?.type === 'reload');
    
    if (typeof window !== 'undefined') {
      if (isPageReload) {
        // F5/Reload: Try to restore peer ID to maintain connection
        console.log('🔄 [Videolify] Page reload detected - attempting to restore peer ID');
        
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
      } else {
        // New tab/window: ALWAYS generate new peer ID (no restore)
        console.log('✨ [Videolify] New tab detected - will generate new peer ID');
        savedPeerId = null;
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
      
      // CRITICAL FIX: If restored from localStorage (not sessionStorage), verify not multi-tab
      if (source === 'localStorage') {
        // Check if this might be a multi-tab scenario by seeing if another tab is active
        const tabCheckKey = `videolify-active-tab-${roomId}`;
        const lastActiveTab = localStorage.getItem(tabCheckKey);
        const now = Date.now();
        
        if (lastActiveTab) {
          const lastActive = parseInt(lastActiveTab);
          // If another tab was active within last 5 seconds, this is likely multi-tab
          if (now - lastActive < 5000) {
            console.warn('⚠️ [Videolify] Detected potential multi-tab scenario - generating new peer ID');
            peerIdRef.current = `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            savedPeerId = null; // Force save below
          }
        }
      }
    }
    
    if (!savedPeerId) {
      // Generate NEW peer ID
      peerIdRef.current = `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log(`✨ [Videolify] Generated new peer ID: ${peerIdRef.current}`);
    }
    
    // Save to BOTH sessionStorage AND localStorage  
    if (typeof window !== 'undefined') {
      // ENSURE we save string only, never object
      const peerIdString = String(peerIdRef.current);
      sessionStorage.setItem(sessionKey, peerIdString);
      localStorage.setItem(localKey, peerIdString);
      // Also save timestamp for optional cleanup
      localStorage.setItem(`${localKey}-timestamp`, Date.now().toString());
      console.log(`💾 [Videolify] Peer ID saved to session & local storage`);
      
      // Mark this tab as active
      const tabCheckKey = `videolify-active-tab-${roomId}`;
      localStorage.setItem(tabCheckKey, Date.now().toString());
    }
  }
  
  const remotePeerIdRef = useRef<string | null>(null);
  const isPolitePeerRef = useRef<boolean>(false); // Perfect Negotiation: polite vs impolite
  
  // Virtual Background Preset Library - Educational & Professional Backgrounds
    const PRESET_BACKGROUNDS = [
  // === VĂN PHÒNG / OFFICE (7) ===
  { name: 'Modern Office Space', url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=1920&q=80', category: 'Office', emoji: '🏢' },
  { name: 'Bright Office', url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1920&q=80', category: 'Office', emoji: '☀️' },
  { name: 'Designer Workspace', url: 'https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=1920&q=80', category: 'Office', emoji: '🎨' },
  { name: 'Creative Office', url: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=1920&q=80', category: 'Office', emoji: '💡' },
  { name: 'Corporate Meeting Room', url: 'https://images.unsplash.com/photo-1571624436279-b272aff752b5?w=1920&q=80', category: 'Office', emoji: '📊' },
  { name: 'Office Window View', url: 'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=1920&q=80', category: 'Office', emoji: '🪟' },
  { name: 'Tech Office', url: 'https://images.unsplash.com/photo-1606836576983-8b458e75221d?w=1920&q=80', category: 'Office', emoji: '⚙️' },
  
  // === LỚP HỌC / EDUCATION (6) ===
  { name: 'Modern Classroom', url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1920&q=80', category: 'Education', emoji: '🏫' },
  { name: 'Lecture Hall', url: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=1920&q=80', category: 'Education', emoji: '🎓' },
  { name: 'Training Room', url: 'https://images.unsplash.com/photo-1617721926586-4eecce739745?w=1920&q=80', category: 'Education', emoji: '📋' },
  { name: 'Study Space', url: 'https://images.unsplash.com/photo-1576961453646-b4c376c7021b?w=1920&q=80', category: 'Education', emoji: '📝' },
  { name: 'Conference Room', url: 'https://images.unsplash.com/photo-1635424239131-32dc44986b56?w=1920&q=80', category: 'Education', emoji: '🎤' },
  { name: 'Workshop Space', url: 'https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=1920&q=80', category: 'Education', emoji: '🛠️' },
  
  // === THƯ VIỆN / LIBRARY (7) ===
  { name: 'Classic Library', url: 'https://images.unsplash.com/photo-1600431521340-491eca880813?w=1920&q=80', category: 'Library', emoji: '📚' },
  { name: 'Reading Room', url: 'https://images.unsplash.com/photo-1588581939864-064d42ace7cd?w=1920&q=80', category: 'Library', emoji: '📗' },
  { name: 'Modern Library', url: 'https://images.unsplash.com/photo-1602722053020-af31042989d5?w=1920&q=80', category: 'Library', emoji: '🏛️' },
  { name: 'Academic Library', url: 'https://images.unsplash.com/photo-1507738978512-35798112892c?w=1920&q=80', category: 'Library', emoji: '🎓' },
  { name: 'Study Library', url: 'https://images.unsplash.com/photo-1569511166187-97eb6e387e19?w=1920&q=80', category: 'Library', emoji: '✍️' },
  { name: 'Bright Library', url: 'https://images.unsplash.com/photo-1709924168698-620ea32c3488?w=1920&q=80', category: 'Library', emoji: '💡' },
  { name: 'Book Collection', url: 'https://images.unsplash.com/photo-1670228260388-c5e536d0001c?w=1920&q=80', category: 'Library', emoji: '📗' },
  
  // === TỦ SÁCH / BOOKSHELF (7) ===
  { name: 'Wooden Bookshelf', url: 'https://images.unsplash.com/photo-1543248939-4296e1fea89b?w=1920&q=80', category: 'Bookshelf', emoji: '📚' },
  { name: 'Classic Books', url: 'https://images.unsplash.com/photo-1457276587196-a9d53d84c58b?w=1920&q=80', category: 'Bookshelf', emoji: '📕' },
  { name: 'Modern Bookshelf', url: 'https://images.unsplash.com/photo-1683181181200-497e87dc6d4c?w=1920&q=80', category: 'Bookshelf', emoji: '📘' },
  { name: 'Vintage Books', url: 'https://images.unsplash.com/photo-1620388640952-35a1d22d158d?w=1920&q=80', category: 'Bookshelf', emoji: '📜' },
  { name: 'Organized Books', url: 'https://images.unsplash.com/photo-1604062527894-55b0712bbee3?w=1920&q=80', category: 'Bookshelf', emoji: '📖' },
  { name: 'Book Shelves', url: 'https://images.unsplash.com/photo-1507738978512-35798112892c?w=1920&q=80', category: 'Bookshelf', emoji: '📚' },
  { name: 'Study Corner', url: 'https://images.unsplash.com/photo-1457276587196-a9d53d84c58b?w=1920&q=80', category: 'Bookshelf', emoji: '✏️' },
  
  // === PHÒNG KHÁCH / LIVING ROOM (7) ===
  { name: 'Cozy Living Space', url: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=1920&q=80', category: 'Living Room', emoji: '🏡' },
  { name: 'Minimalist Living', url: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1920&q=80', category: 'Living Room', emoji: '⚪' },
  { name: 'Urban Apartment', url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1920&q=80', category: 'Living Room', emoji: '🏙️' },
  { name: 'Elegant Living Room', url: 'https://images.unsplash.com/photo-1632829882891-5047ccc421bc?w=1920&q=80', category: 'Living Room', emoji: '✨' },
  { name: 'Bright Living Space', url: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1920&q=80', category: 'Living Room', emoji: '☀️' },
  { name: 'Scandinavian Living', url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1920&q=80', category: 'Living Room', emoji: '🇸🇪' },
  { name: 'Comfortable Living', url: 'https://images.unsplash.com/photo-1633330977020-2bdfb8530cc2?w=1920&q=80', category: 'Living Room', emoji: '🪑' },
  
  // === BÃI BIỂN / BEACH (12) ===
  { name: 'Tropical Beach', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80', category: 'Beach', emoji: '🏖️' },
  { name: 'Sandy Shore', url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1920&q=80', category: 'Beach', emoji: '🌊' },
  { name: 'Paradise Beach', url: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=1920&q=80', category: 'Beach', emoji: '🌴' },
  { name: 'Ocean View', url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&q=80', category: 'Beach', emoji: '🌅' },
  { name: 'Sunset Beach', url: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=1920&q=80', category: 'Beach', emoji: '🌇' },
  { name: 'Crystal Clear Water', url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1920&q=80', category: 'Beach', emoji: '💎' },
  { name: 'Palm Beach', url: 'https://images.unsplash.com/photo-1520454974749-611b7248ffdb?w=1920&q=80', category: 'Beach', emoji: '🌴' },
  { name: 'White Sand Beach', url: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1920&q=80', category: 'Beach', emoji: '⚪' },
  { name: 'Island Beach', url: 'https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=1920&q=80', category: 'Beach', emoji: '🏝️' },
  { name: 'Coastal View', url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1920&q=80', category: 'Beach', emoji: '🌊' },
  { name: 'Turquoise Water', url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=80', category: 'Beach', emoji: '💧' },
  { name: 'Beach Paradise', url: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1920&q=80', category: 'Beach', emoji: '🌺' },
  
  // === PHONG CẢNH THIÊN NHIÊN / NATURE (15) ===
  { name: 'Mountain View', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80', category: 'Nature', emoji: '⛰️' },
  { name: 'Forest Path', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80', category: 'Nature', emoji: '🌲' },
  { name: 'Green Valley', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80', category: 'Nature', emoji: '🌿' },
  { name: 'Lake Reflection', url: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1920&q=80', category: 'Nature', emoji: '🏞️' },
  { name: 'Sunrise Mountain', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80', category: 'Nature', emoji: '🌄' },
  { name: 'Misty Forest', url: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=1920&q=80', category: 'Nature', emoji: '🌫️' },
  { name: 'Waterfall', url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1920&q=80', category: 'Nature', emoji: '💦' },
  { name: 'Cherry Blossom', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1920&q=80', category: 'Nature', emoji: '🌸' },
  { name: 'Bamboo Forest', url: 'https://images.unsplash.com/photo-1523978591478-c753949ff840?w=1920&q=80', category: 'Nature', emoji: '🎋' },
  { name: 'Lavender Field', url: 'https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=1920&q=80', category: 'Nature', emoji: '💜' },
  { name: 'Autumn Forest', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&q=80', category: 'Nature', emoji: '🍂' },
  { name: 'Desert Landscape', url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920&q=80', category: 'Nature', emoji: '🏜️' },
  { name: 'Northern Lights', url: 'https://images.unsplash.com/photo-1579033461380-adb47c3eb938?w=1920&q=80', category: 'Nature', emoji: '🌌' },
  { name: 'Rice Terraces', url: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1920&q=80', category: 'Nature', emoji: '🌾' },
  { name: 'Snow Mountain', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80', category: 'Nature', emoji: '❄️' },
  
  // === THÀNH PHỐ / CITY (9) ===
  { name: 'City Skyline', url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1920&q=80', category: 'City', emoji: '🌆' },
  { name: 'Night City', url: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1920&q=80', category: 'City', emoji: '🌃' },
  { name: 'Urban Street', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80', category: 'City', emoji: '🏙️' },
  { name: 'Modern Architecture', url: 'https://images.unsplash.com/photo-1486718448742-163732cd1544?w=1920&q=80', category: 'City', emoji: '🏢' },
  { name: 'Bridge View', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1920&q=80', category: 'City', emoji: '🌉' },
  { name: 'Downtown', url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1920&q=80', category: 'City', emoji: '🏛️' },
  { name: 'Harbor View', url: 'https://images.unsplash.com/photo-1513326738677-b964603b136d?w=1920&q=80', category: 'City', emoji: '⚓' },
  { name: 'Rooftop View', url: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=1920&q=80', category: 'City', emoji: '🏙️' },
  { name: 'Urban Sunset', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1920&q=80', category: 'City', emoji: '🌇' },
  
  // === TRANG TRÍ / MINIMAL (6) ===
  { name: 'White Wall', url: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=1920&q=80', category: 'Minimal', emoji: '⚪' },
  { name: 'Cream Wall', url: 'https://images.unsplash.com/photo-1534670007418-fbb7f6cf32c3?w=1920&q=80', category: 'Minimal', emoji: '🟨' },
  { name: 'Beige Texture', url: 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=1920&q=80', category: 'Minimal', emoji: '🟧' },
  { name: 'Soft Light', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80', category: 'Minimal', emoji: '💡' },
  { name: 'Pastel Blue', url: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=1920&q=80', category: 'Minimal', emoji: '🔵' },
  { name: 'Clean White', url: 'https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=1920&q=80', category: 'Minimal', emoji: '⬜' },
];;
  
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
  const [isReconnecting, setIsReconnecting] = useState(false); // Track when peer is reconnecting (F5)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true); // Track remote peer's video status
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true); // Track remote peer's audio status
  const [remotePeerName, setRemotePeerName] = useState<string>(''); // Track remote peer's display name
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [virtualBgEnabled, setVirtualBgEnabled] = useState(false);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('none');
  const [blurAmount, setBlurAmount] = useState(10);
  
  // UX Enhancement: Loading states for better user feedback
  const [isVbgMenuOpen, setIsVbgMenuOpen] = useState(false);
  const [vbgLoading, setVbgLoading] = useState(false);
  const [presetLoading, setPresetLoading] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null); // Track which preset is active
  const [previewBackground, setPreviewBackground] = useState<string | null>(null); // Preview before apply
  const [selectedCategory, setSelectedCategory] = useState<string>('All'); // Category filter like Google Meet
  const [remoteVbgLoading, setRemoteVbgLoading] = useState(false); // Loading state for remote VBG processing
  
  // Auto-restore flag to prevent duplicate runs in React StrictMode
  const autoRestoreTriggered = useRef(false);
  
  const [handRaised, setHandRaised] = useState(false);
  const [remoteHandRaised, setRemoteHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [incomingFile, setIncomingFile] = useState<FileTransfer | null>(null);
  const [outgoingFile, setOutgoingFile] = useState<FileTransfer | null>(null);
  const [showFileTransfer, setShowFileTransfer] = useState(false);
  const [isFileTransferMinimized, setIsFileTransferMinimized] = useState(false);

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
  const deviceReplacedRef = useRef<boolean>(false); // Prevent reconnect after device switch
  const lastPongTimeRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hiddenStartTimeRef = useRef<number | null>(null);
  const iceGatheringTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const peerLeftTimeRef = useRef<number | null>(null);
  const isInitialMountRef = useRef<boolean>(true); // Track React StrictMode double-render
  
  // Screen share quality monitoring
  const qualityMonitorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastQualityAdjustmentRef = useRef<number>(0);
  
  // Feedback loop prevention - simple approach
  const localVideoHiddenRef = useRef<boolean>(false);
  
  // Screen share preview - PiP-First Hybrid Solution
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewAnimationRef = useRef<number | null>(null);
  const previewWindowRef = useRef<Window | null>(null);

  // ✅ Virtual Background refs moved to top (lines 103-106)
  // Removed duplicate declarations here

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
   * 0.5. REMEMBER VIRTUAL BACKGROUND - Load from localStorage on mount
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Use ref to prevent duplicate auto-restore in React StrictMode
    if (autoRestoreTriggered.current) {
      console.log('⏭️ [VBG] Auto-restore already triggered, skipping');
      return;
    }
    autoRestoreTriggered.current = true;
    
    try {
      const savedBg = localStorage.getItem('vbg-last-background');
      const savedMode = localStorage.getItem('vbg-last-mode'); // 'blur' | 'image'
      const vbgEnabled = localStorage.getItem('vbg-enabled') === 'true';
      
      console.log('🔍 [VBG] Checking localStorage:', { savedBg, savedMode, vbgEnabled });
      
      if (savedBg && savedMode === 'image' && vbgEnabled) {
        console.log('📦 [VBG] Found saved background:', savedBg);
        setActivePreset(savedBg);
        
        // ✅ CRITICAL FIX: Don't block connection - load VBG in background AFTER stream ready
        // VBG is local-only effect, doesn't affect P2P connection
        // Delay loading to not slow down initial connection
        const checkAndApply = setInterval(() => {
          const hasStream = localStreamRef.current && localStreamRef.current.getVideoTracks().length > 0;
          
          if (hasStream) {
            clearInterval(checkAndApply);
            console.log('🎯 [VBG] Stream ready, loading background in background...');
            
            // Find the background preset
            const preset = PRESET_BACKGROUNDS.find(p => p.name === savedBg);
            if (preset) {
              // Load VBG but don't block - run async without await
              // This allows connection to proceed while VBG loads
              setTimeout(() => {
                console.log('▶️ [VBG] Loading background (non-blocking):', preset.name);
                loadPresetBackground(preset.name, preset.url);
              }, 1000); // Reduced from 5s to 1s - MediaPipe will load when needed
            } else {
              console.error('❌ [VBG] Preset not found:', savedBg);
            }
          }
        }, 100); // Check every 100ms
        
        // Cleanup after 10 seconds if not applied
        setTimeout(() => clearInterval(checkAndApply), 10000);
      } else if (savedMode === 'blur' && vbgEnabled) {
        // Handle blur mode restoration - load in background, don't block connection
        console.log('📦 [VBG] Restoring blur mode...');
        const savedBlur = localStorage.getItem('vbg-blur-amount');
        const blurAmount = savedBlur ? parseInt(savedBlur) : 10;
        
        const checkAndApply = setInterval(() => {
          const hasStream = localStreamRef.current && localStreamRef.current.getVideoTracks().length > 0;
          
          if (hasStream) {
            clearInterval(checkAndApply);
            // Apply blur in background - don't block connection
            setTimeout(() => {
              console.log('▶️ [VBG] Auto-applying blur:', blurAmount);
              toggleVirtualBackground('blur');
              setBlurAmount(blurAmount);
            }, 1000); // Reduced from 3s to 1s
          }
        }, 100);
        
        // Cleanup after 10 seconds
        setTimeout(() => clearInterval(checkAndApply), 10000);
      }
    } catch (err) {
      console.error('❌ [VBG] Failed to load saved background:', err);
    }
  }, []); // Run once on mount

  /**
   * 1. Initialize local media (camera + microphone)
   * CLIENT-SIDE ONLY - No server processing
   */
  useEffect(() => {
    console.log('[Videolify] 🚀 Init useEffect starting...');
    const initMedia = async () => {
      try {
        console.log('[Videolify] 🔍 Checking WebRTC support...');
        // Check WebRTC support
        if (!navigator.mediaDevices || !window.RTCPeerConnection) {
          console.error('[Videolify] ❌ WebRTC not supported!');
          setError('Trình duyệt không hỗ trợ WebRTC. Vui lòng dùng Chrome, Edge, hoặc Firefox.');
          return;
        }
        console.log('[Videolify] ✅ WebRTC supported');

        try {
          console.log('[Videolify] 📹 Requesting media access...');
          performance.mark('media-request-start');
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: { echoCancellation: true, noiseSuppression: true },
          });
          performance.mark('media-request-end');
          performance.measure('media-request-duration', 'media-request-start', 'media-request-end');
          const mediaTime = performance.getEntriesByName('media-request-duration')[0]?.duration || 0;
          console.log(`⏱️  [TIMING] Media request: ${Math.round(mediaTime)}ms`);

          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          console.log('[Videolify] ✅ Local media initialized');
        } catch (mediaErr) {
          console.warn('[Videolify] ⚠️ Could not access camera/mic, continuing without media:', mediaErr);

          // CRITICAL FIX: Create silent audio + blank video tracks for WebRTC compatibility
          // Without any tracks, WebRTC negotiation may fail (especially in Playwright/test environments)
          console.log('[Videolify] Creating silent audio & blank video tracks for WebRTC compatibility');

          try {
            // Create silent audio track (1 second of silence)
            const audioContext = new AudioContext();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            gainNode.gain.value = 0; // Silent
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            const silentAudioDest = audioContext.createMediaStreamDestination();
            gainNode.connect(silentAudioDest);

            // Create blank video track (black canvas)
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = 'black';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            const canvasStream = canvas.captureStream(1); // 1 fps is enough for blank video

            // Combine audio + video tracks
            const dummyStream = new MediaStream();

            // Add silent audio track
            const audioTracks = silentAudioDest.stream.getAudioTracks();
            if (audioTracks.length > 0) {
              dummyStream.addTrack(audioTracks[0]);
              console.log('[Videolify] ✅ Added silent audio track');
            }

            // Add blank video track
            const videoTracks = canvasStream.getVideoTracks();
            if (videoTracks.length > 0) {
              dummyStream.addTrack(videoTracks[0]);
              console.log('[Videolify] ✅ Added blank video track');
            }

            localStreamRef.current = dummyStream;
            console.log('[Videolify] ✅ Dummy media stream created with', dummyStream.getTracks().length, 'tracks');
          } catch (dummyErr) {
            console.error('[Videolify] ❌ Failed to create dummy tracks:', dummyErr);
            // Fallback: empty stream (may cause connection issues)
            localStreamRef.current = new MediaStream();
          }

          // Update UI state to reflect no real media
          setIsVideoEnabled(false);
          setIsAudioEnabled(false);
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
        console.log('[Videolify] 📡 Connecting SSE and waiting for ready...');

        // ✅ Always connect SSE with callback - join room ONLY when SSE is ready
        connectSSE(async () => {
          console.log('[Videolify] ✅ SSE ready, now checking if we should join...');

          // Prevent duplicate joins from React StrictMode double-execution
          // Check INSIDE callback to ensure it runs after SSE is ready
          if (!hasJoinedRef.current) {
            hasJoinedRef.current = true; // Set to block duplicate calls
            console.log('[Videolify] 🚪 Joining room...');
            performance.mark('join-room-start');
            await joinRoom();
            performance.mark('join-room-end');
            performance.measure('join-room-duration', 'join-room-start', 'join-room-end');
            const joinTime = performance.getEntriesByName('join-room-duration')[0]?.duration || 0;
            console.log(`⏱️  [TIMING] Join room: ${Math.round(joinTime)}ms`);
            console.log('[Videolify] ✅ Join room completed');
          } else {
            console.log('[Videolify] ⏭️ Already joined, skipping duplicate join from StrictMode');
          }
        });
        
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
      // CRITICAL FIX: Skip cleanup on first unmount (React StrictMode double-render)
      // StrictMode mounts → unmounts → re-mounts component in dev mode
      // We only want to clean up on REAL unmount (user leaving page)
      if (isInitialMountRef.current) {
        console.log('🔄 [Videolify] Skipping cleanup - React StrictMode double-render');
        isInitialMountRef.current = false;
        return; // Skip cleanup, let component re-mount
      }

      console.log('🧹 [Videolify] Cleanup - REAL unmount');

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

      // Cleanup virtual background
      if (virtualBgProcessorRef.current) {
        virtualBgProcessorRef.current.destroy();
        virtualBgProcessorRef.current = null;
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
   * Monitor remote video health - detect frozen/black screen
   */
  useEffect(() => {
    if (!connectionStats.connected || !remoteVideoRef.current) {
      return;
    }

    const videoElement = remoteVideoRef.current;
    let lastFrameTime = 0;
    let frozenFrameCount = 0;

    const checkVideoHealth = () => {
      if (!videoElement.srcObject || videoElement.paused) {
        return;
      }

      // Check if video time is advancing
      const currentTime = videoElement.currentTime;
      
      if (currentTime === lastFrameTime) {
        frozenFrameCount++;
        
        // If frozen for 10+ checks (5 seconds), suspect connection issue
        if (frozenFrameCount >= 10) {
          console.warn('⚠️ [Videolify] Remote video appears frozen - checking connection');
          
          const pc = peerConnectionRef.current;
          if (pc && (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed')) {
            console.error('❌ [Videolify] Video frozen + ICE failed - triggering recovery');
            setConnectionStats(prev => ({ ...prev, connected: false }));
            handleICEFailure(pc);
          }
        }
      } else {
        frozenFrameCount = 0; // Reset if video is advancing
      }
      
      lastFrameTime = currentTime;
    };

    // Check every 500ms
    const healthInterval = setInterval(checkVideoHealth, 500);

    return () => {
      clearInterval(healthInterval);
    };
  }, [connectionStats.connected]);

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
        // For test quality metrics
        peerConnection: peerConnectionRef.current,
        localStream: localStreamRef.current,
      };
    }
  });

  // Expose refs for Playwright testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).controlChannelRef = controlChannelRef;
      (window as any).chatChannelRef = chatChannelRef;
      (window as any).whiteboardChannelRef = whiteboardChannelRef;
      (window as any).peerConnectionRef = peerConnectionRef;
      (window as any).fileChannelRef = fileChannelRef;
      // Expose file transfer functions for testing
      (window as any).sendFile = sendFile;
      (window as any).acceptFile = acceptFile;
      console.log('[Videolify] 🧪 Test refs + file functions exposed to window');
    }
  }, []);

  /**
   * Multiple tabs conflict detection
   * DISABLED for now - causing issues with testing and multi-browser scenarios
   */
  useEffect(() => {
    // DISABLED: Multi-tab detection causes false positives
    // - Different browsers share localStorage (same origin)
    // - Blocks legitimate multi-user scenarios
    // - Playwright tests fail due to this
    // TODO: Re-enable with sessionStorage (per-window) instead of localStorage
    return;

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

      // Cleanup canvas preview on unmount
      stopCanvasPreview();
    };
  }, []);

  // Restore video stream when PiP becomes visible
  useEffect(() => {
    if (pipVisible && localVideoRef.current && localStreamRef.current) {
      // Restore video stream to video element
      localVideoRef.current.srcObject = localStreamRef.current;
      console.log('[Videolify] 🎥 Restored video stream to PiP');
    }
  }, [pipVisible]);

  /**
   * 2. SSE Connection - MINIMAL SERVER
   * Server CHỈ relay signaling messages
   */
  function connectSSE(onReady?: () => void) {
    // CRITICAL: Skip if SSE already connected OR connecting (React StrictMode double-render)
    if (eventSourceRef.current) {
      const state = eventSourceRef.current.readyState;

      if (state === EventSource.OPEN) {
        console.log('[Videolify] ✅ SSE already connected - skipping duplicate connection');
        // Call onReady immediately if already connected
        if (onReady) {
          console.log('[Videolify] SSE already open, calling onReady callback immediately');
          onReady();
        }
        return;
      }

      if (state === EventSource.CONNECTING) {
        console.log('[Videolify] ✅ SSE already connecting - skipping duplicate connection (React StrictMode)');
        // Store onReady callback to call when connection opens
        // Note: We don't have a callback queue, so just attach to existing eventSource
        const existingEventSource = eventSourceRef.current;
        if (onReady) {
          // Add new onReady to existing onopen handler
          const originalOnOpen = existingEventSource.onopen;
          existingEventSource.onopen = (event) => {
            if (originalOnOpen) {
              originalOnOpen.call(existingEventSource, event);
            }
            console.log('[Videolify] SSE ready (from queued callback), calling onReady');
            onReady();
          };
        }
        return;
      }

      // Only close if in CLOSED state (error/closed)
      console.log('[Videolify] Closing existing SSE connection (state: CLOSED)');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const eventSource = new EventSource(
      `/api/videolify/stream?roomId=${roomId}&peerId=${peerIdRef.current}&accessToken=${encodeURIComponent(accessToken)}`
    );

    eventSourceRef.current = eventSource;

    // Reset SSE retry counter on successful connection
    eventSource.onopen = () => {
      console.log('✅ [Videolify] SSE connection opened');
      sseReconnectAttemptsRef.current = 0;

      // ✅ Call onReady callback when connection is OPEN
      if (onReady) {
        console.log('[Videolify] SSE ready, calling onReady callback');
        onReady();
      }
    };

    // Peer joined - BOTH peers create offers (Perfect Negotiation handles collision)
    eventSource.addEventListener('peer-joined', async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Videolify] Peer joined event:', data);

        // CRITICAL: Cancel peer-left timeout if it exists
        // This peer reconnected after SSE dropout, don't close their channels!
        if ((window as any).__peerLeftTimeout) {
          clearTimeout((window as any).__peerLeftTimeout);
          (window as any).__peerLeftTimeout = null;
          setIsReconnecting(false); // Clear reconnecting state
          console.log('[Videolify] ✅ Peer reconnected - cancelled channel close timeout');
        }

        // Check if this is a rejoin within 30s window
        const timeSinceLeft = peerLeftTimeRef.current
          ? Date.now() - peerLeftTimeRef.current
          : Infinity;

        if (timeSinceLeft < 30000) {
          console.log('[Videolify] Peer rejoined within 30s window - fast reconnect');
          peerLeftTimeRef.current = null;
        }

        const isRejoin = remotePeerIdRef.current === data.peerId;
        const isPeerF5 = remotePeerIdRef.current && remotePeerIdRef.current !== data.peerId;
        
        console.log('[Videolify] 🔍 peer-joined event:', {
          newPeerId: data.peerId,
          currentRemotePeerId: remotePeerIdRef.current,
          isRejoin,
          isPeerF5,
          shouldInitiate: data.shouldInitiate,
          hasConnection: !!peerConnectionRef.current,
          virtualBgEnabled,
          backgroundMode,
        });
        
        // ✅ VBG will be sent when ICE connection becomes stable (see iceconnectionstatechange handler)
        // No need to send here - peer might not be ready to receive yet
        
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

        // ✅ UNIFIED LOGIC: Treat initial join same as F5 rejoin
        if (peerConnectionRef.current) {
          // Has connection - check if F5 (different peer ID)
          if (remotePeerIdRef.current && remotePeerIdRef.current !== data.peerId) {
            console.log('[Videolify] 🔥 F5 detected - closing old connection', {
              oldPeerId: remotePeerIdRef.current,
              newPeerId: data.peerId,
            });
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
            remotePeerIdRef.current = data.peerId;
            makingOfferRef.current = false;
            ignoreOfferRef.current = false;
          } else {
            // Same peer - check if connection is actually connected
            const connState = peerConnectionRef.current.connectionState;
            const iceState = peerConnectionRef.current.iceConnectionState;
            
            if (!remotePeerIdRef.current) {
              remotePeerIdRef.current = data.peerId;
              console.log('[Videolify] Set missing remote peer ID:', data.peerId);
            }
            
            // Only return early if connection is ACTUALLY working
            if (connState === 'connected' && (iceState === 'connected' || iceState === 'completed')) {
              console.log('[Videolify] Connection exists and working to same peer - skipping');
              return;
            } else {
              console.log('[Videolify] Connection exists but not working (conn:', connState, 'ice:', iceState, ') - recreating');
              // Close and recreate
              peerConnectionRef.current.close();
              peerConnectionRef.current = null;
            }
          }
        } else {
          // No connection - set remote peer ID if not already set
          if (!remotePeerIdRef.current) {
            remotePeerIdRef.current = data.peerId;
            console.log('[Videolify] Set remote peer ID (fresh join):', data.peerId);
          }
        }
        
        if (data.shouldInitiate) {
          console.log('[Videolify] Creating connection (we initiate):', data.peerId);
          await createPeerConnection(true);
        } else {
          console.log('[Videolify] Waiting for offer from peer:', data.peerId);
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

    // ✅ NEW: VBG settings synchronization
    eventSource.addEventListener('vbg-settings', async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📥 [VBG-DEBUG] Received VBG settings from peer:', data);

        if (!remoteOriginalStreamRef.current) {
          console.warn('⚠️ [VBG-DEBUG] No remote stream available yet - storing pending settings');
          // ✅ CRITICAL FIX: Store pending settings to apply when remote stream becomes available
          pendingRemoteVbgSettingsRef.current = data;
          return;
        }

        // Get peer ID for localStorage key
        const peerId = remotePeerIdRef.current;
        if (!peerId) {
          console.warn('⚠️ [VBG-DEBUG] No peer ID available');
          return;
        }

        // ✅ Call helper function to apply/disable VBG
        await applyRemoteVbgSettings(data, peerId);
      } catch (err) {
        // Silent fail
      }
    });

    // Peer left
    eventSource.addEventListener('peer-left', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.peerId === remotePeerIdRef.current) {
          console.log('[Videolify] Peer left - waiting 2s before closing (F5 reconnect grace period)');

          // Mark when peer left for rejoin window
          peerLeftTimeRef.current = Date.now();
          
          // Show reconnecting state instead of connection lost
          setIsReconnecting(true);
          setConnectionStats(prev => ({ ...prev, connected: false }));

          // CRITICAL FIX: Don't close channels immediately!
          // SSE connection might have dropped temporarily (browser tab sleep, network hiccup, F5, etc.)
          // and will reconnect within 1-2 seconds. If we close channels now, P2P connection is lost forever.
          //
          // Wait 1 second to see if peer reconnects (peer-joined event will cancel this timeout)
          const peerLeftTimeout = setTimeout(() => {
            console.log('[Videolify] 1s grace period expired - peer did not reconnect, closing connection');
            setIsReconnecting(false);

            // ✅ Cleanup peer VBG config from localStorage
            try {
              const peerId = data.peerId;
              localStorage.removeItem(`peer-${peerId}-vbg-mode`);
              localStorage.removeItem(`peer-${peerId}-vbg-blur`);
              localStorage.removeItem(`peer-${peerId}-vbg-background`);
              console.log('💾 [VBG] Cleaned up peer VBG config from localStorage');
            } catch (err) {
              console.error('❌ [VBG] Failed to cleanup localStorage:', err);
            }

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

            // Clear remote peer ID
            remotePeerIdRef.current = null;
          }, 2000); // 2 second grace period

          // Store timeout ID so peer-joined can cancel it
          (window as any).__peerLeftTimeout = peerLeftTimeout;
          
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
              setIsReconnecting(false); // Clear reconnecting state after timeout
            }
          }, 30000);
        }
      } catch (err) {
        console.error('[Videolify] Error handling peer-left:', err);
      }
    });

    // Peer replaced (device switch detected by server)
    eventSource.addEventListener('peer-replaced', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.warn('[Videolify] 🔄 Peer replaced event:', data);
        
        if (data.oldPeerId === peerIdRef.current) {
          // THIS device was replaced by another device
          console.error('[Videolify] ❌ This device has been replaced by another device');
          
          // Set flag to prevent SSE reconnection
          deviceReplacedRef.current = true;
          
          // Show alert to user
          alert(data.message || 'Bạn đã đăng nhập từ thiết bị khác. Kết nối này sẽ bị đóng.');
          
          // Close SSE
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
          
          // Close peer connection
          const pc = peerConnectionRef.current;
          if (pc) {
            pc.close();
            peerConnectionRef.current = null;
          }
          
          // Clear remote video
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          
          // Clear state
          remotePeerIdRef.current = null;
          setIsConnecting(false);
          
          // Optionally: redirect to dashboard
          if (onCallEnd) {
            console.log('[Videolify] Calling onCallEnd due to device replacement');
            onCallEnd();
          }
        } else if (data.oldPeerId === remotePeerIdRef.current) {
          // REMOTE peer switched devices
          console.warn('[Videolify] 🔄 Remote peer switched devices, resetting connection...');
          console.log(`[Videolify] Old peer: ${data.oldPeerId}, New peer: ${data.newPeerId}`);
          
          // Close existing peer connection
          const pc = peerConnectionRef.current;
          if (pc && typeof pc.close === 'function') {
            console.log('[Videolify] Closing old peer connection');
            pc.close();
            peerConnectionRef.current = null;
          } else {
            console.log('[Videolify] No peer connection to close or already closed');
          }
          
          // Clear remote video temporarily
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          
          // Update remote peer ID to new device
          remotePeerIdRef.current = data.newPeerId;
          
          // Reset connection state
          setIsConnecting(true);
          makingOfferRef.current = false;
          ignoreOfferRef.current = false;
          
          // Create new peer connection for new device
          const newPc = createPeerConnection();
          peerConnectionRef.current = newPc;
          
          console.log('[Videolify] ✅ Ready to reconnect with new device');
        }
      } catch (err) {
        console.error('[Videolify] Error handling peer-replaced:', err);
      }
    });

    eventSource.onerror = (error) => {
      console.error('[Videolify] SSE error:', error);
      
      // Don't reconnect if device was replaced
      if (deviceReplacedRef.current) {
        console.log('[Videolify] Device was replaced, not reconnecting SSE');
        return;
      }
      
      // PASSIVE EVENT-DRIVEN: SSE auto-reconnect with exponential backoff
      const attempts = sseReconnectAttemptsRef.current;
      const maxAttempts = 10;
      
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
      const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
      
      if (attempts < maxAttempts) {
        console.log(`🔄 [Videolify] SSE reconnecting in ${delay/1000}s (${attempts + 1}/${maxAttempts})`);
        
        setTimeout(() => {
          // Only reconnect if still closed
          if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
            sseReconnectAttemptsRef.current++;
            connectSSE();
          } else {
            console.log('✅ [Videolify] SSE already reconnected');
          }
        }, delay);
      } else {
        // Max retries - check network status
        if (navigator.onLine) {
          console.warn('⚠️ [Videolify] SSE failed (network OK) - likely server restart, retrying every 10s');
          
          // Reset and retry indefinitely during server downtime
          sseReconnectAttemptsRef.current = 0;
          setTimeout(() => {
            if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
              connectSSE();
            }
          }, 10000);
        } else {
          console.warn('📴 [Videolify] Network offline - waiting for network restoration');
          // Browser will fire 'online' event when network restored
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
      
      // 🚫 Kiểm tra phòng đầy
      if (!response.ok || result.error === 'ROOM_FULL') {
        console.error('[Videolify] Room is full:', result);
        toast({
          title: 'Phòng học đã đầy',
          description: result.message || 'Lớp dạy 1-1 đã đủ người. Bạn không có quyền vào lớp này.',
          variant: 'destructive',
        });
        setError(result.message || 'Phòng học đã đầy');
        
        // Tự động quay lại sau 3 giây
        setTimeout(() => {
          if (onCallEnd) {
            onCallEnd();
          }
        }, 3000);
        
        return;
      }
      
      console.log('[Videolify] ✅ Joined room successfully:', result);
      console.log(`[Videolify] 📊 Received ${result.peers?.length || 0} existing peers:`, result.peers);
      console.log(`[Videolify] 🎯 Server says shouldInitiate: ${result.shouldInitiate}`);

      // CRITICAL FIX: Only create offer if SERVER tells us to (based on peer ID comparison)
      // This prevents Perfect Negotiation collision where BOTH peers create offers
      // Server uses lexicographic peer ID comparison: lower ID = POLITE = initiates
      if (result.peers && result.peers.length > 0) {
        // Filter out ourselves from the peers list
        const otherPeers = result.peers.filter((p: any) => p.peerId !== peerIdRef.current);

        console.log(`[Videolify] 🔍 After filtering self (${peerIdRef.current}): ${otherPeers.length} other peers`, otherPeers);

        if (otherPeers.length > 0) {
          remotePeerIdRef.current = otherPeers[0].peerId;
          console.log(`[Videolify] 🎯 Selected remote peer: ${remotePeerIdRef.current} (${otherPeers[0].userName})`);

          // Only create offer if server tells us to (prevents collision)
          if (result.shouldInitiate) {
            console.log('[Videolify] ✅ Creating offer to existing peer (server-authorized):', remotePeerIdRef.current);
            await createPeerConnection(true);
          } else {
            console.log('[Videolify] ⏸️  NOT creating offer (waiting for remote peer to initiate):', remotePeerIdRef.current);
            // Don't create connection yet - wait for the other peer to send an offer
            // We'll create the connection when we receive their offer (in offer handler)
          }
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

      // ✅ DEBUG: Expose peer connection for testing
      if (typeof window !== 'undefined') {
        (window as any).__VIDEOLIFY_DEBUG__ = { 
          peerConnection: pc,
          localStream: localStreamRef.current,
          remoteStream: remoteOriginalStreamRef.current,
        };
        console.log('🔍 [DEBUG] Exposed window.__VIDEOLIFY_DEBUG__ for testing');
      }

      // Add local media tracks
      if (localStreamRef.current) {
        const tracks = localStreamRef.current.getTracks();
        console.log(`[Videolify] Adding ${tracks.length} local tracks to peer connection`);
        
        if (tracks.length === 0) {
          // CRITICAL FIX: When user disables camera/mic, add recvonly transceivers
          // This allows connection to work even without sending media
          console.warn('[Videolify] No local tracks - adding recvonly transceivers for compatibility');
          pc.addTransceiver('audio', { direction: 'recvonly' });
          pc.addTransceiver('video', { direction: 'recvonly' });
        } else {
          tracks.forEach(track => {
            console.log(`[Videolify] Adding track: ${track.kind}`);
            pc.addTrack(track, localStreamRef.current!);
          });
        }
      } else {
        console.warn('[Videolify] No local stream available - adding recvonly transceivers');
        pc.addTransceiver('audio', { direction: 'recvonly' });
        pc.addTransceiver('video', { direction: 'recvonly' });
      }

      // Receive remote media
      pc.ontrack = (event) => {
        console.log('[Videolify] ontrack event fired!');
        console.log('[Videolify] Track kind:', event.track.kind);
        console.log('[Videolify] Streams:', event.streams);
        console.log('[Videolify] remoteVideoRef.current:', remoteVideoRef.current);
        
        // PASSIVE EVENT-DRIVEN: Monitor track lifecycle
        event.track.onended = () => {
          console.warn('⚠️ [Videolify] Remote track ended:', event.track.kind);
          
          // Check if this is due to connection issue or peer action
          if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
            console.error('❌ [Videolify] Track ended due to connection failure - triggering recovery');
            setConnectionStats(prev => ({ ...prev, connected: false }));
            
            // Attempt ICE restart to restore connection
            if (pc.iceConnectionState === 'disconnected') {
              handleICEFailure(pc);
            }
          } else if (pc.connectionState === 'connected') {
            console.log('ℹ️ [Videolify] Track ended but connection OK - peer may have stopped/switched media');
            // Connection is OK, peer just stopped their media - this is normal
          }
        };
        
        event.track.onmute = () => {
          console.warn('⚠️ [Videolify] Remote track muted:', event.track.kind);
          // Mute is usually intentional (peer muted mic/camera), not a connection issue
        };
        
        event.track.onunmute = () => {
          console.log('✅ [Videolify] Remote track unmuted:', event.track.kind);
        };
        
        if (event.streams && event.streams[0]) {
          // ✅ STEP 5 (ontrack): Store original remote stream
          remoteOriginalStreamRef.current = event.streams[0];
          console.log('💾 [VBG] Remote original stream stored');

          // ✅ CRITICAL FIX: Apply pending VBG settings if received before stream ready
          if (pendingRemoteVbgSettingsRef.current) {
            console.log('📦 [VBG] Applying pending VBG settings received earlier:', pendingRemoteVbgSettingsRef.current);
            const pendingData = pendingRemoteVbgSettingsRef.current;
            const peerId = remotePeerIdRef.current;

            if (peerId) {
              // Apply pending settings
              applyRemoteVbgSettings(pendingData, peerId).catch(err => {
                console.error('❌ [VBG] Failed to apply pending VBG settings:', err);
              });
            }

            // Clear pending settings
            pendingRemoteVbgSettingsRef.current = null;
          }

          // Monitor stream state
          const stream = event.streams[0];
          const checkStreamHealth = () => {
            const videoTracks = stream.getVideoTracks();
            const audioTracks = stream.getAudioTracks();
            
            const hasActiveVideo = videoTracks.some(t => t.readyState === 'live' && t.enabled);
            const hasActiveAudio = audioTracks.some(t => t.readyState === 'live' && t.enabled);
            
            if (!hasActiveVideo && !hasActiveAudio) {
              console.warn('⚠️ [Videolify] Remote stream has no active tracks - possible connection issue');
            }
          };
          
          // Check stream health periodically
          const healthCheckInterval = setInterval(() => {
            if (!pc || pc.connectionState === 'closed') {
              clearInterval(healthCheckInterval);
              return;
            }
            checkStreamHealth();
          }, 5000); // Check every 5 seconds
          
          // Attach stream to remote video element
          const attachStream = () => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = event.streams[0];
              console.log('✅ [Videolify] Remote video stream attached');
              
              // ✅ STEP 6 (F5 Restore): Check localStorage for peer's VBG config
              const peerId = remotePeerIdRef.current;
              if (peerId) {
                try {
                  const savedMode = localStorage.getItem(`peer-${peerId}-vbg-mode`);
                  const savedBlur = localStorage.getItem(`peer-${peerId}-vbg-blur`);
                  const savedBackground = localStorage.getItem(`peer-${peerId}-vbg-background`);
                  
                  if (savedMode && savedMode !== 'none') {
                    console.log('🎭 [VBG] Restoring peer VBG from localStorage:', {
                      peerId,
                      mode: savedMode,
                      blur: savedBlur,
                      hasBackground: !!savedBackground
                    });
                    
                    // Show loading state before applying VBG
                    setRemoteVbgLoading(true);
                    
                    // Apply VBG from saved config
                    applyVbgToRemoteVideoWithConfig({
                      mode: savedMode,
                      blurAmount: parseInt(savedBlur || '10'),
                      backgroundImage: savedBackground || undefined
                    }).then(() => {
                      // Hide loading after VBG ready
                      setTimeout(() => setRemoteVbgLoading(false), 500);
                    }).catch(err => {
                      console.error('❌ [VBG] Failed to restore peer VBG:', err);
                      setRemoteVbgLoading(false);
                    });
                  }
                } catch (err) {
                  console.error('❌ [VBG] Error reading peer VBG from localStorage:', err);
                  setRemoteVbgLoading(false);
                }
              }
              
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
          performance.mark('ice-gathering-start');
          // Set timeout for stuck ICE gathering - reduced from 15s to 8s
          iceGatheringTimeoutRef.current = setTimeout(() => {
            if (pc.iceGatheringState === 'gathering') {
              console.warn('⚠️ [Videolify] ICE gathering stuck >8s - forcing completion');
              
              // If gathering fails, trigger ICE restart
              setTimeout(() => {
                if (pc.iceGatheringState === 'gathering' || pc.iceConnectionState === 'failed') {
                  console.error('[Videolify] ICE gathering failed - triggering restart');
                  handleICEFailure(pc);
                }
              }, 3000); // Give 3 more seconds before forcing restart (reduced from 5s)
            }
          }, 8000); // Reduced from 15s to 8s
        } else if (pc.iceGatheringState === 'complete') {
          performance.mark('ice-gathering-end');
          try {
            performance.measure('ice-gathering-duration', 'ice-gathering-start', 'ice-gathering-end');
            const iceTime = performance.getEntriesByName('ice-gathering-duration')[0]?.duration || 0;
            console.log(`⏱️  [TIMING] ICE gathering: ${Math.round(iceTime)}ms`);
          } catch (e) {
            // Ignore if start mark not found
          }
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
          // SUCCESS: Full connection established
          performance.mark('p2p-connected');
          console.log('✅ [Videolify] P2P Connection Established - Server load now 0%');
          setIsConnecting(false);
          setWasConnected(true);
          setConnectionStats(prev => ({ ...prev, connected: true }));
          negotiationInProgressRef.current = false;
          
          // Reset all retry counters on successful connection
          iceRestartAttemptsRef.current = 0;
          sseReconnectAttemptsRef.current = 0;
          
        } else if (pc.connectionState === 'connecting') {
          console.log('🔄 [Videolify] Connection establishing...');
          setIsConnecting(true);
          
        } else if (pc.connectionState === 'disconnected') {
          // TEMPORARY: Wait 2s for auto-recovery (browser might reconnect automatically or peer F5)
          console.warn('⚠️ [Videolify] Connection disconnected - waiting 2s for auto-recovery...');
          setConnectionStats(prev => ({ ...prev, connected: false }));
          setIsConnecting(true);
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (pc.connectionState === 'disconnected') {
              console.warn('[Videolify] Still disconnected after 2s - triggering ICE restart');
              handleICEFailure(pc);
            }
          }, 2000);
          
        } else if (pc.connectionState === 'failed') {
          // TERMINAL: Connection completely failed → Need full reconnect
          console.error('❌ [Videolify] Connection FAILED - triggering full reconnect');
          setConnectionStats(prev => ({ ...prev, connected: false }));
          negotiationInProgressRef.current = false;
          
          // connectionState 'failed' is terminal - full reconnect needed
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
        
        // PASSIVE EVENT-DRIVEN AUTO-RECOVERY (0% CPU when healthy)
        if (pc.iceConnectionState === 'failed') {
          // TERMINAL STATE: ICE completely failed → Full recovery needed
          console.error('❌ [Videolify] ICE Connection FAILED - attempting full recovery');
          setConnectionStats(prev => ({ ...prev, connected: false }));
          handleICEFailure(pc);
          
        } else if (pc.iceConnectionState === 'disconnected') {
          // TEMPORARY STATE: Give 3s to auto-recover before intervening
          console.warn('⚠️ [Videolify] ICE Disconnected - waiting 3s for auto-recovery...');
          setConnectionStats(prev => ({ ...prev, connected: false }));
          
          // Clear any existing timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          // Wait 3s - if still disconnected, attempt ICE restart (lightweight)
          reconnectTimeoutRef.current = setTimeout(() => {
            if (pc.iceConnectionState === 'disconnected') {
              console.warn('⚠️ [Videolify] Still disconnected after 3s - attempting ICE restart');
              
              // Try lightweight ICE restart first (just refresh candidates)
              if ('restartIce' in pc && typeof pc.restartIce === 'function') {
                try {
                  pc.restartIce();
                  console.log('✅ [Videolify] ICE restart initiated');
                } catch (err) {
                  console.error('❌ [Videolify] restartIce() failed, falling back to createOffer');
                  handleICEFailure(pc);
                }
              } else {
                // Fallback for browsers without restartIce()
                handleICEFailure(pc);
              }
            }
          }, 3000);
          
        } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          // SUCCESS: Connection healthy
          console.log('✅ [Videolify] ICE Connection healthy -', pc.iceConnectionState);
          setConnectionStats(prev => ({ ...prev, connected: true }));
          
          // Reset retry counters on success
          iceRestartAttemptsRef.current = 0;
          
          // Clear any pending recovery timeouts
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          
          // 📡 CRITICAL FIX: Send VBG settings when ICE connection is stable
          // This ensures peer is ready to receive (SSE listener active)
          // ✅ Read from localStorage directly to avoid state sync issues
          const vbgEnabledLS = localStorage.getItem('vbg-enabled') === 'true';
          const bgModeLS = localStorage.getItem('vbg-last-mode') || backgroundMode;
          const bgImageLS = localStorage.getItem('vbg-background-image');
          const blurAmountLS = parseInt(localStorage.getItem('vbg-blur-amount') || '10');
          
          if (vbgEnabledLS && bgModeLS !== 'none' && remotePeerIdRef.current) {
            console.log('📡 [VBG] ICE stable - sending VBG settings to peer', {
              mode: bgModeLS,
              remotePeerId: remotePeerIdRef.current,
              blurAmount: blurAmountLS,
              hasBackgroundImage: !!bgImageLS,
            });
            
            fetch('/api/videolify/signal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'vbg-settings',
                roomId,
                peerId: peerIdRef.current,
                data: {
                  enabled: true,
                  mode: bgModeLS,
                  blurAmount: bgModeLS === 'blur' ? blurAmountLS : undefined,
                  backgroundImage: bgModeLS === 'image' ? bgImageLS : undefined,
                  toPeerId: remotePeerIdRef.current,
                },
              }),
            }).then(() => {
              console.log('✅ [VBG] VBG settings sent after ICE stable');
            }).catch(err => {
              console.error('❌ [VBG] Failed to send VBG after ICE stable:', err);
            });
          } else {
            console.log('⏭️ [VBG] Skipping VBG send:', {
              vbgEnabledLS,
              bgModeLS,
              remotePeerId: remotePeerIdRef.current,
            });
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
        
        performance.mark('offer-start');
        makingOfferRef.current = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        makingOfferRef.current = false;
        performance.mark('offer-end');
        performance.measure('offer-duration', 'offer-start', 'offer-end');
        const offerTime = performance.getEntriesByName('offer-duration')[0]?.duration || 0;
        console.log(`⏱️  [TIMING] Create offer: ${Math.round(offerTime)}ms`);
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
        
        // ✅ VBG will be sent when ICE connection becomes stable (see iceconnectionstatechange handler)
        // This ensures peer is ready to receive the settings
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
      // CRITICAL: Use explicit configuration for cross-browser compatibility (Chrome vs Edge)
      // ordered: true ensures messages arrive in order
      whiteboardChannelRef.current = pc.createDataChannel('whiteboard', { ordered: true });
      chatChannelRef.current = pc.createDataChannel('chat', { ordered: true });
      controlChannelRef.current = pc.createDataChannel('control', { ordered: true });
      fileChannelRef.current = pc.createDataChannel('file', { ordered: false }); // File can handle unordered chunks

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

    // CRITICAL: Set onmessage handler FIRST (before onopen)!
    // Messages may arrive while channel is opening, must catch them
    channel.onmessage = (event) => {
      try {
        const drawEvent: DrawEvent = JSON.parse(event.data);
        console.log('📥 [Videolify] Whiteboard event RECEIVED:', drawEvent.type, drawEvent);
        applyDrawEvent(drawEvent);
      } catch (e) {
        console.error('❌ [Videolify] Failed to parse whiteboard event:', e);
      }
    };

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
            const newChannel = pc.createDataChannel('whiteboard', { ordered: true });
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
      // Don't spam console with errors during reconnection - expected behavior
      if (isReconnecting) {
        console.log('⚠️ [Videolify] Whiteboard DataChannel error during reconnect (expected)');
      } else {
        console.warn('⚠️ [Videolify] Whiteboard DataChannel error:', error);
      }
    };
  }

  function initializeWhiteboard() {
    if (!whiteboardCanvasRef.current || whiteboardFabricRef.current) return;

    console.log('🎨 [Videolify] Initializing whiteboard canvas');

    // CRITICAL FIX: Get actual canvas element dimensions
    const canvasElement = whiteboardCanvasRef.current;
    const parentWidth = canvasElement.parentElement?.clientWidth || 1280;
    const parentHeight = canvasElement.parentElement?.clientHeight || 720;

    console.log(`🎨 [Videolify] Canvas dimensions: ${parentWidth}x${parentHeight}`);

    const canvas = new fabric.Canvas(canvasElement, {
      width: parentWidth,
      height: parentHeight,
      isDrawingMode: true,
      renderOnAddRemove: true,  // Force render when objects added/removed
      preserveObjectStacking: true, // Keep object order
    });

    canvas.freeDrawingBrush.width = 3; // Slightly thicker for better visibility
    canvas.freeDrawingBrush.color = '#000000';

    // CRITICAL: Disable selection to prevent accidental deletion
    canvas.selection = false;

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

      // CRITICAL FIX: Lock path to prevent deletion
      // Make path non-selectable and non-evented in drawing mode
      path.set({
        selectable: false,
        evented: false,
        objectCaching: true, // Enable caching for better performance
        lockMovementX: true,  // Lock all transformations
        lockMovementY: true,
        lockRotation: true,
        lockScalingX: true,
        lockScalingY: true,
        hasControls: false,   // Remove transform controls
        hasBorders: false,    // Remove selection borders
      });

      console.log('✏️ [Videolify] Path created, ID:', path.id, 'Objects on canvas BEFORE:', canvas.getObjects().length);

      // Force add path to canvas (redundant but ensures it's there)
      // Fabric.js should have already added it, but let's be explicit
      if (!canvas.getObjects().includes(path)) {
        console.warn('⚠️ [Videolify] Path not on canvas, manually adding');
        canvas.add(path);
      }

      sendDrawEvent({
        type: 'draw',
        data: path.toJSON(['id']), // Include custom 'id' property
      });
      console.log('📤 [Videolify] Drawing sent via P2P');

      // Force render to ensure path is visible
      canvas.renderAll();

      // Verify path is still on canvas after render
      const objectsAfter = canvas.getObjects().length;
      console.log('🖱️ [Videolify] Canvas rendered, objects AFTER:', objectsAfter);

      if (objectsAfter === 0) {
        console.error('❌ [Videolify] BUG: Path disappeared after render! Attempting to re-add...');
        canvas.add(path);
        canvas.renderAll();
        console.log('🔄 [Videolify] Re-added path, objects now:', canvas.getObjects().length);
      }

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

    // Expose refs to window for testing/debugging
    if (typeof window !== 'undefined') {
      (window as any).whiteboardFabricRef = whiteboardFabricRef;
      (window as any).fabric = fabric;
      console.log('🔍 [Videolify] Exposed refs to window for testing');
    }

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

    console.log('✏️ [Videolify] Sending draw event:', event.type, 'channel state:', channel?.readyState);

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
        console.log('📤 [Videolify] Draw event sent via P2P, bufferedAmount:', channel.bufferedAmount);
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
    if (!canvas) {
      console.warn('⚠️ [Videolify] Cannot apply draw event - canvas not initialized yet');
      return;
    }

    console.log('🎨 [Videolify] Applying draw event:', event.type, 'canvas objects before:', canvas.getObjects().length);

    if (event.type === 'draw' && event.data) {
      fabric.util.enlivenObjects(
        [event.data],
        (objects: fabric.Object[]) => {
          objects.forEach((obj: any) => {
            // CRITICAL FIX: Lock remote path to prevent deletion
            obj.set({
              selectable: false,
              evented: false,
              objectCaching: true,
              lockMovementX: true,
              lockMovementY: true,
              lockRotation: true,
              lockScalingX: true,
              lockScalingY: true,
              hasControls: false,
              hasBorders: false,
            });

            canvas.add(obj);
            console.log('✅ [Videolify] Added remote drawing object to canvas, ID:', obj.id);
          });
          canvas.renderAll();
          const objectCount = canvas.getObjects().length;
          console.log('🎨 [Videolify] Canvas rendered, total objects:', objectCount);

          if (objectCount === 0) {
            console.error('❌ [Videolify] BUG: Remote path disappeared after render!');
          }
        },
        ''
      );
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
      } else {
        console.warn('⚠️ [Videolify] Could not find object to erase:', event.objectId);
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
      console.error(`❌ [Videolify] ICE restart failed ${MAX_ICE_RETRIES} times - full reconnect needed`);
      
      // After 3 ICE restarts failed → Full reconnect
      await fullReconnect();
      return;
    }
    
    // Exponential backoff: 1s, 2s, 4s
    const backoffDelay = Math.min(1000 * Math.pow(2, iceRestartAttemptsRef.current - 1), 4000);
    console.log(`🔄 [Videolify] ICE restart ${iceRestartAttemptsRef.current}/${MAX_ICE_RETRIES} in ${backoffDelay}ms`);
    
    setTimeout(async () => {
      try {
        if (!pc || pc.connectionState === 'closed') {
          console.warn('[Videolify] PeerConnection closed, cannot restart ICE');
          return;
        }
        
        // PASSIVE EVENT-DRIVEN: Create ICE restart offer
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
        
        // Retry if not max attempts yet
        if (iceRestartAttemptsRef.current < MAX_ICE_RETRIES) {
          handleICEFailure(pc);
        } else {
          fullReconnect();
        }
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
    
    // PASSIVE EVENT-DRIVEN: Minimal heartbeat just for DataChannel keep-alive
    // All connection monitoring is now event-driven (0% CPU when healthy)
    // This just sends periodic ping to keep NAT bindings alive
    heartbeatIntervalRef.current = setInterval(() => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      
      // Only send DataChannel ping to keep NAT alive (no connection checks here)
      // All connection monitoring is handled by event listeners
      const channel = controlChannelRef.current;
      if (channel && channel.readyState === 'open') {
        try {
          // Send ping only if buffer is clear (avoid SCTP issues)
          if (channel.bufferedAmount === 0) {
            const ping = { type: 'ping', timestamp: Date.now() };
            channel.send(JSON.stringify(ping));
          }
        } catch (e) {
          // Ignore send errors - event listeners will handle connection issues
          console.debug('[Videolify] Heartbeat ping failed (events will handle):', e);
        }
      }
    }, 5000); // Check every 5s
  }

  /**
   * 7. Chat Data Channel - P2P Messages
   */
  function setupChatChannel(channel: RTCDataChannel) {
    console.log('💬 [Videolify] Setting up chat channel, current state:', channel.readyState);
    setChannelStates(prev => ({ ...prev, chat: channel.readyState }));

    // CRITICAL: Set onmessage handler FIRST, before onopen!
    // If channel is already "open" when we receive it (answerer side),
    // messages can arrive before onopen fires. Setting onmessage first ensures we catch them.
    channel.onmessage = (event) => {
      console.log('📥 [Videolify] Chat channel RAW message received:', typeof event.data, event.data?.substring?.(0, 100));
      try {
        const msg = JSON.parse(event.data);
        const latency = Date.now() - msg.timestamp;
        console.log(`📥 [Videolify] Chat message received, latency: ${latency}ms, from: ${msg.userName}`);
        setChatMessages(prev => [...prev, {
          ...msg,
          fromMe: false,
        }]);
      } catch (e) {
        console.error('❌ [Videolify] Failed to parse chat message:', e, event.data);
      }
    };

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
            const newChannel = pc.createDataChannel('chat', { ordered: true });
            chatChannelRef.current = newChannel;
            setupChatChannel(newChannel);
          } catch (e) {
            console.error('[Videolify] Failed to recreate chat channel:', e);
            handleICEFailure(pc);
          }
        }, 1000);
      }
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

    const messageStr = JSON.stringify(message);
    console.log('💬 [Videolify] Sending chat message via channel:', chatChannelRef.current.readyState, messageStr.substring(0, 100));

    try {
      chatChannelRef.current.send(messageStr);
      console.log('💬 [Videolify] Chat message sent successfully, bufferedAmount:', chatChannelRef.current.bufferedAmount);
    } catch (e) {
      console.error('❌ [Videolify] Failed to send chat message:', e);
    }

    setChatMessages(prev => [...prev, message]);
    setChatInput('');
  }

  /**
   * 8. Control Data Channel - Hand Raise, etc
   */
  function setupControlChannel(channel: RTCDataChannel) {
    console.log('🎛️ [Videolify] Setting up control channel, current state:', channel.readyState);
    setChannelStates(prev => ({ ...prev, control: channel.readyState }));

    // CRITICAL: Set onmessage handler FIRST!
    channel.onmessage = (event) => {
      console.log('📥 [Videolify] Control channel received raw message:', typeof event.data, event.data?.substring?.(0, 100));
      try {
        const control = JSON.parse(event.data);
        console.log('📥 [Videolify] Control message parsed:', control.type, control);

        if (control.type === 'ping') {
          // Respond with pong
          try {
            const pong = { type: 'pong', timestamp: Date.now() };
            const pongStr = JSON.stringify(pong);
            console.log('📤 [Videolify] Sending pong:', pongStr);
            channel.send(pongStr);
          } catch (e) {
            console.error('❌ [Videolify] Failed to send pong:', e);
          }
        } else if (control.type === 'pong') {
          // Update last pong time
          lastPongTimeRef.current = Date.now();
          const latency = Date.now() - control.timestamp;
          console.log(`✅ [Videolify] Pong received, latency: ${latency}ms`);
          if (latency > 500) {
            console.warn(`⚠️ [Videolify] High latency: ${latency}ms`);
          }
        } else if (control.type === 'hand-raise') {
          setRemoteHandRaised(control.raised);
        } else if (control.type === 'whiteboard-toggle') {
          console.log('🎨 [Videolify] Remote peer toggled whiteboard:', control.isOpen);
          setShowWhiteboard(control.isOpen);
        } else if (control.type === 'video-toggle') {
          console.log('📹 [Videolify] Remote peer toggled video:', control.enabled);
          setRemoteVideoEnabled(control.enabled);
        } else if (control.type === 'audio-toggle') {
          console.log('🎤 [Videolify] Remote peer toggled audio:', control.enabled);
          setRemoteAudioEnabled(control.enabled);
        } else if (control.type === 'user-info') {
          console.log('👤 [Videolify] Received user-info:', control.userName);
          setRemotePeerName(control.userName || '');
          if (control.videoEnabled !== undefined) setRemoteVideoEnabled(control.videoEnabled);
          if (control.audioEnabled !== undefined) setRemoteAudioEnabled(control.audioEnabled);
        }
      } catch (parseErr) {
        console.error('❌ [Videolify] Failed to parse control message:', parseErr, event.data);
      }
    };

    channel.onopen = () => {
      console.log('✅ [Videolify] Control DataChannel OPEN');
      setChannelStates(prev => ({ ...prev, control: 'open' }));

      // CRITICAL: Send user info to peer immediately
      try {
        channel.send(JSON.stringify({
          type: 'user-info',
          userName: userDisplayName,
          videoEnabled: isVideoEnabled,
          audioEnabled: isAudioEnabled,
        }));
        console.log(`📤 [Videolify] Sent user-info: ${userDisplayName}`);
      } catch (e) {
        console.warn('[Videolify] Failed to send user-info:', e);
      }

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
        // REMOVED: Annoying toast notification
        
        setTimeout(() => {
          try {
            const newChannel = pc.createDataChannel('control', { ordered: true });
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

  function toggleWhiteboard() {
    const newState = !showWhiteboard;
    setShowWhiteboard(newState);
    console.log(`🎨 [Videolify] Whiteboard ${newState ? 'OPENED' : 'CLOSED'}`);

    // Send toggle to peer via control channel
    const msg = JSON.stringify({
      type: 'whiteboard-toggle',
      isOpen: newState,
    });

    console.log('📤 [Videolify] Sending whiteboard toggle to peer:', newState);

    if (controlChannelRef.current?.readyState === 'open') {
      controlChannelRef.current.send(msg);
      console.log('✅ [Videolify] Whiteboard toggle sent via control channel');
    } else {
      console.warn('[Videolify] Control channel not ready - queueing whiteboard toggle');
      controlQueueRef.current.push(msg);
    }
  }

  /**
   * 10. File Sharing Data Channel - P2P Transfer
   */
  const CHUNK_SIZE = 65536; // 64KB chunks (increased for better speed)

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
        } else if (msg.type === 'file-progress') {
          // CRITICAL FIX: Sync sender progress to receiver
          console.log(`📊 [Videolify] Sender progress update: ${msg.progress}%`);
          setIncomingFile(prev => {
            if (!prev || prev.status !== 'transferring') return prev;
            return { ...prev, progress: msg.progress };
          });
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

  async function acceptFile() {
    if (!incomingFile || !fileChannelRef.current) return;

    // CRITICAL FIX: Let user choose save location using File System Access API
    try {
      // Check if File System Access API is supported
      if ('showSaveFilePicker' in window) {
        // Modern browsers - show save dialog
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: incomingFile.metadata.fileName,
          types: [{
            description: 'File',
            accept: {
              [incomingFile.metadata.fileType || 'application/octet-stream']: [
                '.' + (incomingFile.metadata.fileName.split('.').pop() || 'bin')
              ]
            }
          }]
        });

        // Store file handle for later saving
        (window as any).__fileHandle = handle;
        console.log('✅ [Videolify] User selected save location:', handle.name);
      } else {
        // Fallback: Browser will use default Downloads folder
        console.log('⚠️ [Videolify] File System Access API not supported, using default download');
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        console.log('❌ [Videolify] User cancelled save dialog');
        return; // User cancelled
      }
      console.warn('⚠️ [Videolify] Save dialog error, falling back to default download:', err);
    }

    setIncomingFile(prev => prev ? { ...prev, status: 'transferring', progress: 0 } : null);

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
    console.log(`📤 [Videolify] startFileSending called with fileId: ${fileId}`);

    const file = (window as any).__pendingFile as File;
    if (!file) {
      console.error('❌ [Videolify] No pending file found in window.__pendingFile');
      setOutgoingFile(prev => prev ? { ...prev, status: 'error' } : null);
      return;
    }

    if (!fileChannelRef.current) {
      console.error('❌ [Videolify] File channel not available');
      setOutgoingFile(prev => prev ? { ...prev, status: 'error' } : null);
      return;
    }

    if (fileChannelRef.current.readyState !== 'open') {
      console.error('❌ [Videolify] File channel not open:', fileChannelRef.current.readyState);
      setOutgoingFile(prev => prev ? { ...prev, status: 'error' } : null);
      return;
    }

    console.log(`✅ [Videolify] Starting P2P file transfer: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    const startTime = performance.now();

    setOutgoingFile(prev => prev ? { ...prev, status: 'transferring', progress: 0 } : null);

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    console.log(`📊 [Videolify] Total chunks: ${totalChunks}, chunk size: ${CHUNK_SIZE}`);

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        const arrayBuffer = await chunk.arrayBuffer();

        // Check buffer size before sending (prevent overflow)
        const channel = fileChannelRef.current;
        while (channel.bufferedAmount > CHUNK_SIZE * 4) {
          // Wait for buffer to drain
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Send chunk P2P
        channel.send(arrayBuffer);

        // Update local progress
        const progress = Math.round(((i + 1) / totalChunks) * 100);
        setOutgoingFile(prev => prev ? { ...prev, progress } : null);

        // CRITICAL FIX: Send progress update to receiver every 5% AND every 1% near the end
        // This ensures receiver sees progress updates frequently
        const shouldSendProgress =
          (progress % 5 === 0 && progress > 0 && progress < 95) || // Every 5% until 95%
          (progress >= 95 && progress % 1 === 0) || // Every 1% for 95-100%
          (progress === 100); // Always send 100%

        if (shouldSendProgress) {
          // Small delay to ensure chunk is processed before progress update
          await new Promise(resolve => setTimeout(resolve, 10));

          channel.send(JSON.stringify({
            type: 'file-progress',
            progress,
          }));
          console.log(`📊 [Videolify] Sent ${progress}% (${i + 1}/${totalChunks} chunks) + progress update`);
        } else if (progress % 10 === 0) {
          console.log(`📊 [Videolify] Sent ${progress}% (${i + 1}/${totalChunks} chunks)`);
        }
      }

      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000; // seconds
      const speed = (file.size / 1024 / 1024) / duration; // MB/s
      console.log(`✅ [Videolify] File sent successfully in ${duration.toFixed(2)}s, speed: ${speed.toFixed(2)} MB/s`);

      setOutgoingFile(prev => prev ? { ...prev, status: 'completed', progress: 100 } : null);

      toast({
        title: '✅ File sent!',
        description: `${file.name} sent successfully (${speed.toFixed(2)} MB/s)`,
        duration: 3000,
      });

      delete (window as any).__pendingFile;
    } catch (error) {
      console.error('❌ [Videolify] Error sending file:', error);
      setOutgoingFile(prev => prev ? { ...prev, status: 'error' } : null);

      toast({
        title: '❌ Error sending file',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
        duration: 5000,
      });
    }
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

  async function downloadReceivedFile(transfer: FileTransfer) {
    // Combine chunks into Blob
    const blob = new Blob(transfer.chunks, { type: transfer.metadata.fileType });
    const fileSizeMB = (transfer.metadata.fileSize / 1024 / 1024).toFixed(2);

    console.log(`✅ [Videolify] File received successfully: ${transfer.metadata.fileName} (${transfer.chunks.length} chunks, ${fileSizeMB} MB)`);

    try {
      // CRITICAL FIX: Use File System Access API if user chose location
      const fileHandle = (window as any).__fileHandle;
      if (fileHandle) {
        console.log('💾 [Videolify] Writing file to user-selected location...');
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        console.log('✅ [Videolify] File saved to:', fileHandle.name);

        // Clean up
        delete (window as any).__fileHandle;

        toast({
          title: '✅ File saved!',
          description: `${transfer.metadata.fileName} (${fileSizeMB} MB) saved to selected location.`,
          duration: 5000,
        });
      } else {
        // Fallback: Traditional download (will use Downloads folder)
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = transfer.metadata.fileName;
        document.body.appendChild(a); // Required for Firefox
        a.click();
        document.body.removeChild(a);

        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);

        toast({
          title: '✅ File received!',
          description: `${transfer.metadata.fileName} (${fileSizeMB} MB) - Check your Downloads folder.`,
          duration: 5000,
        });
      }
    } catch (err) {
      console.error('❌ [Videolify] Error saving file:', err);
      toast({
        title: '❌ Error saving file',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
        duration: 5000,
      });
    }
  }

  /**
   * 11. Screen Sharing - WebRTC Media Track with Adaptive Quality
   */
  
  /**
   * Monitor screen share quality and adjust parameters dynamically
   */
  function startScreenShareQualityMonitoring(sender: RTCRtpSender) {
    // Clear any existing monitor
    stopScreenShareQualityMonitoring();
    
    console.log('📊 [Videolify] Starting screen share quality monitoring');
    
    qualityMonitorIntervalRef.current = setInterval(async () => {
      if (!peerConnectionRef.current || !sender) {
        return;
      }
      
      try {
        const stats = await peerConnectionRef.current.getStats();
        
        stats.forEach((report) => {
          // Monitor outbound video stats (sender side)
          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            const bytesSent = report.bytesSent || 0;
            const packetsSent = report.packetsSent || 0;
            const framesEncoded = report.framesEncoded || 0;
            
            // Calculate current bitrate (if we have previous data)
            const currentBitrate = report.targetBitrate || 0;
            
            console.log(`📊 [Screenshare Stats] Bitrate: ${(currentBitrate / 1000000).toFixed(2)} Mbps, Frames: ${framesEncoded}, Packets: ${packetsSent}`);
          }
          
          // Monitor remote inbound stats (receiver feedback via RTCP)
          if (report.type === 'remote-inbound-rtp' && report.kind === 'video') {
            const packetsLost = report.packetsLost || 0;
            const jitter = report.jitter || 0;
            const roundTripTime = report.roundTripTime || 0;
            
            // Calculate packet loss rate
            const totalPackets = (report.packetsReceived || 0) + packetsLost;
            const lossRate = totalPackets > 0 ? packetsLost / totalPackets : 0;
            
            console.log(`📊 [Network Quality] Loss: ${(lossRate * 100).toFixed(2)}%, RTT: ${(roundTripTime * 1000).toFixed(0)}ms, Jitter: ${jitter.toFixed(3)}s`);
            
            // Auto-adjust quality based on network conditions
            const now = Date.now();
            const timeSinceLastAdjustment = now - lastQualityAdjustmentRef.current;
            
            // Only adjust every 5 seconds to avoid oscillation
            if (timeSinceLastAdjustment > 5000) {
              adjustScreenShareQuality(sender, lossRate, roundTripTime);
              lastQualityAdjustmentRef.current = now;
            }
          }
        });
      } catch (err) {
        console.error('❌ [Videolify] Error monitoring screen share quality:', err);
      }
    }, 3000); // Check every 3 seconds
  }
  
  /**
   * Adjust screen share quality based on network conditions
   */
  async function adjustScreenShareQuality(
    sender: RTCRtpSender,
    packetLossRate: number,
    rtt: number
  ) {
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        return;
      }
      
      const encoding = params.encodings[0];
      const currentBitrate = encoding.maxBitrate || 3000000;
      const currentScale = encoding.scaleResolutionDownBy || 1.0;
      
      let newBitrate = currentBitrate;
      let newScale = currentScale;
      let adjusted = false;
      
      // Poor network: packet loss > 5% OR RTT > 200ms
      if (packetLossRate > 0.05 || rtt > 0.2) {
        // Reduce bitrate by 20%
        newBitrate = Math.max(1000000, currentBitrate * 0.8);
        // Increase downscale slightly
        newScale = Math.min(3.0, currentScale * 1.2);
        adjusted = true;
        console.log(`⬇️ [Quality Adjust] Poor network detected - reducing quality`);
      }
      // Good network: packet loss < 1% AND RTT < 100ms
      else if (packetLossRate < 0.01 && rtt < 0.1) {
        // Increase bitrate by 20% (up to 5 Mbps max)
        newBitrate = Math.min(5000000, currentBitrate * 1.2);
        // Decrease downscale slightly (but not below 1.0)
        newScale = Math.max(1.0, currentScale * 0.9);
        adjusted = true;
        console.log(`⬆️ [Quality Adjust] Good network detected - increasing quality`);
      }
      
      // Apply changes if adjusted
      if (adjusted && (newBitrate !== currentBitrate || newScale !== currentScale)) {
        encoding.maxBitrate = Math.round(newBitrate);
        encoding.scaleResolutionDownBy = Math.round(newScale * 10) / 10; // Round to 1 decimal
        
        await sender.setParameters(params);
        console.log(`✅ [Quality Updated] Bitrate: ${(newBitrate / 1000000).toFixed(2)} Mbps, Scale: ${newScale.toFixed(1)}x`);
      }
    } catch (err) {
      console.error('❌ [Videolify] Error adjusting screen share quality:', err);
    }
  }
  
  /**
   * Stop quality monitoring
   */
  function stopScreenShareQualityMonitoring() {
    if (qualityMonitorIntervalRef.current) {
      clearInterval(qualityMonitorIntervalRef.current);
      qualityMonitorIntervalRef.current = null;
      console.log('🛑 [Videolify] Stopped screen share quality monitoring');
    }
  }
  
  /**
   * ============================================
   * FEEDBACK LOOP PREVENTION - HYBRID SOLUTION
   * ============================================
   */
  
  /**
   * ============================================
   * FEEDBACK LOOP PREVENTION - SIMPLE SOLUTION
   * ============================================
   * Ngăn feedback loop bằng cách ẩn/minimize local video
   * dựa trên loại màn hình đang share - KHÔNG cần monitor
   */
  
  async function preventFeedbackLoop() {
    const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
    if (!screenTrack || !localVideoRef.current) return;
    
    const settings = screenTrack.getSettings();
    const displaySurface = settings.displaySurface;
    
    console.log(`� [Screen Share] Type: ${displaySurface}`);
    
    // ẨN HOÀN TOÀN cho MỌI loại screen share (monitor/browser/window)
    // UI/UX: Bất kỳ thứ gì hiển thị đều bị capture → tạo infinite loop
    console.log('🛡️ [Prevention] Hiding local video completely (all types)');
    hideLocalVideoCompletely();
  }
  
  function hideLocalVideoCompletely() {
    if (!localVideoRef.current) return;
    
    // Ẩn hoàn toàn bằng display: none - KHÔNG hiện bất kỳ thứ gì
    // UI/UX: Avatar/gradient vẫn bị capture → tạo infinite loop
    localVideoRef.current.style.display = 'none';
    localVideoRef.current.style.pointerEvents = 'none';
    localVideoHiddenRef.current = true;
    
    console.log('✅ [Prevention] Local video hidden (display: none, no placeholder)');
  }
  
  /**
   * Restore local video to normal state
   */
  async function restoreLocalVideo() {
    if (!localVideoRef.current) {
      console.warn('⚠️ [Prevention] No local video ref to restore');
      return;
    }
    
    const video = localVideoRef.current;
    
    console.log('🔄 [Prevention] Restoring local video...');
    console.log('   - Current display:', video.style.display);
    console.log('   - Current srcObject:', !!video.srcObject);
    console.log('   - localStreamRef:', !!localStreamRef.current);
    
    // Hiện lại video
    video.style.display = '';
    video.style.pointerEvents = 'auto';
    localVideoHiddenRef.current = false;
    
    // Đảm bảo srcObject vẫn trỏ đúng local stream
    if (localStreamRef.current && video.srcObject !== localStreamRef.current) {
      video.srcObject = localStreamRef.current;
      console.log('✅ [Prevention] Local video srcObject restored');
    }
    
    console.log('✅ [Prevention] Local video restored (display: block)');
    
    // Debug: Check remote video status
    if (remoteVideoRef.current) {
      console.log('🔍 [Debug] Remote video status:');
      console.log('   - srcObject:', !!remoteVideoRef.current.srcObject);
      console.log('   - display:', window.getComputedStyle(remoteVideoRef.current).display);
      console.log('   - className:', remoteVideoRef.current.className);
    }
  }
  
  /**
   * ============================================
   * PiP-FIRST HYBRID PREVIEW FOR SCREEN SHARE
   * ============================================
   * Layer 1: PiP (Best - works cho MỌI loại share)
   * Layer 2: Multi-monitor overlay (Smart fallback)
   * Layer 3: Popup window (Conservative fallback)
   * Layer 4: No preview (Last resort - still functional)
   */
  
  async function startCanvasPreview() {
    if (!screenStreamRef.current) return;
    
    console.log('🎬 [Preview] Starting screen share preview...');
    
    // LAYER 1: Document PiP (Chrome 116+ - ALWAYS ON TOP, không bị capture)
    const docPipSuccess = await tryDocumentPiP();
    if (docPipSuccess) {
      console.log('✅ [Preview] Using Document PiP (always on top, not captured)');
      return;
    }
    
    // LAYER 2: Standard Video PiP (Chrome 70+ - ALWAYS ON TOP)
    // Works cho browser/window share, có thể bị capture nếu share monitor
    const pipSuccess = await tryPiPPreview();
    if (pipSuccess) {
      console.log('✅ [Preview] Using Video PiP (always on top)');
      return;
    }
    
    // LAYER 3: Canvas overlay (fallback - chỉ hiện trong tab hiện tại)
    const canvasSuccess = createCanvasPreview();
    if (canvasSuccess) {
      console.log('⚠️ [Preview] Using Canvas overlay (only visible in current tab)');
      return;
    }
    
    // LAYER 4: No preview
    console.log('ℹ️ [Preview] No preview available');
  }
  
  /**
   * Canvas Preview - Universal fallback (works on ALL browsers)
   * Uses CSS tricks to minimize loop visibility
   */
  function createCanvasPreview(): boolean {
    try {
      if (!screenStreamRef.current) return false;
      
      // Create canvas overlay
      const canvas = document.createElement('canvas');
      canvas.id = 'screenSharePreview';
      canvas.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 320px;
        height: 180px;
        border: 2px solid #667eea;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        z-index: 999999;
        background: #000;
        cursor: move;
        opacity: 0.95;
        filter: contrast(1.2) saturate(1.3);
      `;
      
      document.body.appendChild(canvas);
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      
      canvas.width = 1280;
      canvas.height = 720;
      
      // Create temp video for drawing
      const tempVideo = document.createElement('video');
      tempVideo.srcObject = screenStreamRef.current;
      tempVideo.muted = true;
      tempVideo.playsInline = true;
      tempVideo.play();
      
      // Draw loop
      function drawFrame() {
        if (!screenStreamRef.current || !ctx) return;
        
        try {
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
          previewAnimationRef.current = requestAnimationFrame(drawFrame);
        } catch (e) {
          console.error('[Preview] Draw error:', e);
        }
      }
      
      tempVideo.onloadedmetadata = () => drawFrame();
      
      // Make draggable
      makeDraggable(canvas);
      
      console.log('✅ [Preview] Canvas preview created');
      return true;
    } catch (error) {
      console.log('ℹ️ [Preview] Canvas failed:', error);
      return false;
    }
  }
  
  /**
   * LAYER 1: Document Picture-in-Picture (KHÔNG BỊ CAPTURE!)
   * Chrome 116+ - Window riêng biệt, không nằm trong DOM
   */
  async function tryDocumentPiP(): Promise<boolean> {
    try {
      // Check Document PiP support
      if (!('documentPictureInPicture' in window)) {
        console.log('ℹ️ [Preview] Document PiP not supported');
        return false;
      }
      
      const docPiP = (window as any).documentPictureInPicture;
      
      // Request Document PiP window
      const pipWindow = await docPiP.request({
        width: 640,
        height: 360,
      });
      
      previewWindowRef.current = pipWindow;
      
      // Create video in PiP window
      const video = pipWindow.document.createElement('video');
      video.srcObject = screenStreamRef.current;
      video.muted = true;
      video.autoplay = true;
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'contain';
      video.style.backgroundColor = '#000';
      
      pipWindow.document.body.style.margin = '0';
      pipWindow.document.body.style.backgroundColor = '#000';
      pipWindow.document.body.appendChild(video);
      
      previewVideoRef.current = video;
      
      console.log('✅ [Preview] Document PiP opened (KHÔNG BỊ CAPTURE)');
      
      // Handle window close
      pipWindow.addEventListener('pagehide', () => {
        console.log('ℹ️ [Preview] User closed Document PiP');
        showPiPRestoreButton();
      });
      
      return true;
    } catch (error) {
      console.log('ℹ️ [Preview] Document PiP failed:', error);
      return false;
    }
  }
  
  /**
   * LAYER 2: Standard Video PiP (ALWAYS ON TOP - works on all browsers supporting PiP)
   * Note: Có thể bị capture nếu share toàn màn hình, nhưng vẫn ALWAYS ON TOP
   */
  async function tryPiPPreview(): Promise<boolean> {
    try {
      if (!document.pictureInPictureEnabled) {
        console.log('ℹ️ [Preview] Video PiP not supported');
        return false;
      }
      
      const video = document.createElement('video');
      video.srcObject = screenStreamRef.current;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.style.display = 'none';
      document.body.appendChild(video);
      
      previewVideoRef.current = video;
      await video.play();
      await video.requestPictureInPicture();
      
      console.log('✅ [Preview] Video PiP opened (always on top)');
      
      video.addEventListener('leavepictureinpicture', () => {
        console.log('ℹ️ [Preview] User minimized PiP');
        showPiPRestoreButton();
      });
      
      return true;
    } catch (error) {
      console.log('ℹ️ [Preview] PiP failed:', error);
      // Cleanup
      if (previewVideoRef.current) {
        previewVideoRef.current.remove();
        previewVideoRef.current = null;
      }
      return false;
    }
  }
  
  /**
   * Show floating button to restore PiP preview
   */
  function showPiPRestoreButton() {
    // Remove existing button if any
    const existingBtn = document.getElementById('pip-restore-btn');
    if (existingBtn) existingBtn.remove();
    
    const btn = document.createElement('button');
    btn.id = 'pip-restore-btn';
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="2" width="20" height="20" rx="2"/>
        <rect x="8" y="8" width="8" height="8" rx="1"/>
      </svg>
      <span style="margin-left: 8px;">Mở lại Preview</span>
    `;
    btn.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 20px;
      padding: 12px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 50px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      cursor: pointer;
      z-index: 999998;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      transition: all 0.3s ease;
      animation: slideInRight 0.4s ease;
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(300px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      #pip-restore-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
      }
    `;
    document.head.appendChild(style);
    
    // Click handler - Restore PiP
    btn.onclick = async () => {
      btn.remove();
      style.remove();
      await restorePiP();
    };
    
    document.body.appendChild(btn);
  }
  
  /**
   * Restore PiP window (supports both Document PiP and Video PiP)
   */
  async function restorePiP() {
    try {
      // Try Document PiP first
      const docPipSuccess = await tryDocumentPiP();
      if (docPipSuccess) {
        const btn = document.getElementById('pip-restore-btn');
        if (btn) btn.remove();
        return;
      }
      
      // Fallback to video PiP
      if (!previewVideoRef.current) {
        console.log('❌ [Preview] No video element to restore');
        return;
      }
      
      await previewVideoRef.current.requestPictureInPicture();
      console.log('✅ [Preview] Video PiP restored');
      
      const btn = document.getElementById('pip-restore-btn');
      if (btn) btn.remove();
    } catch (error) {
      console.error('❌ [Preview] Failed to restore PiP:', error);
    }
  }
  
  /**
   * LAYER 2: Multi-monitor Overlay (Smart fallback)
   */
  async function tryMultiMonitorOverlay(): Promise<boolean> {
    try {
      // Check if multi-monitor setup (experimental API)
      const screen = window.screen as any;
      if (!screen.isExtended) {
        console.log('ℹ️ [Preview] Single monitor detected');
        return false;
      }
      
      // Get screen info
      const screens = await (window as any).getScreenDetails?.();
      if (!screens || screens.screens.length < 2) {
        return false;
      }
      
      console.log(`ℹ️ [Preview] Multi-monitor detected: ${screens.screens.length} screens`);
      
      // Detect which screen is sharing
      const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
      const settings = screenTrack?.getSettings();
      const displaySurface = settings?.displaySurface;
      
      if (displaySurface === 'monitor') {
        // Create overlay on different monitor
        createMultiMonitorOverlay(screens);
        return true;
      }
      
      return false;
    } catch (error) {
      console.log('ℹ️ [Preview] Multi-monitor detection failed:', error);
      return false;
    }
  }
  
  function createMultiMonitorOverlay(screens: any) {
    // Create canvas overlay
    const canvas = document.createElement('canvas');
    canvas.id = 'screenSharePreview';
    canvas.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 400px;
      height: 225px;
      border: 3px solid #667eea;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      z-index: 999999;
      background: #000;
      cursor: move;
    `;
    
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 1280;
    canvas.height = 720;
    
    // Create temp video
    const tempVideo = document.createElement('video');
    tempVideo.srcObject = screenStreamRef.current;
    tempVideo.muted = true;
    tempVideo.play();
    
    // Draw loop
    function drawFrame() {
      if (!screenStreamRef.current || !ctx) return;
      
      try {
        ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
        previewAnimationRef.current = requestAnimationFrame(drawFrame);
      } catch (e) {
        console.error('[Preview] Draw error:', e);
      }
    }
    
    tempVideo.onloadedmetadata = () => drawFrame();
    
    // Make draggable
    makeDraggable(canvas);
  }
  
  function makeDraggable(element: HTMLElement) {
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;
    
    element.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - element.getBoundingClientRect().left;
      offsetY = e.clientY - element.getBoundingClientRect().top;
      element.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      element.style.right = 'auto';
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        element.style.cursor = 'move';
      }
    });
  }
  
  /**
   * LAYER 3: Popup Window (Conservative fallback)
   */
  function tryPopupPreview(): boolean {
    try {
      const popup = window.open(
        '',
        'ScreenSharePreview',
        'width=480,height=320,left=100,top=100,resizable=yes'
      );
      
      if (!popup) {
        console.log('ℹ️ [Preview] Popup blocked');
        return false;
      }
      
      previewWindowRef.current = popup;
      
      // Simple HTML for popup
      popup.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>📺 Preview</title>
          <style>
            body { margin: 0; background: #000; display: flex; align-items: center; justify-content: center; }
            video { width: 100%; height: 100%; object-fit: contain; }
          </style>
        </head>
        <body>
          <video id="preview" autoplay muted playsinline></video>
        </body>
        </html>
      `);
      popup.document.close();
      
      // Set video source
      const video = popup.document.getElementById('preview') as HTMLVideoElement;
      if (video && screenStreamRef.current) {
        video.srcObject = screenStreamRef.current;
      }
      
      showToast('💡 Di chuyển cửa sổ preview ra ngoài vùng share', 'info');
      
      // Handle popup close
      const checkClosed = setInterval(() => {
        if (previewWindowRef.current?.closed) {
          clearInterval(checkClosed);
          previewWindowRef.current = null;
        }
      }, 1000);
      
      return true;
    } catch (error) {
      console.log('ℹ️ [Preview] Popup failed:', error);
      return false;
    }
  }
  
  /**
   * Stop preview (all modes)
   */
  function stopCanvasPreview() {
    // Close Document PiP window
    if (previewWindowRef.current && !previewWindowRef.current.closed) {
      previewWindowRef.current.close();
      previewWindowRef.current = null;
      console.log('✅ [Preview] Document PiP closed');
    }
    
    // Stop standard video PiP
    if (previewVideoRef.current) {
      if (document.pictureInPictureElement === previewVideoRef.current) {
        document.exitPictureInPicture().catch(() => {});
      }
      previewVideoRef.current.remove();
      previewVideoRef.current = null;
    }
    
    // Remove restore button
    const restoreBtn = document.getElementById('pip-restore-btn');
    if (restoreBtn) restoreBtn.remove();
    
    // Stop animation
    if (previewAnimationRef.current) {
      cancelAnimationFrame(previewAnimationRef.current);
      previewAnimationRef.current = null;
    }
    
    // Remove overlay canvas
    const canvas = document.getElementById('screenSharePreview');
    if (canvas) canvas.remove();
    
    console.log('✅ [Preview] Preview stopped');
  }
  
  /**
   * Show toast notification
   */
  function showToast(message: string, type: 'success' | 'info' | 'warning' = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      background: ${type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 999999;
      font-size: 14px;
      font-weight: 500;
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        toast.remove();
        style.remove();
      }, 300);
    }, 3000);
  }
  
  async function toggleScreenShare() {
    try {
      if (isScreenSharing) {
        console.log('[Videolify] Stopping screen share, reverting to camera');
        
        // 🔍 DEBUG: Check remote video BEFORE stopping
        console.log('🔍 [Debug] Remote video BEFORE stop:');
        console.log('   - srcObject:', !!remoteVideoRef.current?.srcObject);
        console.log('   - className:', remoteVideoRef.current?.className);
        console.log('   - remoteVideoEnabled:', remoteVideoEnabled);
        console.log('   - showWhiteboard:', showWhiteboard);
        console.log('   - connected:', connectionStats.connected);
        
        // Stop canvas preview
        stopCanvasPreview();
        
        // Stop quality monitoring
        stopScreenShareQualityMonitoring();
        
        // Restore local video to normal state
        await restoreLocalVideo();
        
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
        // Start screen share with optimized constraints
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
            frameRate: { ideal: 15, max: 30 }
          },
        });
        
        screenStreamRef.current = screenStream;
        
        // Replace camera with screen track
        if (peerConnectionRef.current) {
          const screenTrack = screenStream.getVideoTracks()[0];
          const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(screenTrack);
            
            // Get actual screen resolution
            const settings = screenTrack.getSettings();
            const { width, height } = settings;
            console.log(`📺 [Videolify] Screen resolution: ${width}x${height}`);
            
            // Apply adaptive encoding based on resolution
            const params = sender.getParameters();
            if (!params.encodings) {
              params.encodings = [{}];
            }
            
            // Auto downscale for high-res screens (>1080p)
            const needsDownscale = (width && width > 1920) || (height && height > 1080);
            if (needsDownscale) {
              const downscaleFactor = Math.max(
                (width || 1920) / 1920,
                (height || 1080) / 1080
              );
              params.encodings[0].scaleResolutionDownBy = downscaleFactor;
              params.encodings[0].maxBitrate = 3000000; // 3 Mbps for 4K
              console.log(`🔽 [Videolify] Downscaling ${downscaleFactor.toFixed(1)}x to improve performance`);
            } else {
              params.encodings[0].scaleResolutionDownBy = 1.0;
              params.encodings[0].maxBitrate = 5000000; // 5 Mbps for 1080p
              console.log('✅ [Videolify] No downscaling needed');
            }
            
            await sender.setParameters(params);
            console.log('✅ [Videolify] Screen share active with adaptive quality');
            
            // 🔍 DEBUG: Check remote video AFTER starting screen share
            console.log('🔍 [Debug] Remote video AFTER screen share start:');
            console.log('   - srcObject:', !!remoteVideoRef.current?.srcObject);
            console.log('   - className:', remoteVideoRef.current?.className);
            console.log('   - remoteVideoEnabled:', remoteVideoEnabled);
            console.log('   - showWhiteboard:', showWhiteboard);
            console.log('   - connected:', connectionStats.connected);
            
            // ========================================
            // FEEDBACK LOOP PREVENTION + PREVIEW
            // ========================================
            
            // 1. Ẩn local video (tránh loop)
            await preventFeedbackLoop();
            
            // 2. Hiện Canvas preview (sender xem màn hình share)
            startCanvasPreview();
            
            // 3. Start quality monitoring
            startScreenShareQualityMonitoring(sender);
          }
        }
        
        // Handle screen share stop
        screenStream.getVideoTracks()[0].onended = () => {
          stopCanvasPreview();
          stopScreenShareQualityMonitoring();
          restoreLocalVideo();
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
   * 11. Virtual Background - Helper: Load Preset Background (UX ENHANCED)
   */
  async function loadPresetBackground(name: string, imageUrl: string) {
    try {
      setPresetLoading(name);
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load ${name} background`));
        img.src = imageUrl;
      });
      
      setActivePreset(name);
      setBackgroundMode('image');
      
      if (!virtualBgProcessorRef.current) {
        virtualBgProcessorRef.current = new VirtualBackgroundProcessor();
        await virtualBgProcessorRef.current.initialize();
      }
      
      if (!originalStreamRef.current) {
        originalStreamRef.current = localStreamRef.current;
      }
      
      if (virtualBgEnabled) {
        // Already enabled, restart with new image
        console.log('🔄 [VBG] Stopping existing processing...');
        virtualBgProcessorRef.current.stopProcessing();
      }
      
      // Check if we have a valid stream
      const sourceStream = originalStreamRef.current || localStreamRef.current;
      if (!sourceStream) {
        console.error('❌ [VBG] No source stream available');
        setPresetLoading(null);
        return;
      }
      
      console.log('🎥 [VBG] Starting processing with image...', {
        sourceStreamTracks: sourceStream.getVideoTracks().length,
        hasImage: !!img
      });
      
      // Start processing with image
      const processedStream = await virtualBgProcessorRef.current.startProcessing(
        sourceStream,
        {
          mode: 'image',
          backgroundImage: img,
          modelSelection: 1,
          smoothing: 0.7 // High smoothing for smooth edges
        }
      );
      
      console.log('✅ [VBG] Processing started, got processed stream:', {
        processedTracks: processedStream?.getVideoTracks().length
      });
      
      // Update local video - wait for stream to be ready
      if (localVideoRef.current && processedStream) {
        console.log('📺 [VBG] Updating local video element...');
        const video = localVideoRef.current;
        
        // Set srcObject
        video.srcObject = processedStream;
        
        // Force video to play
        try {
          // If metadata already loaded, play immediately
          if (video.readyState >= 2) { // HAVE_CURRENT_DATA or higher
            console.log('✅ [VBG] Video already has metadata, playing now');
            await video.play();
            console.log('✅ [VBG] Video playing');
          } else {
            // Wait for metadata
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Video playback timeout')), 5000);
              
              const onMetadata = () => {
                console.log('✅ [VBG] Video metadata loaded');
                video.play()
                  .then(() => {
                    console.log('✅ [VBG] Video playing');
                    clearTimeout(timeout);
                    video.removeEventListener('loadedmetadata', onMetadata);
                    resolve();
                  })
                  .catch(reject);
              };
              
              video.addEventListener('loadedmetadata', onMetadata);
            });
          }
        } catch (err) {
          console.error('⚠️ [VBG] Video playback failed:', err);
          // Try playing anyway
          try {
            await video.play();
          } catch (playErr) {
            console.error('⚠️ [VBG] Final play attempt failed:', playErr);
          }
        }
      }
      
      // ✅ CRITICAL FIX: Do NOT update localStreamRef or replace track in peer connection
      // Peer connection should ALWAYS send original video (same as blur mode)
      // Only update local video preview
      // localStreamRef.current = processedStream; // ❌ REMOVED
      console.log('✅ [VBG] Preset background applied to LOCAL preview only (peer receives original)');
      
      setVirtualBgEnabled(true);
      
      // 💾 REMEMBER SELECTION - Save to localStorage
      try {
        localStorage.setItem('vbg-last-background', name);
        localStorage.setItem('vbg-last-mode', 'image');
        localStorage.setItem('vbg-enabled', 'true');
        localStorage.setItem('vbg-background-image', imageUrl); // Save image URL for F5 restore
        console.log('💾 [VBG] Saved background to localStorage:', name);
      } catch (err) {
        console.error('❌ [VBG] Failed to save to localStorage:', err);
      }
      
      // 📡 CRITICAL FIX: Notify peer about preset background via SSE
      // Send even if remotePeerIdRef doesn't exist yet - server will handle broadcast
      console.log('📡 [VBG] Broadcasting preset background settings via SSE');
      try {
        await fetch('/api/videolify/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'vbg-settings',
            roomId,
            peerId: peerIdRef.current,
            data: {
              enabled: true,
              mode: 'image',
              backgroundImage: imageUrl, // Send image URL to peer
              toPeerId: remotePeerIdRef.current || undefined, // undefined = broadcast to all
            },
          }),
        });
        console.log('✅ [VBG] Preset background settings broadcasted');
      } catch (err) {
        console.error('❌ [VBG] Failed to broadcast preset background settings:', err);
      }
      
    } catch (err) {
      console.error(`❌ [VBG] Failed to load ${name} background:`, err);
      alert(`Lỗi khi áp dụng background: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setPresetLoading(null);
    }
  }

  /**
   * 11. Virtual Background - Blur/Replace Background (UX ENHANCED)
   */
  async function toggleVirtualBackground(mode: BackgroundMode) {
    try {
      console.log(`🎭 [VirtualBG] Toggling to mode: ${mode}`);
      
      // UX: Set loading state
      setVbgLoading(true);

      if (mode === 'none') {
        // Disable virtual background - restore original stream
        await disableVirtualBackground();
        setBackgroundMode('none');
        setVirtualBgEnabled(false);
        setActivePreset(null);
        
        try {
          localStorage.setItem('vbg-enabled', 'false');
          localStorage.setItem('vbg-last-mode', 'none');
        } catch (err) {
          // Silent fail
        }
        
        setVbgLoading(false);
        return;
      }

      // Enable virtual background
      if (!localStreamRef.current) {
        setVbgLoading(false);
        return;
      }

      // Initialize processor if needed
      if (!virtualBgProcessorRef.current) {
        virtualBgProcessorRef.current = new VirtualBackgroundProcessor();
        await virtualBgProcessorRef.current.initialize(); // CRITICAL: Wait for init
      }

      // Store original stream if first time enabling
      if (!originalStreamRef.current) {
        originalStreamRef.current = localStreamRef.current;
      }

      // Stop previous processing if any
      if (virtualBgEnabled && virtualBgProcessorRef.current) {
        virtualBgProcessorRef.current.stopProcessing();
      }

      // Start processing with new mode
      const processedStream = await virtualBgProcessorRef.current.startProcessing(
        originalStreamRef.current,
        {
          mode,
          blurAmount,
          modelSelection: 1,
          smoothing: 0.7,
          backgroundImage: undefined
        }
      );
      
      // CRITICAL: Peer connection keeps sending original video
      // - No replaceTrack needed
      // - No renegotiation needed
      // - Peer receives high-quality original video
      // - Peer will apply their own VBG if they want

      // Update local video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = processedStream;
      }

      // ✅ FIX: Do NOT update localStreamRef - keep it as original stream
      // localStreamRef must always point to original stream for peer connection
      // Only local preview (localVideoRef.srcObject) shows processed video
      // localStreamRef.current = processedStream; // ❌ REMOVED - This caused peer video to freeze!

      setBackgroundMode(mode);
      setVirtualBgEnabled(true);
      
      // Notify peer about VBG settings via SSE
      if (remotePeerIdRef.current) {
        console.log('📡 [VBG-DEBUG] Sending VBG settings to peer:', {
          remotePeerId: remotePeerIdRef.current,
          mode,
          blurAmount,
          roomId
        });
        try {
          const response = await fetch('/api/videolify/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'vbg-settings',
              roomId,
              peerId: peerIdRef.current,
              data: {
                enabled: true,
                mode,
                blurAmount,
                toPeerId: remotePeerIdRef.current,
              },
            }),
          });
          console.log('✅ [VBG-DEBUG] SSE sent, response:', response.status);
        } catch (err) {
          console.error('❌ [VBG-DEBUG] Failed to send SSE:', err);
        }
      } else {
        console.warn('⚠️ [VBG-DEBUG] No remotePeerIdRef - cannot send VBG settings');
      }
      
      // Save VBG config to localStorage
      try {
        localStorage.setItem('vbg-mode', mode);
        localStorage.setItem('vbg-enabled', 'true');
        localStorage.setItem('vbg-blur-amount', blurAmount.toString());
        
        if (mode === 'image' && typeof activePreset === 'string') {
          localStorage.setItem('vbg-background-preset', activePreset);
        } else {
          localStorage.removeItem('vbg-background-preset');
        }
      } catch (err) {
        // Silent fail
      }

      // Clear active preset if switching to blur
      if (mode === 'blur') {
        setActivePreset(null);
        
        try {
          localStorage.setItem('vbg-last-mode', 'blur');
          localStorage.setItem('vbg-enabled', 'true');
          localStorage.setItem('vbg-blur-amount', blurAmount.toString());
        } catch (err) {
          // Silent fail
        }
      }
      
      setVbgLoading(false);
    } catch (err) {
      setVbgLoading(false);
    }
  }

  async function disableVirtualBackground() {
    if (!virtualBgProcessorRef.current || !originalStreamRef.current) return;

    virtualBgProcessorRef.current.stopProcessing();

    // Notify peer about VBG disabled via SSE
    if (remotePeerIdRef.current) {
      try {
        await fetch('/api/videolify/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'vbg-settings',
            roomId,
            peerId: peerIdRef.current,
            data: {
              enabled: false,
              toPeerId: remotePeerIdRef.current,
            },
          }),
        });
      } catch (err) {
        // Silent fail
      }
    }

    // Restore local video preview to original
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = originalStreamRef.current;
    }

    // Ensure localStreamRef is correct
    if (localStreamRef.current !== originalStreamRef.current) {
      localStreamRef.current = originalStreamRef.current;
    }

    // Update localStorage
    try {
      localStorage.setItem('vbg-mode', 'none');
      localStorage.setItem('vbg-enabled', 'false');
    } catch (err) {
      // Silent fail
    }
  }

  /**
   * Apply remote VBG settings received from peer via SSE
   */
  async function applyRemoteVbgSettings(data: any, peerId: string) {
    if (!remoteOriginalStreamRef.current) {
      console.warn('⚠️ [VBG-DEBUG] No remote stream available - cannot apply VBG');
      return;
    }

    if (data.enabled) {
      console.log('✅ [VBG-DEBUG] Applying VBG to remote video...', { mode: data.mode, peerId });

      // Save peer's VBG config to localStorage
      try {
        localStorage.setItem(`peer-${peerId}-vbg-mode`, data.mode || 'blur');
        localStorage.setItem(`peer-${peerId}-vbg-blur`, (data.blurAmount || 10).toString());
        if (data.backgroundImage) {
          localStorage.setItem(`peer-${peerId}-vbg-background`, data.backgroundImage);
        }
      } catch (err) {
        // Silent fail
      }

      // Initialize remote VBG processor
      if (!remoteVbgProcessorRef.current) {
        console.log('🔧 [VBG-DEBUG] Creating remote VBG processor...');
        remoteVbgProcessorRef.current = new VirtualBackgroundProcessor();
        await remoteVbgProcessorRef.current.initialize();
        console.log('✅ [VBG-DEBUG] Remote VBG processor initialized');
      }

      // Stop previous processing
      if (remoteVbgProcessorRef.current) {
        remoteVbgProcessorRef.current.stopProcessing();
      }

      // Load background image if provided
      let backgroundImageElement: HTMLImageElement | undefined;
      if (data.backgroundImage && data.mode === 'image') {
        console.log('🖼️ [VBG-DEBUG] Loading background image...', data.backgroundImage.substring(0, 50));
        const img = new Image();
        img.crossOrigin = 'anonymous';
        try {
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load background image'));
            img.src = data.backgroundImage;
          });
          backgroundImageElement = img;
          console.log('✅ [VBG-DEBUG] Background image loaded');
        } catch (err) {
          console.error('❌ [VBG-DEBUG] Failed to load background image:', err);
        }
      }

      // Apply VBG to remote video
      console.log('🎬 [VBG-DEBUG] Starting VBG processing on remote stream...');
      const processedRemoteStream = await remoteVbgProcessorRef.current.startProcessing(
        remoteOriginalStreamRef.current,
        {
          mode: data.mode || 'blur',
          blurAmount: data.blurAmount || 10,
          modelSelection: 1,
          smoothing: 0.7,
          backgroundImage: backgroundImageElement
        }
      );
      console.log('✅ [VBG-DEBUG] VBG processing started');

      // Update remote video with processed stream
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = processedRemoteStream;
        console.log('✅ [VBG-DEBUG] Remote video srcObject updated to processed stream');
      } else {
        console.error('❌ [VBG-DEBUG] remoteVideoRef.current is null!');
      }
    } else {
      // Disable VBG - remove peer's VBG config from localStorage
      try {
        localStorage.removeItem(`peer-${peerId}-vbg-mode`);
        localStorage.removeItem(`peer-${peerId}-vbg-blur`);
        localStorage.removeItem(`peer-${peerId}-vbg-background`);
      } catch (err) {
        // Silent fail
      }

      // Stop remote VBG processor
      if (remoteVbgProcessorRef.current) {
        remoteVbgProcessorRef.current.stopProcessing();
        remoteVbgProcessorRef.current = null;
      }

      // Restore remote video srcObject to original stream
      if (remoteVideoRef.current && remoteOriginalStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteOriginalStreamRef.current;
      }
    }
  }

  /**
   * Apply VBG to remote peer video
   * Each peer processes their own received video independently
   */
  async function applyVbgToRemoteVideo() {
    if (!remoteOriginalStreamRef.current) {
      console.warn('⚠️ [VBG] No remote stream to process');
      return;
    }

    try {
      console.log('🎭 [VBG] Applying VBG to remote video...');

      // Initialize remote VBG processor if needed
      if (!remoteVbgProcessorRef.current) {
        remoteVbgProcessorRef.current = new VirtualBackgroundProcessor();
        await remoteVbgProcessorRef.current.initialize();
        console.log('✅ [VBG] Remote VBG processor initialized');
      }

      // Stop previous processing if any
      if (remoteVbgProcessorRef.current) {
        remoteVbgProcessorRef.current.stopProcessing();
      }

      // Apply same VBG settings as local
      const processedRemoteStream = await remoteVbgProcessorRef.current.startProcessing(
        remoteOriginalStreamRef.current,
        {
          mode: backgroundMode,
          blurAmount,
          modelSelection: 1, // Same quality as local
          smoothing: 0.7,
          backgroundImage: undefined
        }
      );

      // Update remote video element with processed stream
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = processedRemoteStream;
        console.log('✅ [VBG] Remote video VBG applied');
      }
    } catch (error) {
      console.error('❌ [VBG] Failed to apply VBG to remote:', error);
    }
  }

  /**
   * Apply VBG to remote peer video with specific config
   * Used when restoring from localStorage
   */
  async function applyVbgToRemoteVideoWithConfig(config: { mode: string; blurAmount: number; backgroundImage?: string }) {
    if (!remoteOriginalStreamRef.current) {
      console.warn('⚠️ [VBG] No remote stream to process');
      return;
    }

    try {
      console.log('🎭 [VBG] Applying VBG to remote video with config:', { ...config, backgroundImage: config.backgroundImage ? 'data:...' : undefined });

      // Initialize remote VBG processor if needed
      if (!remoteVbgProcessorRef.current) {
        remoteVbgProcessorRef.current = new VirtualBackgroundProcessor();
        await remoteVbgProcessorRef.current.initialize();
        console.log('✅ [VBG] Remote VBG processor initialized');
      }

      // Stop previous processing if any
      if (remoteVbgProcessorRef.current) {
        remoteVbgProcessorRef.current.stopProcessing();
      }

      // Load background image if provided
      let backgroundImageElement: HTMLImageElement | undefined;
      if (config.backgroundImage && config.mode === 'image') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load background image'));
          img.src = config.backgroundImage!;
        });
        backgroundImageElement = img;
        console.log('✅ [VBG] Background image loaded for remote processing');
      }

      // Apply VBG with provided config
      const processedRemoteStream = await remoteVbgProcessorRef.current.startProcessing(
        remoteOriginalStreamRef.current,
        {
          mode: config.mode as BackgroundMode,
          blurAmount: config.blurAmount,
          modelSelection: 1,
          smoothing: 0.7,
          backgroundImage: backgroundImageElement
        }
      );

      // Update remote video element with processed stream
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = processedRemoteStream;
        console.log('✅ [VBG] Remote video VBG applied with config');
      }
    } catch (error) {
      console.error('❌ [VBG] Failed to apply VBG to remote with config:', error);
    }
  }

  async function updateBlurAmount(amount: number) {
    setBlurAmount(amount);
    
    if (virtualBgProcessorRef.current && backgroundMode === 'blur') {
      virtualBgProcessorRef.current.updateSettings({ blurAmount: amount });
      console.log(`🎭 [VirtualBG] Blur amount updated: ${amount}`);
    }
  }

  /**
   * 12. Media controls
   */
  const toggleVideo = async () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        // Track exists - just toggle enable/disable
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log(`🎥 [Videolify] Video ${videoTrack.enabled ? 'ON' : 'OFF'}`);

        // CRITICAL: Notify remote peer about video toggle
        if (controlChannelRef.current && controlChannelRef.current.readyState === 'open') {
          try {
            controlChannelRef.current.send(JSON.stringify({
              type: 'video-toggle',
              enabled: videoTrack.enabled,
            }));
            console.log(`📤 [Videolify] Sent video-toggle: ${videoTrack.enabled}`);
          } catch (e) {
            console.warn('[Videolify] Failed to send video-toggle:', e);
          }
        }

        // Toast notification
        toast({
          title: videoTrack.enabled ? '📹 Camera đã bật' : '📹 Camera đã tắt',
          description: videoTrack.enabled ? 'Người khác có thể nhìn thấy bạn' : 'Người khác không nhìn thấy bạn',
          duration: 2000,
        });
      } else {
        // No video track - request camera access
        console.log('[Videolify] No video track, requesting camera access...');
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          });
          
          const newVideoTrack = videoStream.getVideoTracks()[0];
          if (newVideoTrack) {
            // Add track to local stream
            localStreamRef.current.addTrack(newVideoTrack);
            
            // Update local video element
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
            }
            
            // Add track to peer connection if exists
            if (peerConnectionRef.current) {
              const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
              if (sender) {
                await sender.replaceTrack(newVideoTrack);
                console.log('[Videolify] Replaced video track in peer connection');
              } else {
                peerConnectionRef.current.addTrack(newVideoTrack, localStreamRef.current);
                console.log('[Videolify] Added video track to peer connection');
              }
            }
            
            setIsVideoEnabled(true);
            console.log('🎥 [Videolify] Camera enabled');
            
            toast({
              title: '📹 Camera đã bật',
              description: 'Người khác có thể nhìn thấy bạn',
              duration: 2000,
            });
          }
        } catch (err) {
          console.error('[Videolify] Failed to access camera:', err);
          toast({
            title: '⚠️ Không thể truy cập camera',
            description: 'Vui lòng cho phép quyền truy cập camera trong trình duyệt',
            variant: 'destructive',
            duration: 4000,
          });
        }
      }
    } else {
      console.warn('[Videolify] No local stream available');
    }
  };

  const toggleAudio = async () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        // Track exists - just toggle enable/disable
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log(`🎤 [Videolify] Audio ${audioTrack.enabled ? 'ON' : 'OFF'}`);

        // CRITICAL: Notify remote peer about audio toggle
        if (controlChannelRef.current && controlChannelRef.current.readyState === 'open') {
          try {
            controlChannelRef.current.send(JSON.stringify({
              type: 'audio-toggle',
              enabled: audioTrack.enabled,
            }));
            console.log(`📤 [Videolify] Sent audio-toggle: ${audioTrack.enabled}`);
          } catch (e) {
            console.warn('[Videolify] Failed to send audio-toggle:', e);
          }
        }

        // Toast notification
        toast({
          title: audioTrack.enabled ? '🎤 Mic đã bật' : '🎤 Mic đã tắt',
          description: audioTrack.enabled ? 'Người khác có thể nghe thấy bạn' : 'Người khác không nghe thấy bạn',
          duration: 2000,
        });
      } else {
        // No audio track - request microphone access
        console.log('[Videolify] No audio track, requesting microphone access...');
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
          });
          
          const newAudioTrack = audioStream.getAudioTracks()[0];
          if (newAudioTrack) {
            // Add track to local stream
            localStreamRef.current.addTrack(newAudioTrack);
            
            // Update local video element (audio will be from stream)
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
            }
            
            // Add track to peer connection if exists
            if (peerConnectionRef.current) {
              const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'audio');
              if (sender) {
                await sender.replaceTrack(newAudioTrack);
                console.log('[Videolify] Replaced audio track in peer connection');
              } else {
                peerConnectionRef.current.addTrack(newAudioTrack, localStreamRef.current);
                console.log('[Videolify] Added audio track to peer connection');
              }
            }
            
            setIsAudioEnabled(true);
            console.log('🎤 [Videolify] Microphone enabled');
            
            toast({
              title: '🎤 Mic đã bật',
              description: 'Người khác có thể nghe thấy bạn',
              duration: 2000,
            });
          }
        } catch (err) {
          console.error('[Videolify] Failed to access microphone:', err);
          toast({
            title: '⚠️ Không thể truy cập microphone',
            description: 'Vui lòng cho phép quyền truy cập microphone trong trình duyệt',
            variant: 'destructive',
            duration: 4000,
          });
        }
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
      {/* Connection Status Indicator - Compact pill */}
      <div 
        className="absolute top-3 left-3 z-50 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-gray-700/50 shadow-md"
        data-testid="connection-indicator"
        data-connected={connectionStats.connected ? 'true' : 'false'}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${
          connectionStats.connected
            ? 'bg-green-400 animate-pulse'
            : connectionStats.iceState === 'checking' || connectionStats.iceState === 'connecting'
            ? 'bg-yellow-400 animate-pulse'
            : 'bg-red-400'
        }`} />
        <span className="text-[10px] text-gray-200 font-medium">
          {connectionStats.connected
            ? 'Kết nối'
            : connectionStats.iceState === 'checking' || connectionStats.iceState === 'connecting'
            ? 'Đang kết nối'
            : 'Mất kết nối'}
        </span>
      </div>

      {/* Brand Logo - Bottom Right Corner (Small & Subtle) - Above Control Bar */}
      <div className="absolute bottom-28 right-6 z-40 opacity-25 hover:opacity-70 transition-opacity pointer-events-none">
        <Logo size="sm" className="scale-[0.55] [&_span]:text-white [&_.text-primary]:!text-blue-300" />
      </div>

      {/* Main Area */}
      <div className="flex-1 flex">
        {/* Video/Whiteboard Area - Add padding bottom for control bar */}
        <div className="flex-1 relative bg-gray-800 pb-24">
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
                  // Waiting for first connection (or reconnecting)
                  <>
                    {isConnecting ? (
                      // Connecting/Reconnecting state
                      <>
                        <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                        <h2 className="text-white text-2xl font-semibold">Đang kết nối...</h2>
                        <p className="text-gray-400 text-lg">Vui lòng đợi trong giây lát</p>
                        <Badge className="bg-blue-500/90 text-white px-4 py-2 text-base">
                          🔄 Đang thiết lập kết nối...
                        </Badge>
                      </>
                    ) : (
                      // Initial waiting (only when not connecting)
                      <>
                        <div className="text-6xl mb-4">👋</div>
                        <h2 className="text-white text-2xl font-semibold">Đang chờ người tham gia</h2>
                        <p className="text-gray-400 text-lg">Chia sẻ link này để bắt đầu buổi học</p>
                        <Badge className="bg-yellow-500/90 text-black px-4 py-2 text-base">
                          ⏳ Phòng đã sẵn sàng - đang chờ người khác tham gia...
                        </Badge>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Remote Video - Always rendered but hidden if not connected */}
          <div className="relative w-full h-full">
            <video
              ref={remoteVideoRef}
              data-testid="remote-video"
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                !showWhiteboard && connectionStats.connected && remoteVideoEnabled ? 'block' : 'hidden'
              } ${remoteVbgLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoadedMetadata={() => {
                console.log('✅ [Remote Video] Metadata loaded - video is playing');
              }}
              onPlay={() => {
                console.log('✅ [Remote Video] Playing');
              }}
              onError={(e) => {
                console.error('❌ [Remote Video] Error:', e);
              }}
            />
            
            {/* Loading overlay when remote VBG is processing */}
            {remoteVbgLoading && connectionStats.connected && remoteVideoEnabled && !showWhiteboard && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
            )}
            
            {/* Connection Lost Overlay - Shows when ICE disconnected */}
            {!connectionStats.connected && wasConnected && !showWhiteboard && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 backdrop-blur-sm z-10">
                <div className="flex flex-col items-center gap-4 text-center px-4">
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-semibold text-blue-400">Đang kết nối lại...</h3>
                    <p className="text-gray-300 text-sm">Vui lòng đợi trong giây lát...</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Remote Camera Off Overlay */}
          {!showWhiteboard && connectionStats.connected && !remoteVideoEnabled && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 via-gray-900 to-black">
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center mb-6 shadow-2xl border-4 border-gray-600">
                <User className="w-20 h-20 text-gray-400" />
              </div>
              <div className="flex items-center gap-3 mb-2">
                <VideoOff className="w-6 h-6 text-red-400" />
                <h3 className="text-2xl font-semibold text-white">
                  Camera đã tắt
                </h3>
              </div>
              <p className="text-gray-400 text-lg">
                {remotePeerName || 'Người kia'} đã tắt camera
              </p>
            </div>
          )}

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
                className={`absolute top-3 right-3 z-30 group ${
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
                  className={`w-full h-full object-cover rounded-lg border-2 border-white shadow-lg cursor-move drag-handle ${
                    isVideoEnabled ? 'block' : 'hidden'
                  }`}
                />

                {/* Local Camera Off Overlay */}
                {!isVideoEnabled && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg border-2 border-white shadow-lg cursor-move drag-handle">
                    <div className={`rounded-full bg-gray-800 flex items-center justify-center shadow-xl mb-2 ${
                      pipSize === 'small' ? 'w-12 h-12' :
                      pipSize === 'medium' ? 'w-16 h-16' :
                      'w-24 h-24'
                    }`}>
                      <User className={`text-gray-400 ${
                        pipSize === 'small' ? 'w-6 h-6' :
                        pipSize === 'medium' ? 'w-8 h-8' :
                        'w-12 h-12'
                      }`} />
                    </div>
                    <div className="flex items-center gap-1">
                      <VideoOff className={`text-red-400 ${
                        pipSize === 'small' ? 'w-3 h-3' :
                        pipSize === 'medium' ? 'w-4 h-4' :
                        'w-5 h-5'
                      }`} />
                      <p className={`text-white font-semibold ${
                        pipSize === 'small' ? 'text-xs' :
                        pipSize === 'medium' ? 'text-sm' :
                        'text-base'
                      }`}>
                        Camera tắt
                      </p>
                    </div>
                  </div>
                )}

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

          {/* Hand Raise Badge - More Prominent */}
          {remoteHandRaised && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
              <Badge className="bg-yellow-500 text-black text-lg px-6 py-3 shadow-2xl border-4 border-yellow-300 flex items-center gap-3">
                <Hand className="w-6 h-6 animate-pulse" />
                <span className="font-bold">{remotePeerName || 'Học sinh'} đang giơ tay</span>
              </Badge>
            </div>
          )}

          {/* Connection Status - Using top-left indicator to avoid blocking controls */}

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

      {/* File Transfer Notification */}
      {(incomingFile || outgoingFile) && (
        <div className={`absolute z-50 transition-all ${
          isFileTransferMinimized || (incomingFile?.status === 'transferring') || (outgoingFile?.status === 'transferring')
            ? 'bottom-4 right-4 w-80'
            : 'inset-0 flex items-center justify-center bg-black/70'
        }`}>
          <Card className={`bg-gray-800 border-gray-700 p-4 shadow-2xl ${
            isFileTransferMinimized ? 'w-full' : 'w-96'
          }`}>
            {incomingFile && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Incoming File
                  </h3>
                  <div className="flex gap-1">
                    {/* FIX: Show minimize button for both transferring and completed states */}
                    {(incomingFile.status === 'transferring' || incomingFile.status === 'completed') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsFileTransferMinimized(!isFileTransferMinimized)}
                        title={isFileTransferMinimized ? 'Maximize' : 'Minimize'}
                      >
                        {isFileTransferMinimized ? '⬆' : '⬇'}
                      </Button>
                    )}
                    {/* FIX: Always show close button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIncomingFile(null);
                        setIsFileTransferMinimized(false);
                      }}
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {!isFileTransferMinimized && (
                  <div className="mb-4">
                    <p className="text-white text-sm mb-1">{incomingFile.metadata.fileName}</p>
                    <p className="text-gray-400 text-xs">
                      {(incomingFile.metadata.fileSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}

                {incomingFile.status === 'pending' && !isFileTransferMinimized && (
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
                      <span className="text-white font-bold">{incomingFile.progress}%</span>
                    </div>
                    {!isFileTransferMinimized && (
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${incomingFile.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {incomingFile.status === 'completed' && (
                  <div className={isFileTransferMinimized ? 'text-sm' : 'text-center'}>
                    {!isFileTransferMinimized && (
                      <Check className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    )}
                    <p className={`text-white flex items-center gap-2 ${isFileTransferMinimized ? 'text-sm' : ''}`}>
                      {isFileTransferMinimized && <Check className="w-4 h-4 text-green-500" />}
                      File received successfully!
                    </p>
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
                  <div className="flex gap-1">
                    {/* FIX: Show minimize button for both transferring and completed states */}
                    {(outgoingFile.status === 'transferring' || outgoingFile.status === 'completed') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsFileTransferMinimized(!isFileTransferMinimized)}
                        title={isFileTransferMinimized ? 'Maximize' : 'Minimize'}
                      >
                        {isFileTransferMinimized ? '⬆' : '⬇'}
                      </Button>
                    )}
                    {/* FIX: Always show close button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setOutgoingFile(null);
                        setIsFileTransferMinimized(false);
                      }}
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {!isFileTransferMinimized && (
                  <div className="mb-4">
                    <p className="text-white text-sm mb-1">{outgoingFile.metadata.fileName}</p>
                    <p className="text-gray-400 text-xs">
                      {(outgoingFile.metadata.fileSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}

                {outgoingFile.status === 'pending' && !isFileTransferMinimized && (
                  <p className="text-gray-400 text-sm">Waiting for peer to accept...</p>
                )}

                {outgoingFile.status === 'transferring' && (
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-gray-400">Sending...</span>
                      <span className="text-white font-bold">{outgoingFile.progress}%</span>
                    </div>
                    {!isFileTransferMinimized && (
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${outgoingFile.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {outgoingFile.status === 'completed' && (
                  <div className={isFileTransferMinimized ? 'text-sm' : 'text-center'}>
                    {!isFileTransferMinimized && (
                      <Check className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    )}
                    <p className={`text-white flex items-center gap-2 ${isFileTransferMinimized ? 'text-sm' : ''}`}>
                      {isFileTransferMinimized && <Check className="w-4 h-4 text-green-500" />}
                      File sent successfully!
                    </p>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      {/* Controls - Fixed at bottom with gradient overlay */}
      <TooltipProvider>
        <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent pt-8 pb-4 px-4 flex justify-center gap-3">
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
              <p className="font-semibold">{isVideoEnabled ? 'Tắt camera' : 'Bật camera'}</p>
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
              <p className="font-semibold">{isAudioEnabled ? 'Tắt micro' : 'Bật micro'}</p>
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
                {isScreenSharing ? <MonitorStop className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">{isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}</p>
            </TooltipContent>
          </Tooltip>

          {/* Virtual Background Control */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative">
                <Button
                  data-testid="toggle-virtual-bg-btn"
                  onClick={() => setIsVbgMenuOpen(!isVbgMenuOpen)}
                  variant="ghost"
                  size="lg"
                  disabled={vbgLoading}
                  className={`rounded-full transition-all hover:scale-110 ${
                    virtualBgEnabled
                      ? '!bg-blue-600 hover:!bg-blue-700 shadow-lg shadow-blue-500/50 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white'
                  } ${vbgLoading ? 'opacity-75 cursor-wait animate-pulse' : ''}`}
                >
                  {vbgLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                </Button>
                
                {/* Virtual Background Menu - REDESIGNED RESPONSIVE */}
                {isVbgMenuOpen && (
                  <div
                    id="vbg-menu"
                    className="fixed md:absolute bottom-0 md:bottom-full left-0 right-0 md:left-auto md:right-0 md:mb-2 bg-gray-900/95 backdrop-blur-xl rounded-t-2xl md:rounded-2xl shadow-2xl border border-gray-700/50 w-full md:w-[420px] z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-200 flex flex-col"
                    style={{
                      maxHeight: 'min(85vh, 700px)'
                    }}
                  >
                  {/* Header - Fixed */}
                  <div className="flex items-center justify-between p-4 pb-3 border-b border-gray-700/50 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-sm">🎭</span>
                      </div>
                      <div className="text-sm font-bold text-white">Hiệu ứng nền ảo</div>
                    </div>
                    <Button
                      onClick={() => setIsVbgMenuOpen(false)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Scrollable Content */}
                  <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <div className="p-4 space-y-4">
                      {/* No effect & blur section */}
                      <div>
                        <div className="text-xs font-medium text-gray-400 mb-2.5">Chế độ cơ bản</div>
                        <div className="grid grid-cols-3 gap-2">
                          {/* No Effect */}
                          <button
                            data-testid="vbg-mode-none"
                            onClick={() => {
                              toggleVirtualBackground('none');
                            }}
                            className={`h-16 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                              backgroundMode === 'none'
                                ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/20'
                                : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-800'
                            }`}
                            title="Không hiệu ứng"
                          >
                            <Eye className="w-5 h-5" />
                            <span className="text-[10px] font-medium">Không</span>
                          </button>
                          
                          {/* Blur Background */}
                          <button
                            data-testid="vbg-mode-blur"
                            onClick={() => {
                              toggleVirtualBackground('blur');
                            }}
                            className={`h-16 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                              backgroundMode === 'blur' && !activePreset
                                ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/20'
                                : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-800'
                            }`}
                            title="Làm mờ nền"
                          >
                            <EyeOff className="w-5 h-5" />
                            <span className="text-[10px] font-medium">Mờ</span>
                          </button>
                          
                          {/* Upload Custom Image */}
                          <button
                            data-testid="vbg-mode-custom"
                            onClick={async () => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = async (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) {
                                  try {
                                    const img = new Image();
                                    await new Promise<void>((resolve, reject) => {
                                      img.onload = () => resolve();
                                      img.onerror = () => reject(new Error('Failed to load custom image'));
                                      img.src = URL.createObjectURL(file);
                                    });
                                    
                                    setActivePreset('Custom');
                                    setBackgroundMode('image');
                                    
                                    // CRITICAL: Always start processing with custom image
                                    if (!virtualBgProcessorRef.current) {
                                      virtualBgProcessorRef.current = new VirtualBackgroundProcessor();
                                      await virtualBgProcessorRef.current.initialize();
                                    }
                                    
                                    if (!originalStreamRef.current) {
                                      originalStreamRef.current = localStreamRef.current;
                                    }
                                    
                                    if (virtualBgEnabled) {
                                      // Already enabled, restart
                                      virtualBgProcessorRef.current.stopProcessing();
                                    }
                                    
                                    // Check for valid stream
                                    const sourceStream = originalStreamRef.current || localStreamRef.current;
                                    if (!sourceStream) {
                                      console.error('❌ [VBG] No source stream for custom image');
                                      return;
                                    }
                                    
                                    // Start processing with custom image
                                    const processedStream = await virtualBgProcessorRef.current.startProcessing(
                                      sourceStream,
                                      {
                                        mode: 'image',
                                        backgroundImage: img,
                                        modelSelection: 1,
                                        smoothing: 0.7 // High smoothing for smooth edges
                                      }
                                    );
                                    
                                    // ✅ CRITICAL FIX: Only update local preview, NOT peer connection
                                    if (localVideoRef.current) {
                                      localVideoRef.current.srcObject = processedStream;
                                    }
                                    
                                    // Do NOT update localStreamRef or replace track
                                    // Peer connection should always send original video
                                    // localStreamRef.current = processedStream; // ❌ REMOVED
                                    console.log('✅ [VBG] Custom image applied to LOCAL preview only (peer receives original)');
                                    
                                    setVirtualBgEnabled(true);
                                    
                                    // Convert image to data URL for SSE transmission
                                    const canvas = document.createElement('canvas');
                                    canvas.width = img.width;
                                    canvas.height = img.height;
                                    const ctx = canvas.getContext('2d');
                                    if (ctx) {
                                      ctx.drawImage(img, 0, 0);
                                      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                                      
                                      // 💾 Save to localStorage
                                      try {
                                        localStorage.setItem('vbg-last-background', 'Custom');
                                        localStorage.setItem('vbg-last-mode', 'image');
                                        localStorage.setItem('vbg-enabled', 'true');
                                        localStorage.setItem('vbg-background-image', dataUrl);
                                        console.log('💾 [VBG] Saved custom background to localStorage');
                                      } catch (err) {
                                        console.error('❌ [VBG] Failed to save to localStorage:', err);
                                      }
                                      
                                      // 📡 CRITICAL FIX: Notify peer about custom background via SSE
                                      if (remotePeerIdRef.current) {
                                        console.log('📡 [VBG] Sending custom background to peer via SSE');
                                        try {
                                          await fetch('/api/videolify/signal', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              action: 'vbg-settings',
                                              roomId,
                                              peerId: peerIdRef.current,
                                              data: {
                                                enabled: true,
                                                mode: 'image',
                                                backgroundImage: dataUrl, // Send data URL to peer
                                                toPeerId: remotePeerIdRef.current,
                                              },
                                            }),
                                          });
                                          console.log('✅ [VBG] Custom background sent to peer');
                                        } catch (err) {
                                          console.error('❌ [VBG] Failed to send custom background:', err);
                                        }
                                      }
                                    }
                                  } catch (err) {
                                    console.error('❌ [VBG] Failed to load custom image:', err);
                                  }
                                }
                              };
                              input.click();
                            }}
                            className={`h-16 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                              activePreset === 'Custom'
                                ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/20'
                                : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-800'
                            }`}
                            title="Tải ảnh nền"
                          >
                            <Upload className="w-5 h-5" />
                            <span className="text-[10px] font-medium">Tải lên</span>
                          </button>
                        </div>
                        
                        {/* Blur Amount Slider (shown only when blur is active) */}
                        {backgroundMode === 'blur' && !activePreset && (
                          <div className="mt-3 pt-3 border-t border-gray-700/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-400 font-medium">Độ mờ</span>
                              <span className="text-xs text-white font-semibold bg-gray-800 px-2 py-0.5 rounded">{blurAmount}px</span>
                            </div>
                            <input
                              type="range"
                              min="5"
                              max="20"
                              value={blurAmount}
                              onChange={(e) => updateBlurAmount(Number(e.target.value))}
                              className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
                            />
                            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                              <span>Nhẹ</span>
                              <span>Mạnh</span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Background Presets */}
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="text-xs font-medium text-gray-400">
                            Thư viện nền ({PRESET_BACKGROUNDS.filter(bg => selectedCategory === 'All' || bg.category === selectedCategory).length})
                          </div>
                        </div>
                        
                        {/* Category Filter Tabs */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {['All', 'Office', 'Education', 'Library', 'Bookshelf', 'Living Room', 'Beach', 'Nature', 'City', 'Minimal'].map((cat) => (
                            <button
                              key={cat}
                              onClick={() => setSelectedCategory(cat)}
                              className={`text-[10px] px-2.5 py-1 rounded-full transition-all font-medium ${
                                selectedCategory === cat
                                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                                  : 'bg-gray-800/70 text-gray-300 hover:bg-gray-700 border border-gray-700'
                              }`}
                            >
                              {cat === 'All' ? 'Tất cả' : cat}
                            </button>
                          ))}
                        </div>
                        
                        {/* Scrollable Grid */}
                        <div className="grid grid-cols-4 gap-2">
                          {PRESET_BACKGROUNDS
                            .filter(bg => selectedCategory === 'All' || bg.category === selectedCategory)
                            .map((preset, index) => (
                            <button
                              key={preset.name}
                              data-testid={`vbg-preset-${index}`}
                              onClick={() => loadPresetBackground(preset.name, preset.url)}
                              disabled={presetLoading !== null}
                              className={`relative aspect-video rounded-lg border-2 transition-all overflow-hidden group ${
                                activePreset === preset.name
                                  ? 'border-blue-500 ring-2 ring-blue-400/50 shadow-lg shadow-blue-500/30'
                                  : presetLoading === preset.name 
                                    ? 'border-blue-500 animate-pulse' 
                                    : presetLoading 
                                      ? 'border-gray-700 opacity-50 cursor-not-allowed'
                                      : 'border-gray-700/50 hover:border-blue-400 cursor-pointer hover:scale-105'
                              }`}
                              title={preset.name}
                            >
                              {/* Background Image Preview */}
                              <img 
                                src={preset.url.replace('w=1920', 'w=300').replace('&q=80', '&q=60')}
                                alt={preset.name}
                                className="absolute inset-0 w-full h-full object-cover"
                                loading="lazy"
                              />
                              {/* Overlay with label - ONLY show on hover or when loading */}
                              <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex items-end justify-center pb-1 transition-opacity ${
                                presetLoading === preset.name || activePreset === preset.name ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}>
                                {presetLoading === preset.name ? (
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <span className="text-[9px] font-semibold text-white drop-shadow-lg px-1 text-center leading-tight line-clamp-2">
                                    {preset.emoji}
                                  </span>
                                )}
                              </div>
                              {/* Active indicator */}
                              {activePreset === preset.name && (
                                <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-500 rounded-full ring-2 ring-white shadow-lg" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">Hiệu ứng nền ảo</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="toggle-whiteboard-btn"
                onClick={toggleWhiteboard}
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
              <p className="font-semibold">{showWhiteboard ? 'Ẩn bảng trắng' : 'Hiện bảng trắng'}</p>
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
              <p className="font-semibold">{showChat ? 'Ẩn chat' : 'Hiện chat'}</p>
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
              <p className="font-semibold">{connectionStats.connected ? 'Gửi file' : 'Chờ kết nối'}</p>
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
              <p className="font-semibold">{handRaised ? 'Hạ tay' : 'Giơ tay'}</p>
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
              <p className="font-semibold">{isRecording ? 'Dừng ghi hình' : 'Ghi hình buổi học'}</p>
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
              <p className="font-semibold">{showDebugStats ? 'Ẩn thông tin debug' : 'Hiện thông tin kết nối'}</p>
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
              <p className="font-semibold">Kết thúc cuộc gọi</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Show PiP button when hidden - Minimal compact pill */}
      {!pipVisible && (
        <button
          onClick={() => setPipVisible(true)}
          className="fixed top-3 right-3 z-[99999] flex items-center gap-1.5 bg-blue-600/90 hover:bg-blue-600 text-white shadow-lg rounded-full px-3 py-1.5 text-xs font-medium transition-all hover:scale-105 cursor-pointer backdrop-blur-sm"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Hiện</span>
        </button>
      )}
    </div>
  );
}
