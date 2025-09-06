import React, { useState } from 'react';
import { setRealtimeVAD, setRealtimePlaybackGain } from './index';

export default function VoiceTuner() {
  const [threshold, setThreshold] = useState(0.035);
  const [hangover, setHangover] = useState(450);
  const [minTurn, setMinTurn] = useState(900);
  const [gain, setGain] = useState(1.0);

  const apply = () => {
    setRealtimeVAD({ threshold: Number(threshold), hangoverMs: Number(hangover), minTurnMs: Number(minTurn) });
    setRealtimePlaybackGain(Number(gain));
  };

  const box = { background: '#0b1220cc', border: '1px solid #334155', padding: 10, borderRadius: 8, color: '#e2e8f0', width: 260 };
  const label = { fontSize: 12, color: '#94a3b8', marginTop: 6 };
  const input = { width: '100%', background: '#111827', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 6, padding: '6px 8px' };

  return (
    <div style={{ position: 'fixed', bottom: 96, right: 16, zIndex: 9996 }}>
      <div style={box}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Voice Tuner</div>
        <div style={label}>VAD Threshold</div>
        <input type="number" step="0.001" value={threshold} onChange={e => setThreshold(e.target.value)} style={input} />
        <div style={label}>VAD Hangover (ms)</div>
        <input type="number" step="10" value={hangover} onChange={e => setHangover(e.target.value)} style={input} />
        <div style={label}>Min Turn (ms)</div>
        <input type="number" step="10" value={minTurn} onChange={e => setMinTurn(e.target.value)} style={input} />
        <div style={label}>Playback Gain</div>
        <input type="number" step="0.1" value={gain} onChange={e => setGain(e.target.value)} style={input} />
        <button onClick={apply} style={{ marginTop: 10, width: '100%', padding: '8px 10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600 }}>Apply</button>
      </div>
    </div>
  );
}

