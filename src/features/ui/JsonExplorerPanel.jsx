import React from 'react';
import JSONFileExplorer from '../../components/JSONFileExplorer';

export default function JsonExplorerPanel() {
  return (
    <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 mb-4">
      <h3 className="text-sm font-bold text-neon-blue mb-2">JSON Explorer</h3>
      <JSONFileExplorer />
    </div>
  );
}



