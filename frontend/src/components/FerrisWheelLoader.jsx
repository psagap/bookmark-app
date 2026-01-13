import React from 'react';

/**
 * ModernLoader - Sleek, minimalist loading animation
 * Features smooth gradient pulse with elegant typography
 *
 * @param {string} label - The loading text to display (default: "Loading")
 * @param {string} subtitle - Optional subtitle text
 * @param {string} className - Additional CSS classes for the container
 * @param {string} size - Size variant: "sm", "md", "lg"
 */
const FerrisWheelLoader = ({
    label = "Loading",
    subtitle,
    className = "",
    size = "md"
}) => {
    const sizeConfig = {
        sm: { container: 'h-[200px]', text: 'text-lg', dots: 'w-2 h-2', gap: 'gap-3' },
        md: { container: 'h-[300px]', text: 'text-2xl', dots: 'w-3 h-3', gap: 'gap-4' },
        lg: { container: 'h-[400px]', text: 'text-3xl', dots: 'w-4 h-4', gap: 'gap-5' },
    };
    const sizes = sizeConfig[size] || sizeConfig.md;

    return (
        <div
            className={`${sizes.container} w-full flex flex-col items-center justify-center relative overflow-hidden ${className}`}
        >
            {/* Ambient gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-theme-bg-darkest via-theme-bg-dark to-theme-bg-darkest" />

            {/* Animated glow orb */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div
                    className="w-32 h-32 rounded-full opacity-20 blur-3xl"
                    style={{
                        background: 'radial-gradient(circle, var(--theme-secondary) 0%, transparent 70%)',
                        animation: 'loader-pulse 2s ease-in-out infinite'
                    }}
                />
            </div>

            {/* Animated dots */}
            <div className={`relative z-10 flex items-center ${sizes.gap} mb-8`}>
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className={`${sizes.dots} rounded-full bg-primary`}
                        style={{
                            animation: 'loader-bounce 1.4s ease-in-out infinite',
                            animationDelay: `${i * 0.16}s`
                        }}
                    />
                ))}
            </div>

            {/* Text */}
            <div className="relative z-10 text-center">
                <p
                    className={`${sizes.text} font-display font-medium tracking-wide text-foreground`}
                    style={{
                        animation: 'loader-fade 2s ease-in-out infinite'
                    }}
                >
                    {label}
                </p>
                {subtitle && (
                    <p className="text-xs text-muted-foreground mt-2 tracking-widest uppercase">
                        {subtitle}
                    </p>
                )}
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes loader-bounce {
                    0%, 80%, 100% {
                        transform: translateY(0);
                        opacity: 0.4;
                    }
                    40% {
                        transform: translateY(-12px);
                        opacity: 1;
                    }
                }

                @keyframes loader-pulse {
                    0%, 100% {
                        transform: scale(1);
                        opacity: 0.15;
                    }
                    50% {
                        transform: scale(1.2);
                        opacity: 0.25;
                    }
                }

                @keyframes loader-fade {
                    0%, 100% {
                        opacity: 0.7;
                    }
                    50% {
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
};

export default FerrisWheelLoader;
