import React from 'react';

export default function ChatHistoryUploadPanel({ loading, error, onUpload }) {
  return (
    <div className="p-4 rounded-lg border border-gray-700 bg-gray-900/40">
      <h2 className="text-lg font-semibold mb-2">Upload ChatGPT History</h2>
      <p className="text-sm text-gray-400 mb-2">Upload your ChatGPT conversation history to enhance worldview assessment</p>
      <input type="file" accept=".json,.txt" onChange={onUpload} />
      {loading && <span className="ml-2 text-xs text-gray-400">Processing…</span>}
      {!!error && <div className="text-xs text-neon-red mt-1">{error}</div>}
    </div>
  );
}


