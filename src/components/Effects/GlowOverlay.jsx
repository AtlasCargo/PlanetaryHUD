import React from 'react';

const GlowOverlay = ({ enabled }) => {
  if (!enabled) return null;

  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{
        boxShadow: 'inset 0 0 200px rgba(0, 230, 255, 0.1)',
        background: 'radial-gradient(circle at 50% 50%, transparent 60%, rgba(0,0,0,0.9))'
      }}
    />
  );
};

export default GlowOverlay; 