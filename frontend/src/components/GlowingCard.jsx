import React, { useRef, useEffect } from 'react';
import './GlowingCard.css';

const GlowingCard = ({ children, className = '' }) => {
    const cardRef = useRef(null);

    useEffect(() => {
        const $card = cardRef.current;
        if (!$card) return;

        const round = (value, precision = 3) => parseFloat(value.toFixed(precision));
        const clamp = (value, min = 0, max = 100) => Math.min(Math.max(value, min), max);

        const centerOfElement = ($el) => {
            const { width, height } = $el.getBoundingClientRect();
            return [width / 2, height / 2];
        };

        const pointerPositionRelativeToElement = ($el, e) => {
            const pos = [e.clientX, e.clientY];
            const { left, top, width, height } = $el.getBoundingClientRect();
            const x = pos[0] - left;
            const y = pos[1] - top;
            const px = clamp((100 / width) * x);
            const py = clamp((100 / height) * y);
            return { pixels: [x, y], percent: [px, py] };
        };

        const angleFromPointerEvent = (dx, dy) => {
            let angleRadians = 0;
            let angleDegrees = 0;
            if (dx !== 0 || dy !== 0) {
                angleRadians = Math.atan2(dy, dx);
                angleDegrees = angleRadians * (180 / Math.PI) + 90;
                if (angleDegrees < 0) {
                    angleDegrees += 360;
                }
            }
            return angleDegrees;
        };

        const distanceFromCenter = ($card, x, y) => {
            const [cx, cy] = centerOfElement($card);
            return [x - cx, y - cy];
        };

        const closenessToEdge = ($card, x, y) => {
            const [cx, cy] = centerOfElement($card);
            const [dx, dy] = distanceFromCenter($card, x, y);
            let k_x = Infinity;
            let k_y = Infinity;
            if (dx !== 0) {
                k_x = cx / Math.abs(dx);
            }
            if (dy !== 0) {
                k_y = cy / Math.abs(dy);
            }
            return clamp((1 / Math.min(k_x, k_y)), 0, 1);
        };

        const cardUpdate = (e) => {
            const position = pointerPositionRelativeToElement($card, e);
            const [px, py] = position.pixels;
            const [perx, pery] = position.percent;
            const [dx, dy] = distanceFromCenter($card, px, py);
            const edge = closenessToEdge($card, px, py);
            const angle = angleFromPointerEvent(dx, dy);

            $card.style.setProperty('--pointer-x', `${round(perx)}%`);
            $card.style.setProperty('--pointer-y', `${round(pery)}%`);
            $card.style.setProperty('--pointer-deg', `${round(angle)}deg`);
            $card.style.setProperty('--pointer-d', `${round(edge * 100)}`);
        };

        $card.addEventListener('pointermove', cardUpdate);

        return () => {
            $card.removeEventListener('pointermove', cardUpdate);
        };
    }, []);

    return (
        <div ref={cardRef} className={`glowing-card-wrapper ${className}`}>
            <span className="glow"></span>
            {children}
        </div>
    );
};

export default GlowingCard;
