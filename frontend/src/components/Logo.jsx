import React from 'react';

// Custom Logo for Curated Lounge
// Concept: A stylized brain/mind with neural connections forming a bookmark ribbon
const Logo = ({ size = 44, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background glow */}
      <defs>
        <radialGradient id="logoGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--gruvbox-yellow)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--gruvbox-yellow)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--gruvbox-yellow)" />
          <stop offset="50%" stopColor="var(--gruvbox-orange)" />
          <stop offset="100%" stopColor="var(--gruvbox-red)" />
        </linearGradient>
        <linearGradient id="bookmarkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--gruvbox-aqua)" />
          <stop offset="100%" stopColor="var(--gruvbox-blue)" />
        </linearGradient>
      </defs>

      {/* Outer glow circle */}
      <circle cx="32" cy="32" r="30" fill="url(#logoGlow)" />

      {/* Brain outline - stylized with curves */}
      <g transform="translate(12, 10)">
        {/* Left hemisphere */}
        <path
          d="M20 4C14 4 9 8 8 14C6 14 4 16 4 19C4 22 6 24 8 24C8 28 10 32 14 34C14 38 16 42 20 44"
          stroke="url(#brainGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />
        {/* Right hemisphere */}
        <path
          d="M20 4C26 4 31 8 32 14C34 14 36 16 36 19C36 22 34 24 32 24C32 28 30 32 26 34C26 38 24 42 20 44"
          stroke="url(#brainGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />

        {/* Neural connections / folds */}
        <path
          d="M12 16C14 18 16 18 18 16"
          stroke="var(--gruvbox-yellow)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
        <path
          d="M22 16C24 18 26 18 28 16"
          stroke="var(--gruvbox-yellow)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
        <path
          d="M14 24C16 26 18 26 20 24C22 26 24 26 26 24"
          stroke="var(--gruvbox-orange)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />

        {/* Center bookmark ribbon */}
        <path
          d="M17 20L17 38L20 34L23 38L23 20"
          stroke="url(#bookmarkGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.9"
        />

        {/* Sparkle dots - memories/ideas */}
        <circle cx="10" cy="20" r="1.5" fill="var(--gruvbox-yellow)" opacity="0.8" />
        <circle cx="30" cy="20" r="1.5" fill="var(--gruvbox-yellow)" opacity="0.8" />
        <circle cx="20" cy="10" r="1.5" fill="var(--gruvbox-orange)" opacity="0.8" />
      </g>
    </svg>
  );
};

export default Logo;
