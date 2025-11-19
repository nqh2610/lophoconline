'use client';

import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, EyeOff } from 'lucide-react';

interface PiPControlBarProps {
  pipSize: 'small' | 'medium' | 'large';
  onResize: () => void;
  onHide: () => void;
}

/**
 * PiPControlBar - Pure UI component for PiP resize and hide controls
 * Shows on hover with semi-transparent background
 */
export function PiPControlBar({ pipSize, onResize, onHide }: PiPControlBarProps) {
  return (
    <div className="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
      {/* Resize Button */}
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onResize();
        }}
        variant="ghost"
        size="sm"
        className={`bg-black/50 hover:bg-black/70 text-white rounded-full ${
          pipSize === 'small' ? 'h-6 w-6 p-0' : 'h-7 w-7 p-0'
        }`}
      >
        {pipSize === 'large' ? (
          <Minimize2 className={pipSize === 'small' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        ) : (
          <Maximize2 className={pipSize === 'small' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        )}
      </Button>

      {/* Hide Button */}
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onHide();
        }}
        variant="ghost"
        size="sm"
        className={`bg-black/50 hover:bg-black/70 text-white rounded-full ${
          pipSize === 'small' ? 'h-6 w-6 p-0' : 'h-7 w-7 p-0'
        }`}
      >
        <EyeOff className={pipSize === 'small' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      </Button>
    </div>
  );
}
