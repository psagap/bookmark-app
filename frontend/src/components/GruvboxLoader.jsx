import React from 'react';
import { cn } from '@/lib/utils';

/**
 * GruvboxLoader - A theme-aware loading animation
 *
 * Variants:
 * - dots: Three pulsing dots (default, good for inline/small spaces)
 * - orbit: Orbiting circles (good for larger loading states)
 * - pulse: Single pulsing circle with glow (minimal, elegant)
 * - bars: Equalizer-style animated bars (good for media loading)
 * - spinner: Rotating gradient arc
 */

// Get theme colors from CSS variables or fall back to gruvbox
const getThemeColors = () => {
    if (typeof window === 'undefined') {
        // Fallback for SSR
        return {
            primary: '#fabd2f',
            primaryDark: '#d79921',
            secondary: '#fe8019',
            secondaryDark: '#d65d0e',
            accent: '#fb4934',
            bg: '#1d2021',
            bgLight: '#3c3836',
        };
    }

    const styles = getComputedStyle(document.documentElement);

    return {
        primary: styles.getPropertyValue('--theme-primary-light').trim() || '#fabd2f',
        primaryDark: styles.getPropertyValue('--theme-primary').trim() || '#d79921',
        secondary: styles.getPropertyValue('--theme-secondary-light').trim() || '#fe8019',
        secondaryDark: styles.getPropertyValue('--theme-secondary').trim() || '#d65d0e',
        accent: styles.getPropertyValue('--theme-accent-1').trim() || '#fb4934',
        bg: styles.getPropertyValue('--theme-bg-darkest').trim() || '#1d2021',
        bgLight: styles.getPropertyValue('--theme-bg-light').trim() || '#3c3836',
    };
};

// Dots variant - three pulsing dots
const DotsLoader = ({ size = 'md', className, colors }) => {
    const sizeClasses = {
        sm: 'w-1.5 h-1.5',
        md: 'w-2 h-2',
        lg: 'w-3 h-3',
    };

    const gapClasses = {
        sm: 'gap-1',
        md: 'gap-1.5',
        lg: 'gap-2',
    };

    return (
        <div className={cn('flex items-center', gapClasses[size], className)}>
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className={cn(
                        'rounded-full',
                        sizeClasses[size]
                    )}
                    style={{
                        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                        animation: `gruvbox-dot-pulse 1.4s ease-in-out infinite`,
                        animationDelay: `${i * 0.16}s`,
                        boxShadow: `0 0 8px ${colors.primary}40`,
                    }}
                />
            ))}
        </div>
    );
};

// Orbit variant - orbiting circles
const OrbitLoader = ({ size = 'md', className, colors }) => {
    const sizeMap = {
        sm: 24,
        md: 40,
        lg: 56,
    };

    const orbitSize = sizeMap[size];
    const dotSize = orbitSize * 0.2;

    return (
        <div
            className={cn('relative', className)}
            style={{ width: orbitSize, height: orbitSize }}
        >
            {/* Outer glow ring */}
            <div
                className="absolute inset-0 rounded-full"
                style={{
                    border: `1px solid ${colors.primary}15`,
                    boxShadow: `0 0 20px ${colors.secondary}10 inset`,
                }}
            />

            {/* Orbiting dots */}
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className="absolute inset-0"
                    style={{
                        animation: `gruvbox-orbit 1.5s linear infinite`,
                        animationDelay: `${i * -0.5}s`,
                    }}
                >
                    <div
                        className="absolute rounded-full"
                        style={{
                            width: dotSize,
                            height: dotSize,
                            top: 0,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: i === 0
                                ? colors.primary
                                : i === 1
                                    ? colors.secondary
                                    : colors.secondaryDark,
                            boxShadow: `0 0 ${dotSize}px ${i === 0 ? colors.primary : colors.secondary}60`,
                            opacity: 1 - (i * 0.25),
                        }}
                    />
                </div>
            ))}

            {/* Center dot */}
            <div
                className="absolute rounded-full"
                style={{
                    width: dotSize * 0.6,
                    height: dotSize * 0.6,
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                    animation: 'gruvbox-pulse-glow 2s ease-in-out infinite',
                }}
            />
        </div>
    );
};

// Pulse variant - single pulsing circle with glow
const PulseLoader = ({ size = 'md', className, colors }) => {
    const sizeMap = {
        sm: 20,
        md: 32,
        lg: 48,
    };

    const pulseSize = sizeMap[size];

    return (
        <div
            className={cn('relative', className)}
            style={{ width: pulseSize, height: pulseSize }}
        >
            {/* Outer pulse ring */}
            <div
                className="absolute inset-0 rounded-full"
                style={{
                    border: `2px solid ${colors.primary}`,
                    animation: 'gruvbox-ring-pulse 1.5s ease-out infinite',
                }}
            />

            {/* Second ring with delay */}
            <div
                className="absolute inset-0 rounded-full"
                style={{
                    border: `2px solid ${colors.secondary}`,
                    animation: 'gruvbox-ring-pulse 1.5s ease-out infinite',
                    animationDelay: '0.5s',
                }}
            />

            {/* Center core */}
            <div
                className="absolute rounded-full"
                style={{
                    width: pulseSize * 0.4,
                    height: pulseSize * 0.4,
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                    boxShadow: `0 0 ${pulseSize * 0.5}px ${colors.primary}50`,
                    animation: 'gruvbox-core-pulse 1.5s ease-in-out infinite',
                }}
            />
        </div>
    );
};

