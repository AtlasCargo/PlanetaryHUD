import React, { useEffect, useState } from 'react';
import eventBus from '../../shared/events/eventBus';
import { Events } from '../../shared/events/contracts';

export default function RealtimeCaptionOverlay() {
  const [line, setLine] = useState('');
  const [finals, setFinals] = useState([]);

  useEffect(() => {
    const off = eventBus.on(Events.VoiceRealtimeTextDelta, (p) => {
      if (!p) return;
      if (p.isFinal) {
        setFinals((prev) => [...prev.slice(-2), p.text]);
        setLine('');
      } else if (p.text) {
        setLine((prev) => (prev + p.text).slice(-400));
      }
    });
    return () => off();
  }, []);

  const display = (finals.join(' ') + ' ' + line).trim();
  if (!display) return null;

  return (
    <div style={{ position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)', zIndex: 9997 }}>
      <div style={{
        padding: '8px 12px',
        background: '#0b1220e6',
        border: '1px solid #334155',
        borderRadius: 8,
        color: '#e2e8f0',
        maxWidth: 720,
        fontSize: 14
      }}>{display}</div>
    </div>
  );
}

