import React, { useState } from 'react';
import { setApiKey } from '../services/openaiClient';
const storedKey = window.localStorage.getItem('openai_api_key');

/**
 * Chat window with API key prompt and bottom-stacked messages
 */
export default function ChatWindow({
  messages = [],
  onSend = () => {},
  onAvatarClick = () => {},
  expandedAvatarId = null,
}) {
  const [input, setInput] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(!!storedKey);

  const handleSend = () => {
    if (input.trim()) {
      onSend(input.trim());
      setInput('');
    }
  };

  const saveKey = () => {
    setApiKey(keyInput);
    setHasKey(true);
  };

  // Export stored API key to clipboard
  const exportKey = () => {
    const key = window.localStorage.getItem('openai_api_key');
    if (key) {
      navigator.clipboard.writeText(key);
      alert('API key copied to clipboard');
    }
  };

  return (
    <div className="p-4 h-full flex flex-col justify-end">
      {!hasKey ? (
        <div className="flex flex-col items-center justify-center h-full">
          <input
            className="w-full max-w-md p-2 mb-2 border rounded"
            type="password"
            placeholder="Enter OpenAI API Key"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
          />
          <button
            onClick={saveKey}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Save Key
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={exportKey}
            className="mb-2 text-sm text-gray-400 hover:text-white self-start"
          >Export API Key</button>
          <div className="flex-1 overflow-y-auto space-y-2 flex flex-col-reverse">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2 rounded ${msg.role === 'user' ? 'self-end bg-blue-600' : 'self-start bg-gray-700'}`}
              >
                {msg.content}
              </div>
            ))}
          </div>
          <div className="flex mt-2">
            <input
              className="flex-1 p-2 rounded-l bg-gray-800 border border-gray-600"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={e => {
                if (e.key === 'Enter') handleSend();
              }}
            />
            <button
              onClick={handleSend}
              className="px-4 bg-blue-500 rounded-r hover:bg-blue-400"
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}