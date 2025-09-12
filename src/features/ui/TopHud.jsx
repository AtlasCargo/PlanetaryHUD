import React from 'react';

export default function TopHud({
  glowEnabled,
  dimensionsTop,
  warRoomMode,
  leftHidden,
  rightHidden,
  sidebarWidths,
  isResizing,
  setIsResizing,
  isLoggedIn,
  setMode,
  setShowFinancial,
  setShowGraph,
  setWarRoomMode,
}) {
  return (
    <div
      data-test="top-hud"
      style={{
        height: `${Math.min(dimensionsTop, 30)}vh`,
        minHeight: warRoomMode ? '80px' : '40px',
        left: !leftHidden ? `${sidebarWidths.left}vw` : '0',
        right: !rightHidden ? `${sidebarWidths.right}vw` : '0',
        margin: '0 5px',
        zIndex: 60
      }}
      className={`absolute top-0 ${
        glowEnabled
          ? 'bg-gradient-to-b from-neon-blue/10 to-transparent border-b border-neon-blue/50'
          : 'bg-gray-900/50 border-b border-gray-600'
      } flex flex-col items-center justify-center ${warRoomMode ? 'z-50' : 'z-30'} backdrop-blur-lg rounded-lg transition-all duration-300`}
    >
      <h1
        onClick={() => { setMode('home'); setShowFinancial(false); setShowGraph(false); setWarRoomMode(false); }}
        className={`text-2xl sm:text-4xl md:text-6xl font-bold tracking-widest ${
          glowEnabled
            ? 'bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent'
            : 'text-green-700'
        } relative px-2 text-center`}
      >
        PLANETARY HUD
      </h1>
      {isLoggedIn && warRoomMode && (
        <button
          onClick={() => setWarRoomMode(false)}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-full animate-pulse"
        >
          War Room
        </button>
      )}
      <div
        className="resize-handle-vertical"
        style={{
          position: 'absolute',
          bottom: '-8px',
          left: 0,
          right: 0,
          height: '16px',
          cursor: 'ns-resize',
          zIndex: 60,
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsResizing((prev) => ({ ...prev, top: true }));
        }}
      />
    </div>
  );
}