// Bars variant - equalizer-style bars
const BarsLoader = ({ size = 'md', className, colors }) => {
    const sizeMap = {
        sm: { width: 3, height: 16, gap: 2 },
        md: { width: 4, height: 24, gap: 3 },
        lg: { width: 5, height: 32, gap: 4 },
    };

    const { width, height, gap } = sizeMap[size];
    const barColors = [
        colors.primary,
        colors.secondary,
        colors.secondaryDark,
        colors.primary,
        colors.secondary,
    ];

    return (
        <div
            className={cn('flex items-end', className)}
            style={{ gap, height }}
        >
            {[0, 1, 2, 3, 4].map((i) => (
                <div
                    key={i}
                    className="rounded-full"
                    style={{
                        width,
                        background: `linear-gradient(to top, ${barColors[i]}80, ${barColors[i]})`,
                        animation: 'gruvbox-bar-dance 1s ease-in-out infinite',
                        animationDelay: `${i * 0.1}s`,
                        boxShadow: `0 0 8px ${barColors[i]}30`,
                    }}
                />
            ))}
        </div>
    );
};

// Spinner variant - rotating gradient arc
const SpinnerLoader = ({ size = 'md', className, colors }) => {
    const sizeMap = {
        sm: 20,
        md: 32,
        lg: 48,
    };

    const spinnerSize = sizeMap[size];
    const strokeWidth = spinnerSize * 0.12;
    // Create a unique ID for this instance's gradient
    const gradientId = `theme-gradient-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div
            className={cn('relative', className)}
            style={{ width: spinnerSize, height: spinnerSize }}
        >
            <svg
                viewBox="0 0 50 50"
                className="w-full h-full"
                style={{ animation: 'gruvbox-spin 1.2s linear infinite' }}
            >
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={colors.primary} />
                        <stop offset="50%" stopColor={colors.secondary} />
                        <stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke={`url(#${gradientId})`}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray="80, 200"
                    strokeDashoffset="0"
                />
            </svg>
            {/* Center glow */}
            <div
                className="absolute rounded-full"
                style={{
                    width: spinnerSize * 0.25,
                    height: spinnerSize * 0.25,
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: `radial-gradient(circle, ${colors.primary}40 0%, transparent 70%)`,
                }}
            />
        </div>
    );
};

// Main GruvboxLoader component
const GruvboxLoader = ({
    variant = 'dots',
    size = 'md',
    className,
    label,
    fullScreen = false,
    overlay = false,
}) => {
    // Get current theme colors
    const colors = getThemeColors();

    const loaders = {
        dots: DotsLoader,
        orbit: OrbitLoader,
        pulse: PulseLoader,
        bars: BarsLoader,
        spinner: SpinnerLoader,
    };

    const LoaderComponent = loaders[variant] || DotsLoader;

    const content = (
        <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
            <LoaderComponent size={size} colors={colors} />
            {label && (
                <span
                    className="text-sm font-medium"
                    style={{
                        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}
                >
                    {label}
                </span>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-gruvbox-bg-darkest/90 backdrop-blur-sm z-50">
                {content}
            </div>
        );
    }

    if (overlay) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-gruvbox-bg-darkest/80 backdrop-blur-sm z-10 rounded-xl">
                {content}
            </div>
        );
    }

    return content;
};

// CSS keyframes (inject into document)
if (typeof document !== 'undefined') {
    const existingStyle = document.getElementById('gruvbox-loader-styles');
    if (!existingStyle) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'gruvbox-loader-styles';
        styleSheet.textContent = `
            @keyframes gruvbox-dot-pulse {
                0%, 80%, 100% {
                    transform: scale(0.6);
                    opacity: 0.5;
                }
                40% {
                    transform: scale(1);
                    opacity: 1;
                }
            }

            @keyframes gruvbox-orbit {
                from {
                    transform: rotate(0deg);
                }
                to {
                    transform: rotate(360deg);
                }
            }

            @keyframes gruvbox-pulse-glow {
                0%, 100% {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 0.8;
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.2);
                    opacity: 1;
                }
            }

            @keyframes gruvbox-ring-pulse {
                0% {
                    transform: scale(0.5);
                    opacity: 1;
                }
                100% {
                    transform: scale(1.5);
                    opacity: 0;
                }
            }

            @keyframes gruvbox-core-pulse {
                0%, 100% {
                    transform: translate(-50%, -50%) scale(1);
                }
                50% {
                    transform: translate(-50%, -50%) scale(0.85);
                }
            }

            @keyframes gruvbox-bar-dance {
                0%, 100% {
                    height: 20%;
                }
                25% {
                    height: 60%;
                }
                50% {
                    height: 100%;
                }
                75% {
                    height: 40%;
                }
            }

            @keyframes gruvbox-spin {
                from {
                    transform: rotate(0deg);
                }
                to {
                    transform: rotate(360deg);
                }
            }
        `;
        document.head.appendChild(styleSheet);
    }
}

export default GruvboxLoader;
export { DotsLoader, OrbitLoader, PulseLoader, BarsLoader, SpinnerLoader };
