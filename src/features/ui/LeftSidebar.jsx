import React from 'react';

export default function LeftSidebar({
  leftHidden,
  sidebarWidthVw,
  glowEnabled,
  isResizingLeft,
  onStartResizeLeft,
  children
}) {
  return (
    <div
      className={`fixed top-0 left-0 h-full z-30 ${
        leftHidden ? '-translate-x-full' : 'translate-x-0'
      } backdrop-blur-lg rounded-r-lg`}
      style={{
        width: `${sidebarWidthVw}vw`,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        transition: isResizingLeft ? 'none' : 'transform 0.3s ease-in-out'
      }}
    >
      <div className="relative h-full flex flex-col" style={{ userSelect: isResizingLeft ? 'none' : 'auto' }}>
        {children}
        {/* Resize handle */}
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-neon-blue/30 z-50"
          style={{ transform: 'translateX(50%)' }}
          onMouseDown={(e) => {
            e.preventDefault();
            onStartResizeLeft && onStartResizeLeft(e);
          }}
        />
      </div>
    </div>
  );
}


