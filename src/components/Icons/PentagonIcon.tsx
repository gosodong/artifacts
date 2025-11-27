import React from 'react';

interface PentagonIconProps {
  className?: string;
}

const PentagonIcon: React.FC<PentagonIconProps> = ({ className = "w-6 h-6" }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      d="M12 2 L20 8 L16 18 L8 18 L4 8 Z" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export default PentagonIcon;