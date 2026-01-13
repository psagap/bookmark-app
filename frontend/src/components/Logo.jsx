import React from 'react';

// Cardinal Logo for Curated Lounge
// Version 2: Updated cardinal bird design
const Logo = ({ size = 25, className = '' }) => {
  return (
    <img
      src="/assets/cardinal-logo.png?v=2"
      alt="Curated Lounge"
      width={size}
      height={size}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      className={`object-contain ${className}`}
    />
  );
};

export default Logo;
