import React from 'react';

export default function ResizeHandle({ side = 'right', onMouseDown }) {
  if (side === 'left') {
    return (
      <div
        className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-neon-blue/30 z-50"
        style={{ transform: 'translateX(-50%)' }}
        onMouseDown={(e) => { e.preventDefault(); onMouseDown && onMouseDown(e); }}
      />
    );
  }
  if (side === 'bottom') {
    return (
      <div
        className="absolute bottom-0 left-0 w-full h-1 cursor-row-resize hover:bg-neon-blue/30 z-50"
        onMouseDown={(e) => { e.preventDefault(); onMouseDown && onMouseDown(e); }}
      />
    );
  }
  return (
    <div
      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-neon-blue/30 z-50"
      style={{ transform: 'translateX(50%)' }}
      onMouseDown={(e) => { e.preventDefault(); onMouseDown && onMouseDown(e); }}
    />
  );
}



