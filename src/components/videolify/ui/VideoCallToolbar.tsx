'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Logo } from '@/components/Logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Heart,
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
  isRemoteSharing?: boolean; // Track if remote peer is sharing

  // Panel toggles
  showChat: boolean;
  showWhiteboard: boolean;
  showVbgPanel: boolean;
  onToggleChat: () => void;
  onToggleWhiteboard: () => void;
  onToggleVbgPanel: () => void;
  unreadChatCount?: number;

  // File transfer
  onFilePick: () => void;

  // VBG enabled state
  vbgEnabled: boolean;

  // Hand raise
  handRaised: boolean;
  onToggleHandRaise: () => void;

  // Reactions
  onSendReaction?: (type: 'heart' | 'like' | 'clap' | 'fire') => void;

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
  isRemoteSharing = false,
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
  onSendReaction,
  isRecording,
  onToggleRecording,
  showDebugStats,
  onToggleDebugStats,
  onEndCall,
  unreadChatCount = 0,
}: VideoCallToolbarProps) {
  const [isReactionMenuOpen, setIsReactionMenuOpen] = React.useState(false);
  const [selectedReaction, setSelectedReaction] = React.useState<'heart' | 'like' | 'clap' | 'fire'>('heart');

  // Reaction config with colors
  const reactionConfig = {
    heart: {
      emoji: '❤️',
      label: 'Tim',
      icon: Heart,
      gradient: 'from-pink-500 to-red-600',
      hoverGradient: 'hover:from-pink-600 hover:to-red-700',
      shadow: 'shadow-pink-500/50',
    },
    like: {
      emoji: '👍',
      label: 'Like',
      icon: null,
      gradient: 'from-blue-500 to-blue-600',
      hoverGradient: 'hover:from-blue-600 hover:to-blue-700',
      shadow: 'shadow-blue-500/50',
    },
    clap: {
      emoji: '👏',
      label: 'Vỗ tay',
      icon: null,
      gradient: 'from-yellow-500 to-orange-600',
      hoverGradient: 'hover:from-yellow-600 hover:to-orange-700',
      shadow: 'shadow-orange-500/50',
    },
    fire: {
      emoji: '🔥',
      label: 'Tuyệt vời',
      icon: null,
      gradient: 'from-orange-500 to-red-600',
      hoverGradient: 'hover:from-orange-600 hover:to-red-700',
      shadow: 'shadow-red-500/50',
    },
  };

  // Click: send current selected reaction
  const handleReactionClick = () => {
    if (onSendReaction) {
      onSendReaction(selectedReaction);
    }
  };

  // Select reaction from menu
  const handleSelectReaction = (type: 'heart' | 'like' | 'clap' | 'fire') => {
    setSelectedReaction(type);
    onSendReaction?.(type);
    setIsReactionMenuOpen(false);
  };

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
          {/* Use logo optimized for dark backgrounds: force svg fills and text to light color */}
          <Logo
            size="sm"
            className="text-white [&_svg]:fill-white [&_path]:fill-white [&_ellipse]:fill-white [&_line]:stroke-white [&_text]:fill-white"
          />
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
              disabled={!isScreenSharing && isRemoteSharing}
              className={`rounded-full transition-all duration-200 h-9 w-9 p-0 ${
                isScreenSharing
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/60 ring-2 ring-blue-400/50 border-2 border-blue-300/50 hover:scale-105'
                  : isRemoteSharing
                  ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed opacity-50'
                  : 'bg-gray-700/80 hover:bg-gray-600/90 text-gray-300 hover:text-white hover:scale-105'
              }`}
            >
              {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">
              {isScreenSharing
                ? 'Dừng chia sẻ màn hình'
                : isRemoteSharing
                ? 'Người kia đang chia sẻ màn hình'
                : 'Chia sẻ màn hình'}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Chat */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onToggleChat}
              variant="ghost"
              size="sm"
              className={`relative rounded-full transition-all duration-200 hover:scale-105 h-9 w-9 p-0 ${
                showChat
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700/80 hover:bg-gray-600/90 text-gray-300 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              {unreadChatCount > 0 && !showChat && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </span>
              )}
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
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/60 ring-2 ring-blue-400/50 border-2 border-blue-300/50'
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
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/60 ring-2 ring-blue-400/50 border-2 border-blue-300/50'
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
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
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

        {/* Reactions - Click to send, right-click for menu */}
        {onSendReaction && (
          <div className="relative">
            <DropdownMenu open={isReactionMenuOpen} onOpenChange={setIsReactionMenuOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReactionClick();
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsReactionMenuOpen(true);
                    }}
                    className={`rounded-full transition-all duration-200 hover:scale-110 active:scale-125 h-9 w-9 p-0 bg-gradient-to-br ${reactionConfig[selectedReaction].gradient} ${reactionConfig[selectedReaction].hoverGradient} text-white shadow-lg hover:shadow-xl ${reactionConfig[selectedReaction].shadow}`}
                  >
                    {reactionConfig[selectedReaction].icon ? (
                      <Heart className="w-4 h-4 fill-white" />
                    ) : (
                      <span className="text-lg">{reactionConfig[selectedReaction].emoji}</span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">
                    Click: {reactionConfig[selectedReaction].label} {reactionConfig[selectedReaction].emoji}<br />
                    <span className="text-[10px] opacity-70">Chuột phải: Đổi reaction</span>
                  </p>
                </TooltipContent>
              </Tooltip>
              {/* Hidden trigger positioned at button location */}
              <DropdownMenuTrigger asChild>
                <div className="absolute inset-0 pointer-events-none" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="center" className="min-w-[140px]">
              <DropdownMenuItem
                onClick={() => handleSelectReaction('heart')}
                className={`cursor-pointer flex items-center gap-2 text-base ${
                  selectedReaction === 'heart' ? 'bg-blue-100' : ''
                }`}
              >
                <span className="text-2xl">❤️</span>
                <span className="text-sm">Tim</span>
                {selectedReaction === 'heart' && (
                  <span className="ml-auto text-blue-600">✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSelectReaction('like')}
                className={`cursor-pointer flex items-center gap-2 text-base ${
                  selectedReaction === 'like' ? 'bg-blue-100' : ''
                }`}
              >
                <span className="text-2xl">👍</span>
                <span className="text-sm">Like</span>
                {selectedReaction === 'like' && (
                  <span className="ml-auto text-blue-600">✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSelectReaction('clap')}
                className={`cursor-pointer flex items-center gap-2 text-base ${
                  selectedReaction === 'clap' ? 'bg-blue-100' : ''
                }`}
              >
                <span className="text-2xl">👏</span>
                <span className="text-sm">Vỗ tay</span>
                {selectedReaction === 'clap' && (
                  <span className="ml-auto text-blue-600">✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSelectReaction('fire')}
                className={`cursor-pointer flex items-center gap-2 text-base ${
                  selectedReaction === 'fire' ? 'bg-blue-100' : ''
                }`}
              >
                <span className="text-2xl">🔥</span>
                <span className="text-sm">Tuyệt vời</span>
                {selectedReaction === 'fire' && (
                  <span className="ml-auto text-blue-600">✓</span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        )}

        {/* Recording */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onToggleRecording}
              variant="ghost"
              size="sm"
              className={`rounded-full transition-all duration-200 hover:scale-105 h-9 w-9 p-0 ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30'
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
