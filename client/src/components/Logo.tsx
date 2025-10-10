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
        {/* Main circle background */}
        <circle cx="24" cy="24" r="22" className="fill-primary"/>
        
        {/* Book icon - simplified and clear */}
        <path 
          d="M14 16C14 14.8954 14.8954 14 16 14H20C21.1046 14 22 14.8954 22 16V32C22 33.1046 21.1046 34 20 34H16C14.8954 34 14 33.1046 14 32V16Z" 
          className="fill-primary-foreground"
        />
        <path 
          d="M26 16C26 14.8954 26.8954 14 28 14H32C33.1046 14 34 14.8954 34 16V32C34 33.1046 33.1046 34 32 34H28C26.8954 34 26 33.1046 26 32V16Z" 
          className="fill-primary-foreground"
        />
        
        {/* Book spine details */}
        <line x1="24" y1="14" x2="24" y2="34" className="stroke-primary" strokeWidth="2"/>
        <line x1="18" y1="20" x2="18" y2="28" className="stroke-primary" strokeWidth="1.5"/>
        <line x1="30" y1="20" x2="30" y2="28" className="stroke-primary" strokeWidth="1.5"/>
      </svg>
      <div className="flex flex-col leading-none">
        <span className="font-bold text-xl tracking-tight">LopHoc</span>
        <span className="text-xs text-primary font-semibold tracking-wide">.Online</span>
      </div>
    </div>
  );
}
