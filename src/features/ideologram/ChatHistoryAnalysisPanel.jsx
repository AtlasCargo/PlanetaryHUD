import React from 'react';

export default function ChatHistoryAnalysisPanel({ messages = [] }) {
  if (!messages || messages.length === 0) return null;
  return (
    <div className="p-4 rounded-lg border border-gray-700 bg-gray-900/40">
      <h2 className="text-lg font-semibold mb-2">Chat History Analysis</h2>
      <p className="text-sm text-gray-400 mb-2">
        {messages.length} messages loaded • {messages.filter(m => m.role === 'user').length} user messages • {messages.filter(m => m.role === 'assistant').length} AI responses
      </p>
      <div className="max-h-40 overflow-y-auto space-y-2">
        {messages.slice(-5).map((msg, idx) => (
          <div key={idx} className={`p-2 rounded text-sm ${msg.role === 'user' ? 'bg-blue-900/30 border-l-2 border-blue-500' : 'bg-gray-800/30 border-l-2 border-gray-500'}`}>
            <div className="text-xs text-gray-400 mb-1">
              {msg.role === 'user' ? 'You' : 'AI'} • {new Date(msg.timestamp).toLocaleString()}
            </div>
            <div className="text-gray-200">
              {msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Chat history will be analyzed during worldview assessment to enhance accuracy
      </div>
    </div>
  );
}


