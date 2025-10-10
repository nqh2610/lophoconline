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
        <rect width="40" height="40" rx="8" className="fill-primary"/>
        <path 
          d="M12 12h16v3H12v-3zm0 6h16v3H12v-3zm0 6h10v3H12v-3z" 
          className="fill-primary-foreground"
        />
        <circle 
          cx="28" 
          cy="28" 
          r="6" 
          className="fill-chart-2"
        />
        <path 
          d="M26 28l2 2 4-4" 
          stroke="white" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex flex-col leading-none">
        <span className="font-bold text-xl">LopHoc</span>
        <span className="text-xs text-primary font-semibold">.Online</span>
      </div>
    </div>
  );
}
