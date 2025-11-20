/**
 * Videolify Types
 * Shared types for video call components
 */

export interface VideolifyFullProps {
  roomId: string;
  accessToken: string;
  userDisplayName: string;
  role: string;
  onCallEnd?: () => void;
}

export interface ChatMessage {
  userName: string;
  message: string;
  timestamp: number;
  fromMe: boolean;
  reactions?: { emoji: string; users: string[] }[];
}
