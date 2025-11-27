import React, { useEffect, useRef, useState } from 'react';
import './Header.css';
import FerrisWheel from './FerrisWheel';

const Header = () => {
    const navRef = useRef(null);
    const [currentActiveItem, setCurrentActiveItem] = useState(null);
    const animRef = useRef(null);

    useEffect(() => {
        const nav = navRef.current;
        if (!nav) return;

        const items = nav.querySelectorAll('.nav-item');

        const animate = (from, to) => {
            if (animRef.current) clearInterval(animRef.current);

            const start = Date.now();
            animRef.current = setInterval(() => {
                const p = Math.min((Date.now() - start) / 500, 1);
                const e = 1 - Math.pow(1 - p, 3);

                const x = from + (to - from) * e;
                const y = -40 * (4 * e * (1 - e));
                const r = 200 * Math.sin(p * Math.PI);

                nav.style.setProperty('--translate-x', `${x}px`);
                nav.style.setProperty('--translate-y', `${y}px`);
                nav.style.setProperty('--rotate-x', `${r}deg`);

                if (p >= 1) {
                    clearInterval(animRef.current);
                    animRef.current = null;
                    nav.style.setProperty('--translate-y', '0px');
                    nav.style.setProperty('--rotate-x', '0deg');
                }
            }, 16);
        };

        const getCurrentPosition = () => parseFloat(nav.style.getPropertyValue('--translate-x')) || 0;

        const getItemCenter = (item) => {
            return item.getBoundingClientRect().left + item.offsetWidth / 2 - nav.getBoundingClientRect().left - 5;
        };

        const moveToItem = (item) => {
            const current = getCurrentPosition();
            const center = getItemCenter(item);
            animate(current, center);
            nav.classList.add('show-indicator');
        };

        const setActiveItem = (item) => {
            items.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            setCurrentActiveItem(item);
            moveToItem(item);
        };

        const handleMouseLeave = () => {
            const activeItem = nav.querySelector('.nav-item.active');
            if (activeItem) {
                moveToItem(activeItem);
            } else {
                nav.classList.remove('show-indicator');
                if (animRef.current) clearInterval(animRef.current);
            }
        };

        items.forEach(item => {
            item.addEventListener('mouseenter', () => moveToItem(item));
            item.addEventListener('mouseleave', handleMouseLeave);
            item.addEventListener('click', () => setActiveItem(item));
        });

        nav.addEventListener('mouseleave', handleMouseLeave);

        // Set first item as active by default
        if (items.length > 0) {
            setTimeout(() => {
                setActiveItem(items[0]);
            }, 100);
        }

        return () => {
            if (animRef.current) clearInterval(animRef.current);
        };
    }, []);

    return (
        <div className="flex items-center justify-between py-8 px-8">
            <div className="flex-1 max-w-2xl">
                <div className="relative group">
                    <input
                        type="text"
                        placeholder="Search my mind..."
                        className="w-full bg-transparent text-4xl font-serif italic text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:text-foreground transition-colors"
                    />
                </div>
            </div>

            <div className="flex items-center gap-6 text-muted-foreground">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/50 text-xs font-medium cursor-pointer hover:bg-accent transition-colors">
                    <FerrisWheel />
                    <span className="ml-2">Upgraded Features</span>
                </div>

                <nav
                    ref={navRef}
                    className="elastic-nav"
                >
                    <a href="#" className="nav-item">Everything</a>
                    <a href="#" className="nav-item">Sides</a>
                </nav>

                {/* SVG Filter for wave distortion */}
                <svg style={{ display: 'none' }}>
                    <defs>
                        <filter id="wave-distort" x="0%" y="0%" width="100%" height="100%">
                            <feTurbulence
                                type="fractalNoise"
                                baseFrequency="0.0038 0.0038"
                                numOctaves="1"
                                seed="2"
                                result="roughNoise"
                            />
                            <feGaussianBlur in="roughNoise" stdDeviation="8.5" result="softNoise" />
                            <feComposite
                                operator="arithmetic"
                                k1="0"
                                k2="1"
                                k3="2"
                                k4="0"
                                in="softNoise"
                                result="mergedMap"
                            />
                            <feDisplacementMap
                                in="SourceGraphic"
                                in2="mergedMap"
                                scale="-42"
                                xChannelSelector="G"
                                yChannelSelector="G"
                            />
                        </filter>
                    </defs>
                </svg>
            </div>
        </div>
    );
};

export default Header;
