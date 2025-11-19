'use client';

import { User, VideoOff } from 'lucide-react';

interface CameraOffOverlayProps {
  pipSize: 'small' | 'medium' | 'large';
}

/**
 * CameraOffOverlay - Pure UI component for displaying when camera is off
 * Shows user icon and "Camera tắt" text with size variants
 */
export function CameraOffOverlay({ pipSize }: CameraOffOverlayProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg">
      {/* User Icon */}
      <div
        className={`rounded-full bg-gray-800 flex items-center justify-center shadow-xl mb-2 ${
          pipSize === 'small' ? 'w-12 h-12' : pipSize === 'medium' ? 'w-16 h-16' : 'w-24 h-24'
        }`}
      >
        <User
          className={`text-gray-400 ${
            pipSize === 'small' ? 'w-6 h-6' : pipSize === 'medium' ? 'w-8 h-8' : 'w-12 h-12'
          }`}
        />
      </div>

      {/* Camera Off Label */}
      <div className="flex items-center gap-1">
        <VideoOff
          className={`text-red-400 ${
            pipSize === 'small' ? 'w-3 h-3' : pipSize === 'medium' ? 'w-4 h-4' : 'w-5 h-5'
          }`}
        />
        <p
          className={`text-white font-semibold ${
            pipSize === 'small' ? 'text-xs' : pipSize === 'medium' ? 'text-sm' : 'text-base'
          }`}
        >
          Camera tắt
        </p>
      </div>
    </div>
  );
}
