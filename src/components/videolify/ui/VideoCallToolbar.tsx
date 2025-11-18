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
    <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent pt-8 pb-4 px-4 flex justify-center gap-3">
      {/* Logo in toolbar */}
      <div className="absolute left-4 bottom-4">
        <Logo variant="light" size="sm" />
      </div>

      {/* Camera */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onToggleVideo}
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

      {/* Microphone */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onToggleAudio}
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

      {/* Screen Share */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onToggleScreenShare}
            variant={isScreenSharing ? 'default' : 'outline'}
            size="lg"
            className={`rounded-full transition-all hover:scale-110 ${
              isScreenSharing
                ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/50'
                : 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white'
            }`}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}</p>
        </TooltipContent>
      </Tooltip>

      {/* Chat */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onToggleChat}
            variant="ghost"
            size="lg"
            className={`rounded-full transition-all hover:scale-110 ${
              showChat
                ? '!bg-blue-600 hover:!bg-blue-700 shadow-lg shadow-blue-500/50 text-white'
                : 'bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">Chat</p>
        </TooltipContent>
      </Tooltip>

      {/* Whiteboard */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onToggleWhiteboard}
            variant="ghost"
            size="lg"
            className={`rounded-full transition-all hover:scale-110 ${
              showWhiteboard
                ? '!bg-blue-600 hover:!bg-blue-700 shadow-lg shadow-blue-500/50 text-white'
                : 'bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white'
            }`}
          >
            <Pencil className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">Bảng trắng</p>
        </TooltipContent>
      </Tooltip>

      {/* File Transfer */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onFilePick}
            variant="ghost"
            size="lg"
            className="rounded-full transition-all hover:scale-110 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white"
          >
            <Upload className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">Gửi file</p>
        </TooltipContent>
      </Tooltip>

      {/* Virtual Background */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onToggleVbgPanel}
            variant="ghost"
            size="lg"
            className={`rounded-full transition-all hover:scale-110 ${
              vbgEnabled
                ? '!bg-blue-600 hover:!bg-blue-700 shadow-lg shadow-blue-500/50 text-white'
                : 'bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white'
            }`}
          >
            <Sparkles className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">Hiệu ứng nền ảo</p>
        </TooltipContent>
      </Tooltip>

      {/* Hand Raise */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onToggleHandRaise}
            variant="ghost"
            size="lg"
            className={`rounded-full transition-all hover:scale-110 ${
              handRaised
                ? '!bg-yellow-500 hover:!bg-yellow-600 shadow-lg shadow-yellow-500/50 text-white'
                : 'bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white'
            }`}
          >
            <Hand className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{handRaised ? 'Hạ tay' : 'Giơ tay'}</p>
        </TooltipContent>
      </Tooltip>

      {/* Recording */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onToggleRecording}
            variant="ghost"
            size="lg"
            className={`rounded-full transition-all hover:scale-110 ${
              isRecording
                ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/50 text-white animate-pulse'
                : 'bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white'
            }`}
          >
            <Circle className={`w-5 h-5 ${isRecording ? 'fill-white' : ''}`} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{isRecording ? 'Dừng quay' : 'Quay video'}</p>
        </TooltipContent>
      </Tooltip>

      {/* Debug Stats */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onToggleDebugStats}
            variant="ghost"
            size="lg"
            className="rounded-full transition-all hover:scale-110 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white"
          >
            <Activity className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">Thông tin kết nối</p>
        </TooltipContent>
      </Tooltip>

      {/* End Call */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onEndCall}
            variant="destructive"
            size="lg"
            className="rounded-full transition-all hover:scale-110 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/50"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">Kết thúc cuộc gọi</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
