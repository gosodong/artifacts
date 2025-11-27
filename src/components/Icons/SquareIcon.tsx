import React from 'react';

interface SquareIconProps {
  className?: string;
}

const SquareIcon: React.FC<SquareIconProps> = ({ className = "w-6 h-6" }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect 
      x="4" 
      y="4" 
      width="16" 
      height="16" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export default SquareIcon;