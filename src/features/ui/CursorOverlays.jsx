import React from 'react';

export default function CursorOverlays({ cursorMode, cursorPosition, cursorHoverCountry, cursorCountry }) {
  return (
    <>
      {cursorMode && (
        <div 
          className="fixed w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg z-[9998] pointer-events-none"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 10px rgba(255, 0, 0, 0.8)'
          }}
        />
      )}
      {cursorMode && (
        <div className="fixed bottom-4 left-4 bg-black/80 text-white p-3 rounded z-[9999] border border-white/20 max-w-xs">
          <div className="text-sm font-bold mb-2">🎯 Cursor Mode</div>
          <div className="text-xs space-y-1">
            <div>Lat: {cursorPosition.lat.toFixed(2)}°</div>
            <div>Lng: {cursorPosition.lng.toFixed(2)}°</div>
            {cursorHoverCountry && (
              <div className="text-green-400">Hovering: {cursorHoverCountry}</div>
            )}
            {cursorCountry && (
              <div className="text-blue-400">Selected: {cursorCountry}</div>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-2">WASD/Arrows: Move | Enter/Space: Select | ESC: Exit</div>
        </div>
      )}
    </>
  );
}


