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
        
        {/* Graduation cap - mortarboard top (clear and prominent in upper half) */}
        <path 
          d="M 14 18 L 32 12 L 50 18 L 32 24 Z" 
          className="fill-primary-foreground"
          opacity="0.95"
        />
        
        {/* Cap shadow for depth */}
        <path 
          d="M 32 24 L 50 18 L 50 19 L 32 25 Z" 
          className="fill-primary-foreground"
          opacity="0.4"
        />
        
        {/* Graduation cap base - top edge */}
        <ellipse 
          cx="32" 
          cy="26" 
          rx="12" 
          ry="3" 
          className="fill-primary-foreground"
          opacity="0.9"
        />
        
        {/* Cap body with volume */}
        <path 
          d="M 20 26 L 20 32 Q 32 36 44 32 L 44 26 Q 32 29 20 26" 
          className="fill-primary-foreground"
          opacity="0.85"
        />
        
        {/* Tassel with refined look */}
        <line 
          x1="50" 
          y1="18" 
          x2="53" 
          y2="24" 
          className="stroke-primary-foreground" 
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle 
          cx="53" 
          cy="25.5" 
          r="2" 
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
