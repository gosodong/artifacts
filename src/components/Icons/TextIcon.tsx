import React from 'react';

interface TextIconProps {
  className?: string;
}

const TextIcon: React.FC<TextIconProps> = ({ className = "w-6 h-6" }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      d="M4 7 L20 7 M4 17 L20 17 M12 7 L12 17 M8 7 L8 4 M16 7 L16 4" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export default TextIcon;