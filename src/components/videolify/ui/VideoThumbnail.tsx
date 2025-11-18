'use client';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { User, VideoOff, MicOff, Maximize2, Minimize2, Eye, EyeOff } from 'lucide-react';

interface VideoThumbnailProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  userName: string;
  isMuted?: boolean;
  size: 'small' | 'medium' | 'large';
  isVisible: boolean;
  onToggleSize: () => void;
  onToggleVisibility: () => void;
}

export function VideoThumbnail({
  videoRef,
  isVideoEnabled,
  isAudioEnabled,
  userName,
  isMuted = false,
  size,
  isVisible,
  onToggleSize,
  onToggleVisibility,
}: VideoThumbnailProps) {
  if (!isVisible) {
    return (
      <div className="mb-2">
        <Button
          onClick={onToggleVisibility}
          variant="outline"
          size="sm"
          className="w-full bg-gray-800/50 hover:bg-gray-700 border-gray-600 text-white"
        >
          <Eye className="w-4 h-4 mr-2" />
          Hiện {userName}
        </Button>
      </div>
    );
  }

  const sizeClasses = {
    small: 'w-40 h-30',
    medium: 'w-48 h-36',
    large: 'w-64 h-48',
  };

  return (
    <div className={`${sizeClasses[size]} mb-3 group relative rounded-lg overflow-hidden border-2 border-gray-600 shadow-xl`}>
      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        className={`w-full h-full object-cover ${isVideoEnabled ? 'block' : 'hidden'}`}
      />

      {/* Camera Off Overlay */}
      {!isVideoEnabled && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
          <div className={`rounded-full bg-gray-800 flex items-center justify-center shadow-xl mb-2 ${
            size === 'small' ? 'w-12 h-12' : size === 'medium' ? 'w-14 h-14' : 'w-16 h-16'
          }`}>
            <User className={`text-gray-400 ${
              size === 'small' ? 'w-6 h-6' : size === 'medium' ? 'w-7 h-7' : 'w-8 h-8'
            }`} />
          </div>
          <div className="flex items-center gap-1">
            <VideoOff className="w-3 h-3 text-red-400" />
            <p className="text-white text-xs font-medium">Camera tắt</p>
          </div>
        </div>
      )}

      {/* User Name Label */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <p className="text-white text-xs font-semibold truncate">{userName}</p>
        {!isAudioEnabled && (
          <div className="flex items-center gap-1 mt-1">
            <MicOff className="w-3 h-3 text-red-400" />
            <span className="text-red-400 text-[10px]">Mic tắt</span>
          </div>
        )}
      </div>

      {/* Hover Controls */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onToggleSize}
              size="sm"
              variant="secondary"
              className="h-6 w-6 p-0 bg-black/60 hover:bg-black/80"
            >
              {size === 'large' ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {size === 'large' ? 'Thu nhỏ' : 'Phóng to'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onToggleVisibility}
              size="sm"
              variant="secondary"
              className="h-6 w-6 p-0 bg-black/60 hover:bg-black/80"
            >
              <EyeOff className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ẩn video</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
