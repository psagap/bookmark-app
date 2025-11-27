import React from 'react';
import './FerrisWheel.css';

const FerrisWheel = () => {
  const baskets = Array.from({ length: 10 }, (_, i) => i);

  return (
    <div className="ferris-wheel-container group">
      <div className="ferris-wheel" style={{ '--t': 10 }}>
        {baskets.map((i) => (
          <div key={i} className="basket" style={{ '--i': i }}></div>
        ))}
      </div>

      {/* Stand Structure */}
      <div className="stand">
        <div className="stand-base"></div>
      </div>

      {/* Fireworks */}
      <div className="firework"></div>
      <div className="firework"></div>
      <div className="firework"></div>
      <div className="firework"></div>
    </div>
  );
};

export default FerrisWheel;
