import React from 'react';

export default function ChatSidebar({ chatHistory, onNewChat, onOpenConversation }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <h3 className="text-sm font-bold text-neon-blue mb-2">Past Conversations</h3>
      <button onClick={onNewChat} className="mb-2 p-2 bg-neon-blue rounded text-black">New Chat</button>
      <ul className="overflow-y-auto flex-1">
        {chatHistory.map((c) => (
          <li key={c.id}>
            <button
              className="w-full text-left text-white hover:text-neon-blue py-1"
              onClick={() => onOpenConversation(c.id)}
            >
              {c.id}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

