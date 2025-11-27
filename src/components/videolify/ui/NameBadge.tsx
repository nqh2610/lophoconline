'use client';

interface NameBadgeProps {
  userName: string;
  pipSize: 'small' | 'medium' | 'large';
  role?: 'tutor' | 'student' | string;
}

/**
 * Shorten name for display:
 * - 1 word: show as is
 * - 2 words: show both  
 * - 3+ words: show first + last (e.g. "Nguyễn Văn An" -> "Nguyễn An")
 * - Limit based on pipSize to avoid covering camera
 */
function shortenName(fullName: string, pipSize: 'small' | 'medium' | 'large'): string {
  if (!fullName || fullName.trim() === '') return '';
  
  const parts = fullName.trim().split(/\s+/);
  const maxLength = pipSize === 'small' ? 10 : pipSize === 'medium' ? 14 : 18;
  
  if (parts.length <= 2) {
    // 1-2 words: keep as is, but truncate if too long
    const name = parts.join(' ');
    if (name.length <= maxLength) return name;
    // Too long, just show last word (first name in Vietnamese)
    return parts[parts.length - 1].slice(0, maxLength);
  }
  
  // 3+ words: show first + last (e.g. "Nguyễn Văn An" -> "Nguyễn An")
  const shortened = `${parts[0]} ${parts[parts.length - 1]}`;
  
  if (shortened.length <= maxLength) return shortened;
  
  // Still too long, just show first name (last word in Vietnamese)
  return parts[parts.length - 1].slice(0, maxLength);
}

/**
 * NameBadge - Compact, semi-transparent name overlay for video PiP
 * Shows only user name without role label
 * Positioned at bottom-left with minimal footprint
 */
export function NameBadge({ userName, pipSize }: NameBadgeProps) {
  const displayName = shortenName(userName, pipSize);
  
  if (!displayName) return null;
  
  return (
    <div className="absolute bottom-0.5 left-0.5 z-10 pointer-events-none">
      <p
        className={`text-white font-medium drop-shadow-lg bg-black/40 rounded px-1 py-0.5 leading-tight ${
          pipSize === 'small' ? 'text-[9px]' : pipSize === 'medium' ? 'text-[11px]' : 'text-xs'
        }`}
      >
        {displayName}
      </p>
    </div>
  );
}
