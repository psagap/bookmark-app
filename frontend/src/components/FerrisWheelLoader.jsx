import React, { useMemo } from 'react';

/**
 * FerrisWheelLoader - 1970s Vintage Ferris Wheel Loading Animation
 * Gruvbox themed with warm amber/orange colors
 *
 * @param {string} label - The loading text to display (default: "Loading")
 * @param {string} subtitle - Optional subtitle text
 * @param {string} className - Additional CSS classes for the container
 * @param {string} background - Background color (default: uses Gruvbox gradient, use "transparent" for no bg)
 */
const FerrisWheelLoader = ({
    label = "Loading",
    subtitle = "VINTAGE READER",
    className = "",
    background = "gruvbox"
}) => {
    // Generate stable random positions for stars using useMemo
    const stars = useMemo(() => {
        return [...Array(20)].map((_, i) => ({
            left: `${(i * 17 + 13) % 100}%`,
            top: `${(i * 23 + 7) % 60}%`,
            duration: 1.5 + (i % 5) * 0.4,
            delay: (i % 7) * 0.3,
            opacity: 0.5 + (i % 4) * 0.1,
            color: i % 3 === 0 ? '#fabd2f' : i % 3 === 1 ? '#fe8019' : '#d79921',
        }));
    }, []);

    // Determine background style based on prop
    const getBgStyle = () => {
        if (background === "transparent") {
            return { background: 'transparent' };
        }
        if (background === "black") {
            return { background: '#000' };
        }
        // Default gruvbox gradient
        return null;
    };

    const bgStyle = getBgStyle();
    const useGruvboxGradient = background === "gruvbox";

    return (
        <div
            className={`h-full min-h-[300px] flex flex-col items-center justify-center relative overflow-hidden ${className}`}
            style={bgStyle || undefined}
        >
            {/* Vintage grain overlay */}
            <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Background gradient - only show for gruvbox mode */}
            {useGruvboxGradient && (
                <div
                    className="absolute inset-0 bg-gruvbox-bg-darkest"
                    style={{
                        background: 'radial-gradient(ellipse at 50% 30%, rgba(215, 153, 33, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(254, 128, 25, 0.05) 0%, transparent 40%), linear-gradient(180deg, #1d2021 0%, #282828 50%, #1d2021 100%)'
                    }}
                />
            )}

            {/* Stars twinkling - Gruvbox themed */}
            <div className="absolute inset-0">
                {stars.map((star, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 rounded-full"
                        style={{
                            left: star.left,
                            top: star.top,
                            animation: `ferris-twinkle ${star.duration}s ease-in-out infinite`,
                            animationDelay: `${star.delay}s`,
                            opacity: star.opacity,
                            backgroundColor: star.color,
                        }}
                    />
                ))}
            </div>

            {/* Ferris Wheel */}
            <div
                className="relative w-48 h-48 mb-8"
                style={{ animation: 'ferris-rotate 8s linear infinite' }}
            >
                {/* Wheel rim with vintage glow */}
                <div
                    className="absolute inset-0 rounded-full border-4"
                    style={{
                        borderColor: 'rgba(250, 189, 47, 0.8)',
                        boxShadow: '0 0 20px rgba(250, 189, 47, 0.3), inset 0 0 20px rgba(250, 189, 47, 0.1)'
                    }}
                />

                {/* Spokes */}
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute top-1/2 left-1/2 w-[45%] h-0.5 origin-left"
                        style={{
                            transform: `rotate(${i * 45}deg)`,
                            background: 'linear-gradient(to right, #d79921, #fabd2f)'
                        }}
                    />
                ))}

                {/* Center hub */}
                <div
                    className="absolute top-1/2 left-1/2 w-6 h-6 -ml-3 -mt-3 rounded-full border-2"
                    style={{
                        backgroundColor: '#fabd2f',
                        borderColor: '#fe8019',
                        boxShadow: '0 0 15px rgba(250, 189, 47, 0.5)'
                    }}
                />

                {/* Gondolas/Carriages - counter-rotate to stay upright */}
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-5 h-7 rounded-b-lg"
                        style={{
                            left: '50%',
                            top: '50%',
                            marginLeft: '-10px',
                            marginTop: '-3.5px',
                            transform: `rotate(${i * 45}deg) translateY(-88px)`,
                            transformOrigin: '10px 3.5px',
                        }}
                    >
                        {/* Gondola body - counter-rotate */}
                        <div
                            className="w-5 h-7 rounded-b-lg border-2"
                            style={{
                                animation: 'ferris-counter-rotate 8s linear infinite',
                                background: i % 2 === 0
                                    ? 'linear-gradient(180deg, #fb4934, #cc241d)'
                                    : 'linear-gradient(180deg, #fabd2f, #d79921)',
                                borderColor: i % 2 === 0 ? '#fb4934' : '#fabd2f',
                                boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Ground/base structure */}
            <div className="relative">
                {/* Support beams - A-frame */}
                <div className="flex justify-center gap-20 -mt-4">
                    <div
                        className="w-2 h-20 transform -rotate-12 origin-top"
                        style={{ background: 'linear-gradient(to bottom, #d79921, #af3a03)' }}
                    />
                    <div
                        className="w-2 h-20 transform rotate-12 origin-top"
                        style={{ background: 'linear-gradient(to bottom, #d79921, #af3a03)' }}
                    />
                </div>
            </div>

            {/* Vintage text - Gruvbox themed */}
            <div className="mt-8 text-center relative z-10">
                <p
                    className="text-lg tracking-[0.3em] uppercase"
                    style={{
                        fontFamily: 'Georgia, serif',
                        background: 'linear-gradient(135deg, #fabd2f 0%, #fe8019 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        filter: 'drop-shadow(0 0 10px rgba(250, 189, 47, 0.4))',
                        animation: 'ferris-fade 2s ease-in-out infinite'
                    }}
                >
                    {label}
                </p>
                {subtitle && (
                    <p className="text-gruvbox-orange/60 text-xs mt-2 tracking-widest">
                        ✦ {subtitle} ✦
                    </p>
                )}
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes ferris-rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes ferris-counter-rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(-360deg); }
                }
                @keyframes ferris-twinkle {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.2); }
                }
                @keyframes ferris-fade {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default FerrisWheelLoader;
