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
        
        {/* Chalkboard/Blackboard */}
        <rect 
          x="10" 
          y="14" 
          width="28" 
          height="20" 
          rx="1" 
          className="fill-primary-foreground"
        />
        
        {/* Chalkboard border/frame - darker for contrast */}
        <rect 
          x="10" 
          y="14" 
          width="28" 
          height="20" 
          rx="1" 
          className="stroke-primary" 
          strokeWidth="1.5"
          fill="none"
        />
        
        {/* Math equation on chalkboard: "A+" */}
        <text 
          x="24" 
          y="27" 
          className="fill-background" 
          fontSize="10" 
          fontWeight="bold" 
          textAnchor="middle"
          fontFamily="Arial, sans-serif"
        >
          A+
        </text>
        
        {/* Chalk holder at bottom */}
        <rect 
          x="16" 
          y="34" 
          width="16" 
          height="2" 
          rx="1" 
          className="fill-primary-foreground opacity-80"
        />
      </svg>
      <div className="flex flex-col leading-none">
        <span className="font-bold text-xl tracking-tight">LopHoc</span>
        <span className="text-xs text-primary font-semibold tracking-wide">.Online</span>
      </div>
    </div>
  );
}
