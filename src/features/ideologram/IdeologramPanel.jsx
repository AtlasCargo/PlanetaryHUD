import React from 'react';

export default function IdeologramPanel({ children }) {
  return (
    <div className="relative w-full h-full p-4" style={{ overflowY: 'auto' }}>
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {children}
      </div>
    </div>
  );
}


