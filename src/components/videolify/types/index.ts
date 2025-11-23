/**
 * TypeScript Types and Interfaces for Videolify Platform
 * All message types, events, and data structures used across the video call system
 */

import type { BackgroundMode } from '@/lib/virtualBackground';

// ===== Component Props =====

export interface VideolifyFullProps {
  roomId: string;
  accessToken: string;
  userDisplayName: string;
  role: 'tutor' | 'student';
  onCallEnd?: () => void;
}

// ===== Chat Types =====

export interface ChatMessage {
  userName: string;
  message: string;
  timestamp: number;
  fromMe: boolean;
}

// ===== Whiteboard Types =====

export interface DrawEvent {
  type: 'draw' | 'clear' | 'undo' | 'erase';
  data?: any; // fabric.Object JSON
  objectId?: string; // For erase events
}

// ===== File Transfer Types =====

export interface FileMetadata {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
}

export interface FileTransfer {
  metadata: FileMetadata;
  chunks: ArrayBuffer[];
  receivedChunks: number;
  progress: number;
  status: 'pending' | 'transferring' | 'completed' | 'failed';
}

export interface FileOfferMessage {
  type: 'file-offer';
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
}

export interface FileAcceptMessage {
  type: 'file-accept';
  fileId: string;
}

export interface FileRejectMessage {
  type: 'file-reject';
  fileId: string;
  reason?: string;
}

export interface FileProgressMessage {
  type: 'file-progress';
  fileId: string;
  progress: number;
}

export interface FileChunkMessage {
  type: 'file-chunk';
  fileId: string;
  chunkIndex: number;
  chunk: ArrayBuffer;
}

export type FileChannelMessage =
  | FileOfferMessage
  | FileAcceptMessage
  | FileRejectMessage
  | FileProgressMessage
  | FileChunkMessage;

// ===== Control Channel Types =====

export interface PingMessage {
  type: 'ping';
  timestamp: number;
}

export interface PongMessage {
  type: 'pong';
  timestamp: number;
}

export interface HandRaiseMessage {
  type: 'hand-raise';
  raised: boolean;
}

export interface WhiteboardToggleMessage {
  type: 'whiteboard-toggle';
  visible: boolean;
}

export interface VideoToggleMessage {
  type: 'video-toggle';
  enabled: boolean;
}

export interface AudioToggleMessage {
  type: 'audio-toggle';
  enabled: boolean;
}

export interface ScreenShareToggleMessage {
  type: 'screen-share-toggle';
  isSharing: boolean;
}

export interface UserInfoMessage {
  type: 'user-info';
  userName: string;
  role: 'tutor' | 'student';
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
}

export type ControlChannelMessage =
  | PingMessage
  | PongMessage
  | HandRaiseMessage
  | WhiteboardToggleMessage
  | VideoToggleMessage
  | AudioToggleMessage
  | ScreenShareToggleMessage
  | UserInfoMessage;

// ===== Signaling Types (REST API & SSE) =====

export interface SignalingJoinRequest {
  action: 'join';
  roomId: string;
  peerId: string;
  data: {
    userName: string;
    role: 'tutor' | 'student';
  };
}

export interface SignalingOfferRequest {
  action: 'offer';
  roomId: string;
  peerId: string;
  data: {
    offer: RTCSessionDescriptionInit;
    toPeerId: string;
    messageId: string;
  };
}

export interface SignalingAnswerRequest {
  action: 'answer';
  roomId: string;
  peerId: string;
  data: {
    answer: RTCSessionDescriptionInit;
    toPeerId: string;
    messageId: string;
  };
}

export interface SignalingIceRequest {
  action: 'ice';
  roomId: string;
  peerId: string;
  data: {
    candidate: RTCIceCandidateInit;
    toPeerId?: string;
  };
}

export interface SignalingVbgSettingsRequest {
  action: 'vbg-settings';
  roomId: string;
  peerId: string;
  data: {
    enabled: boolean;
    mode: BackgroundMode;
    blurAmount?: number;
    backgroundImage?: string;
    toPeerId: string;
  };
}

export interface SignalingLeaveRequest {
  action: 'leave';
  roomId: string;
  peerId: string;
}

export type SignalingRequest =
  | SignalingJoinRequest
  | SignalingOfferRequest
  | SignalingAnswerRequest
  | SignalingIceRequest
  | SignalingVbgSettingsRequest
  | SignalingLeaveRequest;

export interface SignalingJoinResponse {
  success: boolean;
  peers: Array<{
    peerId: string;
    userName: string;
    role: 'tutor' | 'student';
  }>;
  shouldInitiate: boolean;
}

// ===== SSE Event Types =====

export interface SSEPeerJoinedEvent {
  peerId: string;
  userName: string;
  role: 'tutor' | 'student';
  shouldInitiate: boolean;
}

export interface SSEOfferEvent {
  fromPeerId: string;
  offer: RTCSessionDescriptionInit;
  messageId: string;
  toPeerId: string;
}

export interface SSEAnswerEvent {
  fromPeerId: string;
  answer: RTCSessionDescriptionInit;
  messageId: string;
  toPeerId: string;
}

export interface SSEIceCandidateEvent {
  fromPeerId: string;
  candidate: RTCIceCandidateInit;
}

export interface SSEVbgSettingsEvent {
  fromPeerId: string;
  enabled: boolean;
  mode: BackgroundMode;
  blurAmount?: number;
  backgroundImage?: string;
}

export interface SSEPeerLeftEvent {
  peerId: string;
}

// ===== Connection State Types =====

export interface ConnectionStats {
  iceState: RTCIceConnectionState;
  connected: boolean;
  packetsLost?: number;
  roundTripTime?: number;
  bitrate?: number;
}

export interface ChannelStates {
  whiteboard: RTCDataChannelState;
  chat: RTCDataChannelState;
  control: RTCDataChannelState;
  file: RTCDataChannelState;
}

// ===== Virtual Background Types =====

export interface VirtualBackgroundSettings {
  enabled: boolean;
  mode: BackgroundMode;
  blurAmount: number;
  backgroundImage: string | null;
}

export interface PresetBackground {
  name: string;
  url: string;
  thumbnail: string;
  category?: string;
}

// ===== WebRTC Configuration =====

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Optional TURN server (uncomment and configure if you have a TURN service)
    // { urls: 'turn:turn.example.com:3478', username: 'turnuser', credential: 'turnpass' },
  ],
};
