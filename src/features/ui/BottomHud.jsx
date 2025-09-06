import React from 'react';

export default function BottomHud({
  glowEnabled,
  leftHidden,
  rightHidden,
  sidebarWidths,
  onOpenSettings,
  onOpenFinancial,
  onStartResize
}) {
  return (
    <div
      style={{
        height: `${Math.min(60, 15)}vh`,
        minHeight: '30px',
        left: !leftHidden ? `${sidebarWidths.left}vw` : '0',
        right: !rightHidden ? `${sidebarWidths.right}vw` : '0',
        margin: '0 5px',
        bottom: '5px'
      }}
      className={`fixed z-20 ${
        glowEnabled
          ? 'bg-gray-800/30 border-t border-neon-red/50'
          : 'bg-gray-900/50 border-t border-gray-600'
      } flex items-center justify-between px-4 backdrop-blur-lg rounded-lg transition-all duration-300`}
    >
      <div className="text-xs sm:text-sm md:text-xl flex flex-wrap gap-1 sm:gap-2 md:gap-8 p-1 sm:p-2">
        <span className="text-orange-900">⚠️ CRITICAL:</span>
        <span className="text-red-900">THERMAL</span>
        <span className="text-red-900">BIOSPHERE</span>
        <span className="text-red-900">RESOURCES</span>
      </div>
      <div className="flex space-x-4 ml-4">
        <button onClick={onOpenSettings} className="px-2 py-1 bg-gray-800 text-white rounded hover:bg-gray-700">
          Settings
        </button>
        <button onClick={onOpenFinancial} className="px-2 py-1 bg-neon-blue text-black rounded hover:bg-neon-blue/80">
          Financial Mode
        </button>
      </div>
      <div
        className="resize-handle-vertical"
        style={{
          position: 'absolute',
          top: '-8px',
          left: 0,
          right: 0,
          height: '16px',
          cursor: 'ns-resize',
          zIndex: 60,
          pointerEvents: 'auto'
        }}
        onMouseDown={onStartResize}
      />
    </div>
  );
}


