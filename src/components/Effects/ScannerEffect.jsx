import React from 'react';

const ScannerEffect = ({ show, glowIntensity }) => {
  if (!show) return null;

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-0"
      style={{
        background: `linear-gradient(0deg, transparent 50%, rgba(0,230,255,${0.05 * glowIntensity}) 50%)`,
        backgroundSize: '100% 4px',
        animation: 'scan 20s linear infinite'
      }}
    />
  );
};

export default ScannerEffect; 