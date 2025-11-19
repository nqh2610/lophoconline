'use client';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Logo } from '@/components/Logo';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  MessageSquare,
  Pencil,
  Upload,
  Sparkles,
  Hand,
  Circle,
  Activity,
  PhoneOff,
} from 'lucide-react';

interface VideoCallToolbarProps {
  // Video/Audio state
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;

  // Screen share state
  isScreenSharing: boolean;
  onToggleScreenShare: () => void;

  // Panel toggles
  showChat: boolean;
  showWhiteboard: boolean;
  showVbgPanel: boolean;
  onToggleChat: () => void;
  onToggleWhiteboard: () => void;
  onToggleVbgPanel: () => void;

  // File transfer
  onFilePick: () => void;

  // VBG enabled state
  vbgEnabled: boolean;

  // Hand raise
  handRaised: boolean;
  onToggleHandRaise: () => void;

  // Recording
  isRecording: boolean;
  onToggleRecording: () => void;

  // Debug stats
  showDebugStats: boolean;
  onToggleDebugStats: () => void;

  // End call
  onEndCall: () => void;
}

export function VideoCallToolbar({
  isVideoEnabled,
  isAudioEnabled,
  onToggleVideo,
  onToggleAudio,
  isScreenSharing,
  onToggleScreenShare,
  showChat,
  showWhiteboard,
  showVbgPanel,
  onToggleChat,
  onToggleWhiteboard,
  onToggleVbgPanel,
  onFilePick,
  vbgEnabled,
  handRaised,
  onToggleHandRaise,
  isRecording,
  onToggleRecording,
  showDebugStats,
  onToggleDebugStats,
  onEndCall,
}: VideoCallToolbarProps) {
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-50">
      <div
        className="flex items-center justify-center gap-3 px-4 py-2.5 rounded-full shadow-lg border bg-gray-900/20 backdrop-blur-sm"
        style={{
          maxWidth: 'calc(100vw - 2rem)',
          borderColor: 'rgba(255, 255, 255, 0.15)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Logo */}
        <div className="mr-1">
          <Logo variant="light" size="sm" />
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-700/50"></div>

        {/* Camera */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onToggleVideo}
              variant={isVideoEnabled ? 'default' : 'destructive'}
              size="sm"
              className={`rounded-full transition-all duration-200 hover:scale-105 h-10 w-10 p-0 ${
                isVideoEnabled
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{isVideoEnabled ? 'Tắt camera' : 'Bật camera'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Microphone */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onToggleAudio}
              variant={isAudioEnabled ? 'default' : 'destructive'}
              size="sm"
              className={`rounded-full transition-all duration-200 hover:scale-105 h-10 w-10 p-0 ${
                isAudioEnabled
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{isAudioEnabled ? 'Tắt micro' : 'Bật micro'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Screen Share */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onToggleScreenShare}
              variant="ghost"
              size="sm"
              className={`rounded-full transition-all duration-200 hover:scale-105 h-9 w-9 p-0 ${
                isScreenSharing
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-700/80 hover:bg-gray-600/90 text-gray-300 hover:text-white'
              }`}
            >
              {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Chat */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onToggleChat}
              variant="ghost"
              size="sm"
              className={`rounded-full transition-all duration-200 hover:scale-105 h-9 w-9 p-0 ${
                showChat
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700/80 hover:bg-gray-600/90 text-gray-300 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Chat</p>
          </TooltipContent>
        </Tooltip>

        {/* Whiteboard */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onToggleWhiteboard}
              variant="ghost"
              size="sm"
              className={`rounded-full transition-all duration-200 hover:scale-105 h-9 w-9 p-0 ${
                showWhiteboard
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700/80 hover:bg-gray-600/90 text-gray-300 hover:text-white'
              }`}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Bảng trắng</p>
          </TooltipContent>
        </Tooltip>

        {/* File Transfer */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onFilePick}
              variant="ghost"
              size="sm"
              className="rounded-full transition-all duration-200 hover:scale-105 h-9 w-9 p-0 bg-gray-700/80 hover:bg-gray-600/90 text-gray-300 hover:text-white"
            >
              <Upload className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Gửi file</p>
          </TooltipContent>
        </Tooltip>

        {/* Virtual Background */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onToggleVbgPanel}
              variant="ghost"
              size="sm"
              className={`rounded-full transition-all duration-200 hover:scale-105 h-9 w-9 p-0 ${
                vbgEnabled
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-gray-700/80 hover:bg-gray-600/90 text-gray-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Hiệu ứng nền ảo</p>
          </TooltipContent>
        </Tooltip>

        {/* Hand Raise */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onToggleHandRaise}
              variant="ghost"
              size="sm"
              className={`rounded-full transition-all duration-200 hover:scale-105 h-9 w-9 p-0 ${
                handRaised
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                  : 'bg-gray-700/80 hover:bg-gray-600/90 text-gray-300 hover:text-white'
              }`}
            >
              <Hand className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{handRaised ? 'Hạ tay' : 'Giơ tay'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Recording */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onToggleRecording}
              variant="ghost"
              size="sm"
              className={`rounded-full transition-all duration-200 hover:scale-105 h-9 w-9 p-0 ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                  : 'bg-gray-700/80 hover:bg-gray-600/90 text-gray-300 hover:text-white'
              }`}
            >
              <Circle className={`w-4 h-4 ${isRecording ? 'fill-white' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{isRecording ? 'Dừng quay' : 'Quay video'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Debug Stats */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onToggleDebugStats}
              variant="ghost"
              size="sm"
              className={`rounded-full transition-all duration-200 hover:scale-105 h-9 w-9 p-0 ${
                showDebugStats
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700/80 hover:bg-gray-600/90 text-gray-300 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Thông tin kết nối</p>
          </TooltipContent>
        </Tooltip>

        {/* End Call */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onEndCall}
              variant="destructive"
              size="sm"
              className="rounded-full transition-all duration-200 hover:scale-105 h-10 w-10 p-0 bg-red-600 hover:bg-red-700"
            >
              <PhoneOff className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Kết thúc cuộc gọi</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
