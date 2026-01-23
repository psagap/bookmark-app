import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

/**
 * Spider-Verse style animated logo
 * Plays a dramatic intro animation on mount with:
 * - Cyan/Magenta/Red chromatic aberration (Spider-Verse colors)
 * - Squash and stretch anticipation
 * - Small hop with chromatic flash
 * - Bounce settle landing
 */
const SpiderVerseLogo = ({
  size = 32,
  showText = true,
  textSize = 'text-xl',
  className = '',
  interactive = false,
  onClick,
  isCollapsed = false,
  playIntro = true,
}) => {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [isTextHovered, setIsTextHovered] = useState(false);

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Spider-Verse colors: Cyan, Magenta, Red
  const [chromatic, setChromatic] = useState({
    cyan: { x: 0, y: 0, opacity: 0 },
    magenta: { x: 0, y: 0, opacity: 0 },
    red: { x: 0, y: 0, opacity: 0 },
  });

  // Jitter state
  const [jitter, setJitter] = useState({ x: 0, y: 0 });

  // Main logo transform state
  const [logoTransform, setLogoTransform] = useState({
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotate: -12,
  });

  // Play intro animation on mount
  useEffect(() => {
    if (!playIntro || hasPlayed || prefersReducedMotion) {
      if (prefersReducedMotion) {
        setHasPlayed(true);
      }
      return;
    }

    const runAnimation = async () => {
      setIsAnimating(true);
      setHasPlayed(true);

      // ===== PHASE 1: Spider-Verse glitch pulses (0-350ms) =====
      for (let pulse = 0; pulse < 4; pulse++) {
        const intensity = 1.5 + Math.random() * 2; // 1.5-3.5px offset (smaller)
        setChromatic({
          cyan: {
            x: -intensity + Math.random(),
            y: -intensity * 0.4,
            opacity: 0.85
          },
          magenta: {
            x: intensity + Math.random(),
            y: intensity * 0.3,
            opacity: 0.85
          },
          red: {
            x: Math.random() * 1.5,
            y: intensity * 0.5,
            opacity: 0.7
          },
        });

        setJitter({
          x: (Math.random() - 0.5) * 3,
          y: (Math.random() - 0.5) * 2,
        });

        await sleep(50 + Math.random() * 25);

        // Brief reset between pulses
        setChromatic({
          cyan: { x: 0, y: 0, opacity: 0.2 },
          magenta: { x: 0, y: 0, opacity: 0.2 },
          red: { x: 0, y: 0, opacity: 0 },
        });
        setJitter({ x: 0, y: 0 });

        await sleep(15);
      }

      // ===== PHASE 2: Snap to clean (350-450ms) =====
      setChromatic({
        cyan: { x: 0, y: 0, opacity: 0 },
        magenta: { x: 0, y: 0, opacity: 0 },
        red: { x: 0, y: 0, opacity: 0 },
      });
      setJitter({ x: 0, y: 0 });
      await sleep(80);

      // ===== PHASE 3: Anticipation squash (450-550ms) =====
      setLogoTransform(prev => ({
        ...prev,
        scaleX: 1.05,
        scaleY: 0.94,
        y: 1,
      }));
      await sleep(100);

      // ===== PHASE 4: Small hop with chromatic flash (550-750ms) =====
      setLogoTransform(prev => ({
        ...prev,
        y: -4, // Small hop that stays on screen
        scaleX: 0.97,
        scaleY: 1.04,
      }));

      // Spider-Verse chromatic flash
      setChromatic({
        cyan: { x: -3, y: -1.5, opacity: 0.9 },
        magenta: { x: 3, y: 1, opacity: 0.9 },
        red: { x: 1, y: 2, opacity: 0.75 },
      });

      await sleep(60);

      // Second pulse
      setChromatic({
        cyan: { x: -4, y: -2, opacity: 0.95 },
        magenta: { x: 4, y: 1.5, opacity: 0.95 },
        red: { x: 1.5, y: 2.5, opacity: 0.8 },
      });

      await sleep(50);

      // ===== PHASE 5: Wobble (750-900ms) =====
      const wobbleFrames = [
        { x: -2.5, y: 0 },
        { x: -3, y: -2 },
        { x: 2.5, y: -0.5 },
        { x: 1, y: 1 },
        { x: 0, y: 0 },
      ];

      for (const frame of wobbleFrames) {
        setJitter(frame);
        setChromatic({
          cyan: { x: frame.x * 0.4, y: frame.y * 0.4, opacity: 0.35 },
          magenta: { x: -frame.x * 0.4, y: -frame.y * 0.4, opacity: 0.35 },
          red: { x: 0, y: 0, opacity: 0 },
        });
        await sleep(40);
      }

      // Clear chromatic
      setChromatic({
        cyan: { x: 0, y: 0, opacity: 0 },
        magenta: { x: 0, y: 0, opacity: 0 },
        red: { x: 0, y: 0, opacity: 0 },
      });

      // ===== PHASE 6: Land and settle (900-1100ms) =====
      setLogoTransform(prev => ({
        ...prev,
        y: 2,
        scaleX: 1.03,
        scaleY: 0.97,
      }));
      await sleep(60);

      setLogoTransform(prev => ({
        ...prev,
        y: -1,
        scaleX: 0.99,
        scaleY: 1.01,
      }));
      await sleep(50);

      // Final settle
      setLogoTransform({
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotate: -12,
      });
      setJitter({ x: 0, y: 0 });

      await sleep(80);
      setIsAnimating(false);
    };

    const timer = setTimeout(runAnimation, 200);
    return () => clearTimeout(timer);
  }, [playIntro, hasPlayed, prefersReducedMotion]);

  // Handle collapsed state and hover animation (logo icon only)
  useEffect(() => {
    if (hasPlayed && !isAnimating) {
      let targetRotate = -12;
      let targetY = 0;

      if (isCollapsed) {
        targetRotate = 15;
        targetY = -3;
      } else if (isLogoHovered) {
        targetRotate = 8;
        targetY = -2;
      }

      setLogoTransform(prev => ({
        ...prev,
        y: targetY,
        rotate: targetRotate,
      }));
    }
  }, [isCollapsed, isLogoHovered, hasPlayed, isAnimating]);

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  return (
    <div
      className={`flex items-center select-none ${interactive ? 'cursor-pointer' : ''} ${className}`}
      onClick={interactive ? onClick : undefined}
    >
      {/* Bird logo with Spider-Verse effect */}
      <div
        className="relative flex-shrink-0"
        onMouseEnter={() => setIsLogoHovered(true)}
        onMouseLeave={() => setIsLogoHovered(false)}
        style={{
          marginRight: showText ? '-2px' : 0,
          transformOrigin: 'center bottom',
          transform: `
            translateX(${jitter.x}px)
            translateY(${logoTransform.y + jitter.y}px)
            scaleX(${logoTransform.scaleX})
            scaleY(${logoTransform.scaleY})
            rotate(${logoTransform.rotate}deg)
          `,
          transition: isAnimating ? 'transform 0.06s ease-out' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Cyan layer (Spider-Verse blue) */}
        <img
          src="/assets/cardinal-logo.png?v=3"
          alt=""
          aria-hidden="true"
          width={size}
          height={size}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            filter: 'brightness(0) invert(1) sepia(1) saturate(10) hue-rotate(180deg) brightness(1.2)',
            mixBlendMode: 'screen',
            opacity: chromatic.cyan.opacity,
            transform: `translate(${chromatic.cyan.x}px, ${chromatic.cyan.y}px)`,
            transition: 'transform 0.04s, opacity 0.04s',
            pointerEvents: 'none',
          }}
        />

        {/* Magenta layer (Spider-Verse pink) */}
        <img
          src="/assets/cardinal-logo.png?v=3"
          alt=""
          aria-hidden="true"
          width={size}
          height={size}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            filter: 'brightness(0) invert(1) sepia(1) saturate(10) hue-rotate(300deg) brightness(1.1)',
            mixBlendMode: 'screen',
            opacity: chromatic.magenta.opacity,
            transform: `translate(${chromatic.magenta.x}px, ${chromatic.magenta.y}px)`,
            transition: 'transform 0.04s, opacity 0.04s',
            pointerEvents: 'none',
          }}
        />

        {/* Red layer (Spider-Verse red accent) */}
        <img
          src="/assets/cardinal-logo.png?v=3"
          alt=""
          aria-hidden="true"
          width={size}
          height={size}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            filter: 'brightness(0) invert(1) sepia(1) saturate(10) hue-rotate(0deg) brightness(1.1)',
            mixBlendMode: 'screen',
            opacity: chromatic.red.opacity,
            transform: `translate(${chromatic.red.x}px, ${chromatic.red.y}px)`,
            transition: 'transform 0.04s, opacity 0.04s',
            pointerEvents: 'none',
          }}
        />

        {/* Main logo (white) */}
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
            filter: 'brightness(0) invert(1)',
            position: 'relative',
            zIndex: 1,
          }}
          className="object-contain"
          initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        />
      </div>

      {/* Text portion - separate hover effect */}
      {showText && (
        <motion.span
          className={`${textSize} font-medium tracking-tight text-white`}
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            marginLeft: size * 0.25,
            letterSpacing: '-0.02em',
          }}
          onMouseEnter={() => setIsTextHovered(true)}
          onMouseLeave={() => setIsTextHovered(false)}
          initial={{ opacity: prefersReducedMotion ? 1 : 0, x: prefersReducedMotion ? 0 : -10 }}
          animate={{
            opacity: 1,
            x: 0,
            letterSpacing: isTextHovered ? '0.02em' : '-0.02em',
            color: isTextHovered ? 'rgb(167, 139, 250)' : 'rgb(255, 255, 255)', // violet-400 on hover
          }}
          transition={{
            opacity: { duration: 0.4, delay: 0.6 },
            x: { duration: 0.4, delay: 0.6 },
            letterSpacing: { duration: 0.2 },
            color: { duration: 0.2 },
          }}
        >
          thinkback
        </motion.span>
      )}
    </div>
  );
};

export default SpiderVerseLogo;
