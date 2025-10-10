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
    <div className={`flex items-center gap-2 ${className}`}>
      <svg 
        className={sizes[size]} 
        viewBox="0 0 40 40" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background circle */}
        <rect width="40" height="40" rx="8" className="fill-primary"/>
        
        {/* Graduation cap (mortarboard) */}
        {/* Cap base */}
        <path 
          d="M20 14L8 19L20 24L32 19L20 14Z" 
          className="fill-primary-foreground"
        />
        {/* Cap top */}
        <path 
          d="M20 14L8 19L20 24L32 19L20 14Z" 
          className="fill-primary-foreground opacity-90"
        />
        {/* Tassel */}
        <circle cx="32" cy="19" r="1.5" className="fill-chart-5"/>
        <line x1="32" y1="20.5" x2="32" y2="24" stroke="currentColor" strokeWidth="0.8" className="text-chart-5"/>
        
        {/* Books/Students representing classroom */}
        <rect x="17" y="25" width="6" height="8" rx="0.5" className="fill-primary-foreground opacity-80"/>
        <line x1="17" y1="28" x2="23" y2="28" className="stroke-primary" strokeWidth="0.5"/>
        <line x1="17" y1="30" x2="23" y2="30" className="stroke-primary" strokeWidth="0.5"/>
      </svg>
      <div className="flex flex-col leading-none">
        <span className="font-bold text-xl">LopHoc</span>
        <span className="text-xs text-primary font-semibold">.Online</span>
      </div>
    </div>
  );
}
