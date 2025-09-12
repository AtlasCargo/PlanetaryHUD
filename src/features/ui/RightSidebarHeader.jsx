import React from 'react';

export default function RightSidebarHeader({ glowEnabled, title, onCollapse }) {
  return (
    <div
      className="flex justify-between items-center cursor-pointer p-2"
      onClick={onCollapse}
      style={{
        background: glowEnabled
          ? 'linear-gradient(to left, rgba(0, 0, 0, 0.5), transparent)'
          : 'rgba(0, 0, 0, 0.3)',
        borderBottom: glowEnabled
          ? '1px solid rgba(0, 230, 255, 0.3)'
          : '1px solid rgba(128, 128, 128, 0.3)'
      }}
    >
      <h2 className={`text-2xl font-bold ${glowEnabled ? 'text-white glow-text' : 'text-gray-400'}`}>
        {title}
      </h2>
      <span className={`text-xl ${glowEnabled ? 'text-neon-blue glow-text' : 'text-gray-400'}`}>
        –
      </span>
    </div>
  );
}



