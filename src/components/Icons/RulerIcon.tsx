import React from 'react';

interface RulerIconProps {
  className?: string;
}

const RulerIcon: React.FC<RulerIconProps> = ({ className = "w-6 h-6" }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      d="M3 6 L21 6 M3 10 L21 10 M3 14 L21 14 M3 18 L21 18 M7 4 L7 20 M11 4 L11 20 M15 4 L15 20 M19 4 L19 20" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export default RulerIcon;