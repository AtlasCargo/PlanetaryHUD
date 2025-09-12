import React from 'react';

export default function OrientationPrompt({ onDismiss, onPreview }) {
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 text-gray-100 border border-gray-700 rounded-xl p-5 w-[22rem] max-w-[90vw] shadow-2xl">
        <div className="text-center space-y-2">
          <div className="text-lg font-semibold">Best experienced in landscape</div>
          <div className="text-sm opacity-80">Rotate your device for the interactive globe. Or preview a lighter mini-globe.</div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2">
          <button onClick={onDismiss} className="px-4 py-2 rounded bg-neon-blue text-black">I rotated / Continue</button>
          <button onClick={onPreview} className="px-4 py-2 rounded bg-gray-800 text-gray-100 border border-gray-700">Preview mini-globe</button>
        </div>
      </div>
    </div>
  );
}



