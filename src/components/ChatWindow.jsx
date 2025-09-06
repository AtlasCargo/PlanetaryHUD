import React, { useEffect, useState, useContext } from 'react';
import { setApiKey } from '../services/openaiClient';
import { AuthContext } from '../contexts/AuthContext';
import eventBus from '../shared/events/eventBus';
import { Events } from '../shared/events/contracts';
import { startRealtime, stopRealtime, startTranscribeRecording, stopTranscribeAndUpload, cancelRealtimeResponse, clearRealtimeAudio } from '../features/voice';

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
  const [showTools, setShowTools] = useState(false);
  const [rtConnected, setRtConnected] = useState(false);
  const [pttActive, setPttActive] = useState(false);

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

  // Voice events
  useEffect(() => {
    const off1 = eventBus.on(Events.VoiceRealtimeConnected, () => setRtConnected(true));
    const off2 = eventBus.on(Events.VoiceRealtimeError, () => setRtConnected(false));
    return () => { off1(); off2(); };
  }, []);

  const toggleRealtime = async () => {
    try {
      if (!rtConnected) {
        await startRealtime();
        setRtConnected(true);
      } else {
        stopRealtime();
        clearRealtimeAudio();
        setRtConnected(false);
      }
    } catch {}
  };

  const togglePTT = async () => {
    try {
      if (!pttActive) {
        setPttActive(true);
        await startTranscribeRecording();
      } else {
        setPttActive(false);
        await stopTranscribeAndUpload({ filename: 'audio.webm' });
      }
    } catch {
      setPttActive(false);
    }
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
          <div className="flex mt-2 relative" onMouseEnter={() => setShowTools(true)} onMouseLeave={() => setShowTools(false)}>
            {/* Toolkit indicator / hover zone */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2 select-none">
              {/* small indicator dots */}
              <span className="text-gray-500 text-xs">•••</span>
              {/* Icons appear on hover or focus */}
              {(showTools || document.activeElement === document.getElementById('chat-input')) && (
                <div className="flex items-center gap-2">
                  {/* Realtime icon (person silhouette) */}
                  <button
                    type="button"
                    title={rtConnected ? 'Stop Realtime' : 'Live Realtime'}
                    onClick={toggleRealtime}
                    className={`p-1.5 rounded ${rtConnected ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                    aria-label="Realtime"
                  >
                    {/* person silhouette svg */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                      <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.314 0-10 1.657-10 4.971V22h20v-3.029C22 15.657 15.314 14 12 14z"/>
                    </svg>
                  </button>
                  {/* Transcribe icon (microphone) */}
                  <button
                    type="button"
                    title={pttActive ? 'Stop Transcribe' : 'Transcribe'}
                    onClick={togglePTT}
                    className={`p-1.5 rounded ${pttActive ? 'bg-yellow-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                    aria-label="Transcribe"
                  >
                    {/* microphone svg */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                      <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zM11 19h2v3h-2z"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <input
              id="chat-input"
              className="flex-1 pl-16 p-2 rounded-l bg-gray-800 border border-gray-600"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={e => {
                if (e.key === 'Enter') handleSend();
              }}
              onFocus={() => setShowTools(true)}
              onBlur={() => setShowTools(false)}
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
