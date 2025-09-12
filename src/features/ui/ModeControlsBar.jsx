import React from 'react';

export default function ModeControlsBar({
  glowEnabled,
  mode,
  warRoomMode,
  showFinancial,
  setMode,
  setShowFinancial,
  setShowGraph,
  setWarRoomMode,
  hamburgerOpen,
  setHamburgerOpen,
  setLeftHidden,
  setShowSettings
}) {
  return (
    <>
      <div
        className="flex justify-between items-center p-2"
        style={{
          background: glowEnabled
            ? 'linear-gradient(to right, rgba(0, 0, 0, 0.5), transparent)'
            : 'rgba(0, 0, 0, 0.3)',
          borderBottom: glowEnabled
            ? '1px solid rgba(0, 230, 255, 0.3)'
            : '1px solid rgba(128, 128, 128, 0.3)'
        }}
      >
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setHamburgerOpen(open => !open)}
            className="p-1 text-white hover:text-neon-blue"
            aria-label="Menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {(warRoomMode || showFinancial || mode === 'financial') && (
            <button
              onClick={() => { setMode('home'); setShowFinancial(false); setShowGraph(false); setWarRoomMode(false); }}
              className="p-1 text-white hover:text-neon-blue"
              aria-label="Home"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7v11a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1V9z" />
              </svg>
            </button>
          )}
          {mode === 'home' ? (
            <button
              onClick={() => setMode('chat')}
              className="p-1 text-white hover:text-neon-blue"
              aria-label="Chat"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4-.8L3 20l1.8-4.2A8.963 8.963 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => setMode('home')}
              className="p-1 text-white hover:text-neon-blue"
              aria-label="Home"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7v11a1 1 0 01-1 1h-5v-6h-6v6H4a 1 1 0 01-1-1V9z" />
              </svg>
            </button>
          )}
          {mode !== 'jsonfs' && (
            <button
              onClick={() => setMode('jsonfs')}
              className="p-1 text-white hover:text-neon-blue"
              aria-label="File Explorer"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setLeftHidden(true)}
            className="p-1 text-gray-400 hover:text-white"
            aria-label="Collapse sidebar"
          >
            <span className="text-xl">‹</span>
          </button>
        </div>
        <button
          onClick={() => setLeftHidden(true)}
          className="p-1 text-gray-400 hover:text-white"
          aria-label="Collapse sidebar"
        >
          <span className="text-xl">‹</span>
        </button>
      </div>

      {hamburgerOpen && (
        <div className="absolute top-12 left-2 bg-gray-800 rounded shadow-lg z-40 w-36">
          <button onClick={() => { setHamburgerOpen(false); setMode('settings'); }} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">Account</button>
          <button onClick={() => { setHamburgerOpen(false); setMode('chat'); }} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">Chat</button>
          <button onClick={() => { setHamburgerOpen(false); setShowSettings(true); }} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">Other Settings</button>
          <button onClick={() => { setHamburgerOpen(false); setMode('ideologram'); setShowFinancial(false); setShowGraph(false); setWarRoomMode(false); }} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">Ideologram</button>
          <button onClick={() => { setHamburgerOpen(false); setShowFinancial(true); }} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">Financial Mode</button>
          <button onClick={() => { setHamburgerOpen(false); setWarRoomMode(v => !v); }} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">{warRoomMode ? 'Exit War Room' : 'War Room'}</button>
        </div>
      )}
    </>
  );
}



