import React, { useEffect, useState } from 'react';
import { startRealtime, stopRealtime, startTranscribeRecording, stopTranscribeAndUpload } from './index';
import eventBus from '../../shared/events/eventBus';
import { Events } from '../../shared/events/contracts';

export default function VoiceButtons() {
  const [rtConnected, setRtConnected] = useState(false);
  const [pttActive, setPttActive] = useState(false);

  useEffect(() => {
    const off1 = eventBus.on(Events.VoiceRealtimeConnected, () => setRtConnected(true));
    const off2 = eventBus.on(Events.VoiceRealtimeError, () => setRtConnected(false));
    return () => { off1(); off2(); };
  }, []);

  const onToggleRealtime = async () => {
    try {
      if (!rtConnected) {
        await startRealtime();
      } else {
        stopRealtime();
      }
    } catch {}
  };

  const onTogglePTT = async () => {
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

  const btn = (label, onClick, activeColor, inactiveColor) => (
    <button onClick={onClick} style={{
      flex: 1,
      padding: '10px 12px',
      background: activeColor,
      borderRadius: 8,
      color: 'white',
      border: 'none',
      fontWeight: 600
    }}>{label}</button>
  );

  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9998 }}>
      <div style={{ display: 'flex', gap: 10, background: '#0b1220cc', border: '1px solid #334155', padding: 10, borderRadius: 10 }}>
        {btn(rtConnected ? 'Stop Live' : 'Live (Realtime)', onToggleRealtime, rtConnected ? '#ef4444' : '#0ea5e9', '#0ea5e9')}
        {btn(pttActive ? 'Stop' : 'Transcribe', onTogglePTT, pttActive ? '#f59e0b' : '#10b981', '#10b981')}
      </div>
    </div>
  );
}

