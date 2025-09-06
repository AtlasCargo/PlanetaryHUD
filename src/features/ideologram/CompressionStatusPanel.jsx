import React from 'react';

export default function CompressionStatusPanel({ error, compressing, status }) {
  return (
    <>
      {error && (
        <div className="mt-2 border border-red-600 rounded p-2 text-sm bg-red-900/20">
          <h3 className="text-red-400 font-semibold mb-2">❌ Compression Error</h3>
          <div className="text-red-300 text-xs">{error}</div>
          <div className="mt-2 text-gray-400 text-xs">
            💡 Try using the "1000 Sentence Test" button for large texts, or check the backend console for detailed logs.
          </div>
        </div>
      )}
      {compressing && (
        <div className="mt-2 border border-blue-600 rounded p-2 text-sm bg-blue-900/20">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
            <div className="text-blue-400 font-medium">Compression in Progress...</div>
          </div>
          <div className="text-blue-300 text-xs mt-1">
            This may take several minutes for large texts. Check the backend console for progress updates.
          </div>
          {status?.currentStep && (
            <div className="text-blue-300 text-xs mt-1">{status.currentStep}</div>
          )}
        </div>
      )}
    </>
  );
}


