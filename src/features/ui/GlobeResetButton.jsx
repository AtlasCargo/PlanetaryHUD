import React from 'react';

export default function GlobeResetButton({ onClick }) {
  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50">
      <button
        onClick={onClick}
        className="px-4 py-2 bg-gray-800/80 backdrop-blur-md text-neon-red border border-neon-red/30 rounded-lg hover:bg-gray-700/80 transition-colors flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 2v6h6"></path>
          <path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path>
        </svg>
        Reset Globe
      </button>
    </div>
  );
}



