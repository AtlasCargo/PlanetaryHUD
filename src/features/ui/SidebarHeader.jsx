import React from 'react';

export default function SidebarHeader({
  glowEnabled,
  hamburgerOpen,
  onToggleHamburger,
  showHomeButton,
  onGoHome,
  onGoChat,
  isHomeMode,
  onCollapseLeft,
  onOpenAccount,
  onOpenChat,
  onOpenOtherSettings,
  onOpenIdeologram,
  onOpenFinancial,
  onToggleAvatarRig,
  onToggleWarRoom,
  warRoomMode
}) {
  return (
    <>
      {/* Left Sidebar Header */}
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
          {/* Hamburger */}
          <button
            onClick={onToggleHamburger}
            className="p-1 text-white hover:text-neon-blue"
            aria-label="Menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Home / Chat toggle */}
          {showHomeButton ? (
            <button onClick={onGoHome} className="p-1 text-white hover:text-neon-blue" aria-label="Home">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7v11a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1V9z" />
              </svg>
            </button>
          ) : (
            isHomeMode ? (
              <button onClick={onGoChat} className="p-1 text-white hover:text-neon-blue" aria-label="Chat">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4-.8L3 20l1.8-4.2A8.963 8.963 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            ) : (
              <button onClick={onGoHome} className="p-1 text-white hover:text-neon-blue" aria-label="Home">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7v11a1 1 0 01-1 1h-5v-6h-6v6H4a 1 1 0 01-1-1V9z" />
                </svg>
              </button>
            )
          )}

          {/* Collapse left */}
          <button onClick={onCollapseLeft} className="p-1 text-gray-400 hover:text-white" aria-label="Collapse sidebar">
            <span className="text-xl">‹</span>
          </button>
        </div>

        {/* Duplicate collapse (right side) */}
        <button onClick={onCollapseLeft} className="p-1 text-gray-400 hover:text-white" aria-label="Collapse sidebar">
          <span className="text-xl">‹</span>
        </button>
      </div>

      {/* Hamburger Dropdown */}
      {hamburgerOpen && (
        <div className="absolute top-12 left-2 bg-gray-800 rounded shadow-lg z-40 w-36">
          <button onClick={onOpenAccount} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">Account</button>
          <button onClick={onOpenChat} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">Chat</button>
          <button onClick={onOpenOtherSettings} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">Other Settings</button>
          <button onClick={onOpenIdeologram} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">Ideologram</button>
          <button onClick={onOpenFinancial} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">Financial Mode</button>
          <button onClick={onToggleAvatarRig} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">Avatar Rig</button>
          <button onClick={onToggleWarRoom} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">{warRoomMode ? 'Exit War Room' : 'War Room'}</button>
        </div>
      )}
    </>
  );
}


