import React from 'react';

interface RupeeIconProps {
  className?: string;
  size?: number;
}

export const RupeeIcon: React.FC<RupeeIconProps> = ({ className = "h-4 w-4", size }) => {
  const sizeProps = size ? { width: size, height: size } : {};
  
  return (
    <svg
      {...sizeProps}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3h12" />
      <path d="M6 8h12" />
      <path d="m6 13 8.5 8" />
      <path d="M6 13h3" />
      <path d="M9 13c6.667 0 6.667-10 0-10" />
    </svg>
  );
};

export default RupeeIcon;