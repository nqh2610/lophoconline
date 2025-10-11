interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-12'
};

export function Logo({ className = '', size = 'md' }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg 
        className={sizes[size]} 
        viewBox="0 0 64 64" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradient for modern look */}
          <linearGradient id="capGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className="[stop-color:hsl(var(--primary))]" stopOpacity="1" />
            <stop offset="100%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0.8" />
          </linearGradient>
          
          {/* Shadow for depth */}
          <filter id="shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2"/>
          </filter>
        </defs>
        
        {/* Background circle with gradient */}
        <circle cx="32" cy="32" r="28" fill="url(#capGradient)" filter="url(#shadow)"/>
        
        {/* Graduation cap - mortarboard top (larger and more visible) */}
        <path 
          d="M 12 20 L 32 14 L 52 20 L 32 26 Z" 
          className="fill-primary-foreground"
          opacity="1"
        />
        
        {/* Cap shadow for depth */}
        <path 
          d="M 32 26 L 52 20 L 52 21 L 32 27 Z" 
          className="fill-primary-foreground"
          opacity="0.5"
        />
        
        {/* Graduation cap base - top edge */}
        <ellipse 
          cx="32" 
          cy="28" 
          rx="13" 
          ry="3.5" 
          className="fill-primary-foreground"
          opacity="0.95"
        />
        
        {/* Cap body with volume */}
        <path 
          d="M 19 28 L 19 34 Q 32 38 45 34 L 45 28 Q 32 31 19 28" 
          className="fill-primary-foreground"
          opacity="0.9"
        />
        
        {/* Tassel with refined look */}
        <line 
          x1="52" 
          y1="20" 
          x2="55" 
          y2="26" 
          className="stroke-primary-foreground" 
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle 
          cx="55" 
          cy="27.5" 
          r="2.5" 
          className="fill-primary-foreground"
        />
        
        {/* "10" text - positioned clearly below cap in lower half */}
        <text 
          x="32" 
          y="50" 
          className="fill-primary-foreground" 
          fontSize="13" 
          fontWeight="800" 
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.5"
        >
          10
        </text>
        
        {/* "điểm" text - positioned below "10" */}
        <text 
          x="32" 
          y="58" 
          className="fill-primary-foreground" 
          fontSize="6" 
          fontWeight="600" 
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.3"
          opacity="0.9"
        >
          điểm
        </text>
      </svg>
      <div className="flex flex-col leading-none">
        <span className="font-bold text-xl tracking-tight">LopHoc</span>
        <span className="text-xs text-primary font-semibold tracking-wide">.Online</span>
      </div>
    </div>
  );
}
