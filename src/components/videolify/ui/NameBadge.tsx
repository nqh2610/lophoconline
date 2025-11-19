'use client';

interface NameBadgeProps {
  userName: string;
  pipSize: 'small' | 'medium' | 'large';
}

/**
 * NameBadge - Pure UI component for displaying user name at bottom of video
 * Shows with semi-transparent background and size variants
 */
export function NameBadge({ userName, pipSize }: NameBadgeProps) {
  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
      <div
        className={`bg-black/70 backdrop-blur-sm rounded-full px-3 py-1 ${
          pipSize === 'small' ? 'text-xs' : pipSize === 'medium' ? 'text-sm' : 'text-base'
        }`}
      >
        <p className="text-white font-semibold whitespace-nowrap max-w-[120px] truncate">
          {userName}
        </p>
      </div>
    </div>
  );
}
