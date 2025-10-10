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
        viewBox="0 0 48 48" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Circular background */}
        <circle cx="24" cy="24" r="22" className="fill-primary"/>
        
        {/* Graduation cap - mortarboard (top square) */}
        <path 
          d="M 14 20 L 24 16 L 34 20 L 24 24 Z" 
          className="fill-primary-foreground"
        />
        
        {/* Graduation cap - base */}
        <ellipse 
          cx="24" 
          cy="26" 
          rx="8" 
          ry="3" 
          className="fill-primary-foreground"
        />
        
        {/* Cap bottom part */}
        <path 
          d="M 16 26 L 16 30 Q 24 33 32 30 L 32 26" 
          className="fill-primary-foreground"
        />
        
        {/* Tassel */}
        <line 
          x1="34" 
          y1="20" 
          x2="36" 
          y2="24" 
          className="stroke-primary-foreground" 
          strokeWidth="1.5"
        />
        <circle 
          cx="36" 
          cy="25" 
          r="1.5" 
          className="fill-primary-foreground"
        />
        
        {/* "10 điểm" text */}
        <text 
          x="24" 
          y="20" 
          className="fill-primary" 
          fontSize="7" 
          fontWeight="bold" 
          textAnchor="middle"
          fontFamily="Arial, sans-serif"
        >
          10 điểm
        </text>
      </svg>
      <div className="flex flex-col leading-none">
        <span className="font-bold text-xl tracking-tight">LopHoc</span>
        <span className="text-xs text-primary font-semibold tracking-wide">.Online</span>
      </div>
    </div>
  );
}
