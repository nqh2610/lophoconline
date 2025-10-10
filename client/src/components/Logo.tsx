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
        
        {/* Computer/Laptop Screen */}
        <rect 
          x="12" 
          y="16" 
          width="24" 
          height="16" 
          rx="1" 
          className="stroke-primary-foreground fill-background"
          strokeWidth="1.5"
        />
        
        {/* Screen display with "10 điểm" */}
        <text 
          x="24" 
          y="26" 
          className="fill-primary" 
          fontSize="9" 
          fontWeight="bold" 
          textAnchor="middle"
          fontFamily="Arial, sans-serif"
        >
          10 điểm
        </text>
        
        {/* Laptop base/keyboard */}
        <path 
          d="M 10 32 L 12 34 L 36 34 L 38 32 Z" 
          className="fill-primary-foreground"
        />
        
        {/* Stand/hinge */}
        <rect 
          x="23" 
          y="32" 
          width="2" 
          height="2" 
          className="fill-primary-foreground"
        />
      </svg>
      <div className="flex flex-col leading-none">
        <span className="font-bold text-xl tracking-tight">LopHoc</span>
        <span className="text-xs text-primary font-semibold tracking-wide">.Online</span>
      </div>
    </div>
  );
}
