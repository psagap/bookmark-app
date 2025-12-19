import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

/**
 * AddDropzoneCard Component
 * A modern dashed dropzone-style card that invites users to add a note.
 * Features a static dashed border with subtle hover glow and icon animation.
 * No infinite/looping animations for optimal performance.
 */

const AddDropzoneCard = ({ onAddNote }) => {
  const [isHovered, setIsHovered] = useState(false);

  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const springConfig = {
    type: 'spring',
    stiffness: prefersReducedMotion ? 300 : 260,
    damping: prefersReducedMotion ? 30 : 20
  };

  return (
    <div
      className="relative break-inside-avoid mb-4"
      role="button"
      tabIndex={0}
      aria-label="Add a note"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAddNote?.();
        }
      }}
    >
      <motion.div
        className="relative w-full cursor-pointer overflow-hidden rounded-2xl"
        style={{ height: '120px' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        onClick={() => onAddNote?.()}
        initial={{ opacity: 0, y: 10 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          scale: isHovered && !prefersReducedMotion ? 1.02 : 1,
        }}
        whileTap={{ scale: 0.98 }}
        transition={springConfig}
      >
        {/* Background */}
        <div 
          className="absolute inset-0 rounded-2xl transition-all duration-300"
          style={{
            background: isHovered 
              ? 'linear-gradient(135deg, var(--theme-bg-light) 0%, var(--theme-bg) 100%)'
              : 'var(--theme-bg-dark)',
          }}
        />

        {/* Static dashed border - CSS-based for performance */}
        <div 
          className="absolute inset-0 rounded-2xl pointer-events-none transition-all duration-300"
          style={{
            border: '2px dashed',
            borderColor: isHovered 
              ? 'var(--theme-primary)' 
              : 'var(--theme-bg-lighter)',
            opacity: isHovered ? 0.8 : 0.5,
          }}
        />

        {/* Subtle inner glow on hover */}
        <div 
          className="absolute inset-0 rounded-2xl pointer-events-none transition-all duration-300"
          style={{
            boxShadow: isHovered 
              ? 'inset 0 0 20px rgba(var(--glow-color-rgb), 0.1), 0 4px 16px rgba(0,0,0,0.15)'
              : 'none',
          }}
        />

        {/* Inner content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
          {/* Icon container */}
          <motion.div
            className="relative"
            animate={{
              y: isHovered && !prefersReducedMotion ? -3 : 0,
              scale: isHovered ? 1.1 : 1,
            }}
            transition={springConfig}
          >
            {/* Plus icon with rotation on hover */}
            <motion.div
              className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300"
              style={{
                background: isHovered 
                  ? 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-secondary) 100%)'
                  : 'var(--theme-bg-lighter)',
                boxShadow: isHovered 
                  ? '0 4px 16px rgba(var(--glow-color-rgb), 0.35)'
                  : '0 2px 6px rgba(0,0,0,0.25)',
              }}
              animate={{
                rotate: isHovered && !prefersReducedMotion ? 90 : 0,
              }}
              transition={springConfig}
            >
              <Plus 
                className="w-5 h-5 transition-colors duration-300"
                style={{ 
                  color: isHovered ? 'var(--theme-bg-darkest)' : 'var(--theme-fg-muted)',
                  strokeWidth: 2.5,
                }}
              />
            </motion.div>
          </motion.div>

          {/* Text - simple color/weight change on hover */}
          <motion.span
            className="text-xs tracking-wide uppercase transition-all duration-300"
            style={{ 
              color: isHovered ? 'var(--theme-primary-light)' : 'var(--theme-fg-muted)',
              fontWeight: isHovered ? 600 : 500,
            }}
          >
            {isHovered ? 'Click to add' : 'Add note'}
          </motion.span>
        </div>

        {/* Focus ring */}
        <div
          className="absolute inset-0 rounded-2xl ring-0 focus-within:ring-2 focus-within:ring-amber-500/50 focus-within:ring-offset-2 focus-within:ring-offset-[var(--theme-bg-dark)] pointer-events-none"
        />
      </motion.div>
    </div>
  );
};

export default AddDropzoneCard;

