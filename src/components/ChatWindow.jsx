import React, { useState, useContext } from 'react';
import { setApiKey } from '../services/openaiClient';
import { AuthContext } from '../contexts/AuthContext';

const storedKey = window.localStorage.getItem('openai_api_key');

/**
 * Chat window with API key prompt and bottom-stacked messages
 */
export default function ChatWindow({
  messages = [],
  onSend = () => {},
}) {
  const [input, setInput] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(!!storedKey);

  // user & avatars
  const { user } = useContext(AuthContext);
  const defaultAssistantAvatar = '/default-assistant-avatar.png';
  // Load assistant avatar from storage or default
  const storedAssistant = localStorage.getItem('assistantAvatarUrl');
  const [assistantAvatarUrl] = useState(storedAssistant || defaultAssistantAvatar);
  // Load user avatar from storage or context
  const storedUserAvatar = localStorage.getItem('avatarUrl');
  const [userAvatarUrl] = useState(storedUserAvatar || user?.avatarUrl || '');
  const [expandedAvatarUrl, setExpandedAvatarUrl] = useState(null);

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
    <div className="relative p-4 h-full flex flex-col justify-end">
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
          {/* Expanded avatar panel */}
          {expandedAvatarUrl && (
            <div className="absolute left-4 top-4 bg-gray-800 p-2 rounded shadow-lg">
              <img src={expandedAvatarUrl} alt="avatar" className="w-32 h-32 object-cover mb-2" />
              <button onClick={() => setExpandedAvatarUrl(null)} className="text-sm text-white underline">Close</button>
            </div>
          )}
          <button
            onClick={exportKey}
            className="mb-2 text-sm text-gray-400 hover:text-white self-start"
          >Export API Key</button>
          <div className="flex-1 overflow-y-auto space-y-2 flex flex-col">
            {messages.map((msg, idx) => {
              const avatarSrc = msg.role === 'assistant' ? assistantAvatarUrl : userAvatarUrl;
              const size = msg.role === 'assistant' ? 'w-8 h-8' : 'w-6 h-6';
              if (msg.role === 'assistant') {
                return (
                  <div key={idx} className="flex items-start space-x-2">
                    <img
                      src={avatarSrc}
                      alt="avatar"
                      className={`${size} rounded-full cursor-pointer`}
                      onClick={() => setExpandedAvatarUrl(avatarSrc)}
                    />
                    <div className="p-2 rounded bg-gray-700">{msg.content}</div>
                  </div>
                );
              } else {
                return (
                  <div key={idx} className="flex items-start space-x-2 justify-end">
                    <div className="p-2 rounded bg-blue-600">{msg.content}</div>
                    <img
                      src={avatarSrc}
                      alt="avatar"
                      className={`${size} rounded-full cursor-pointer`}
                      onClick={() => setExpandedAvatarUrl(avatarSrc)}
                    />
                  </div>
                );
              }
            })}
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