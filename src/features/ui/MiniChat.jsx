import React, { useCallback, useEffect, useRef, useState } from 'react';
import { setApiKey } from '../../services/openaiClient';
import { ideologramPrompts } from './miniChatPrompts';

export default function MiniChat({
  parentRef,
  currentConversation = [],
  onSend,
  onOpenChat,
  mode,
}) {
  const miniChatRef = useRef(null);
  const [miniInput, setMiniInput] = useState('');
  const [miniKeyInput, setMiniKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(!!(typeof window !== 'undefined' && (localStorage.getItem('openai_api_key') || process.env.REACT_APP_OPENAI_API_KEY)));
  const [miniDrag, setMiniDrag] = useState({ dragging: false, floating: false, x: 0, y: 0, startX: 0, startY: 0 });

  const saveMiniKey = () => { setApiKey(miniKeyInput); setHasKey(true); };

  const startMiniDrag = useCallback((e) => {
    if (!parentRef?.current || !miniChatRef.current) return;
    const parentRect = parentRef.current.getBoundingClientRect();
    const elRect = miniChatRef.current.getBoundingClientRect();
    const initX = miniDrag.floating ? miniDrag.x : elRect.left - parentRect.left;
    const initY = miniDrag.floating ? miniDrag.y : elRect.top - parentRect.top + parentRef.current.scrollTop;
    setMiniDrag({ dragging: true, floating: true, x: initX, y: initY, startX: e.clientX - initX, startY: e.clientY - initY });
    e.preventDefault();
  }, [miniDrag.floating, miniDrag.x, miniDrag.y, parentRef]);

  useEffect(() => {
    if (!miniDrag.dragging) return;
    const onMove = (ev) => {
      if (!parentRef?.current || !miniChatRef.current) return;
      const parent = parentRef.current;
      const el = miniChatRef.current;
      const elRect = el ? el.getBoundingClientRect() : { width: 240, height: 120 };
      let nx = ev.clientX - miniDrag.startX;
      let ny = ev.clientY - miniDrag.startY + parent.scrollTop;
      const margin = 8;
      const maxX = parent.clientWidth - elRect.width - margin;
      const maxY = parent.scrollHeight - elRect.height - margin;
      nx = Math.max(margin, Math.min(nx, maxX));
      ny = Math.max(margin, Math.min(ny, maxY));
      setMiniDrag((s) => ({ ...s, x: nx, y: ny }));
    };
    const onUp = () => setMiniDrag((s) => ({ ...s, dragging: false }));
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [miniDrag.dragging, miniDrag.startX, miniDrag.startY, parentRef]);

  return (
    <div
      ref={miniChatRef}
      className={`${miniDrag.floating ? 'z-50' : ''} w-full p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 box-border overflow-hidden`}
      style={miniDrag.floating ? { position: 'absolute', left: miniDrag.x, top: miniDrag.y, right: 8 } : undefined}
    >
      <div className="flex items-center justify-between mb-2 cursor-move select-none" onMouseDown={startMiniDrag}>
        <h3 className="text-sm font-bold text-neon-blue">Mini Chat</h3>
        <button onClick={onOpenChat} className="text-xs text-neon-blue hover:underline">Open</button>
      </div>
      {!hasKey ? (
        <div className="space-y-2">
          <input
            type="password"
            className="w-full p-2 rounded bg-gray-800 text-white"
            placeholder="Enter OpenAI API Key"
            value={miniKeyInput}
            onChange={(e) => setMiniKeyInput(e.target.value)}
          />
          <button onClick={saveMiniKey} className="w-full px-3 py-1 bg-neon-blue text-black rounded">Save Key</button>
        </div>
      ) : (
        <>
          <ul className="space-y-1 mb-2 max-h-24 overflow-auto text-xs">
            {currentConversation.slice(-3).map((m, i) => (
              <li key={i} className="flex">
                <span className="mr-1 text-gray-400">{m.role === 'assistant' ? 'AI:' : 'You:'}</span>
                <span className="truncate">{m.content}</span>
              </li>
            ))}
            {currentConversation.length === 0 && (
              <li className="text-gray-400 text-xs">Start the conversation...</li>
            )}
          </ul>

          {mode === 'ideologram' && currentConversation.length === 0 && (
            <div className="mb-2 p-2 bg-blue-900/20 border border-blue-500/30 rounded text-xs">
              <div className="text-blue-200 mb-1">💡 Worldview Assessment Prompts:</div>
              <div className="space-y-1 text-gray-300">
                {ideologramPrompts.map((p) => (
                  <button key={p.text} onClick={() => setMiniInput(p.text)} className="block w-full text-left hover:bg-blue-800/30 p-1 rounded">{p.label}</button>
                ))}
              </div>
            </div>
          )}

          <div className="flex">
            <input
              className="flex-1 p-1 rounded-l bg-gray-800 text-white border border-gray-700"
              value={miniInput}
              onChange={(e) => setMiniInput(e.target.value)}
              placeholder="Ask..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && miniInput.trim()) {
                  onSend && onSend(miniInput.trim());
                  setMiniInput('');
                }
              }}
            />
            <button
              className="px-2 bg-neon-blue text-black rounded-r disabled:opacity-50"
              disabled={!miniInput.trim()}
              onClick={() => {
                if (!miniInput.trim()) return;
                onSend && onSend(miniInput.trim());
                setMiniInput('');
              }}
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}


