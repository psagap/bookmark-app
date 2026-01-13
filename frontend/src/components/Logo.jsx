import React from 'react';
import { motion } from 'framer-motion';

// Unified brand mark - bird logo + thinkback text as one cohesive unit
const Logo = ({
  size = 32,
  showText = true,
  textSize = 'text-xl',
  className = '',
  interactive = false,
  onClick,
  isCollapsed = false, // Triggers the "alive" animation
}) => {
  return (
    <div
      className={`flex items-center select-none ${interactive ? 'cursor-pointer group/logo' : ''} ${className}`}
      onClick={interactive ? onClick : undefined}
    >
      {/* Bird logo with animations */}
      <motion.div
        className="relative flex-shrink-0"
        initial={false}
        animate={{
          // When collapsed: bounce up then rotate right (looking forward)
          y: isCollapsed ? [0, -6, -3] : 0,
          rotate: isCollapsed ? 15 : -12,
        }}
        transition={{
          y: {
            duration: 0.4,
            times: [0, 0.4, 1],
            ease: "easeOut",
          },
          rotate: {
            duration: 0.35,
            delay: 0.15,
            ease: [0.4, 0, 0.2, 1],
          },
        }}
        style={{
          marginRight: showText ? '-2px' : 0,
          transformOrigin: 'center bottom',
        }}
      >
        <motion.img
          src="/assets/cardinal-logo.png?v=3"
          alt="thinkback"
          width={size}
          height={size}
          style={{
            width: size,
            height: size,
            minWidth: size,
            minHeight: size,
            filter: 'brightness(0) invert(1)'
          }}
          className={`object-contain ${interactive ? 'group-hover/logo:scale-110' : ''}`}
          animate={{
            scale: isCollapsed ? [1, 1.08, 1] : 1,
          }}
          transition={{
            scale: {
              duration: 0.4,
              times: [0, 0.3, 1],
              ease: "easeOut",
            },
          }}
        />
      </motion.div>

      {/* Text portion - horizontal */}
      {showText && (
        <span
          className={`${textSize} font-medium tracking-tight text-white transition-opacity duration-200`}
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            marginLeft: size * 0.25,
            letterSpacing: '-0.02em'
          }}
        >
          thinkback
        </span>
      )}
    </div>
  );
};

export default Logo;
