import React from 'react';

interface CircleIconProps {
  className?: string;
}

const CircleIcon: React.FC<CircleIconProps> = ({ className = "w-6 h-6" }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle 
      cx="12" 
      cy="12" 
      r="10" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export default CircleIcon;