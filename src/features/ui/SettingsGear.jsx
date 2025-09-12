import React from 'react';
import { motion } from 'framer-motion';

export default function SettingsGear({ glowEnabled, settingsHoverCount, setShowSettings, showSettings, onHover, children }) {
  return (
    <div 
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 2147483647,
        pointerEvents: 'auto',
        isolation: 'isolate'
      }}
    >
      <motion.button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Gear clicked!', { showSettings, glowEnabled });
          setShowSettings(!showSettings);
        }}
        onMouseEnter={() => {
          if (typeof onHover === 'function') onHover();
        }}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          pointerEvents: 'auto',
          position: 'relative',
          zIndex: 1,
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}
        whileHover={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          scale: 1.1,
          borderColor: 'rgba(255, 255, 255, 0.5)'
        }}
        whileTap={{ scale: 0.95 }}
        title={settingsHoverCount < 3 ? 'Change FPS + Other Settings' : 'Settings'}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          style={{
            width: '28px',
            height: '28px',
            fill: glowEnabled ? '#ffffff' : '#e5e7eb',
            filter: glowEnabled ? 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.5))' : 'none'
          }}
        >
          <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65Z"/>
        </svg>
      </motion.button>
      {showSettings && children}
    </div>
  );
}