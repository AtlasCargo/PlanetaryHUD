import React, { useEffect, useRef, useState } from 'react';
import { startRealtime, stopRealtime, startTranscribeRecording, stopTranscribeAndUpload } from './index';
import eventBus from '../../shared/events/eventBus';
import { Events } from '../../shared/events/contracts';

export default function VoiceDevWidget() {
  const [rt, setRt] = useState({ connected: false, error: null });
  const [transcribing, setTranscribing] = useState(false);
  const [vu, setVu] = useState(0);
  const [transcript, setTranscript] = useState('');
  const unsubRef = useRef([]);

  useEffect(() => {
    unsubRef.current.push(eventBus.on(Events.VoiceRealtimeConnecting, () => setRt({ connected: false, error: null })));
    unsubRef.current.push(eventBus.on(Events.VoiceRealtimeConnected, () => setRt({ connected: true, error: null })));
    unsubRef.current.push(eventBus.on(Events.VoiceRealtimeError, (p) => setRt({ connected: false, error: p?.error || 'error' })));
    unsubRef.current.push(eventBus.on(Events.VoiceRealtimeVu, (p) => setVu(p?.level || 0)));
    unsubRef.current.push(eventBus.on(Events.VoiceTranscribeFinal, (p) => {
      const text = p?.rawText || '';
      setTranscript(text);
      setTranscribing(false);
    }));
    return () => { unsubRef.current.forEach(fn => fn && fn()); unsubRef.current = []; };
  }, []);

  const onStartRealtime = async () => {
    try { await startRealtime(); } catch {}
  };
  const onStopRealtime = () => { try { stopRealtime(); setRt({ connected: false, error: null }); } catch {} };

  const onStartTranscribe = async () => {
    setTranscribing(true);
    try { await startTranscribeRecording(); } catch { setTranscribing(false); }
  };
  const onStopTranscribe = async () => {
    try { await stopTranscribeAndUpload({ filename: 'audio.webm' }); } catch { setTranscribing(false); }
  };

  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999 }}>
      <div style={{ background: '#0b1220cc', border: '1px solid #334155', padding: 12, borderRadius: 8, color: '#e2e8f0', width: 260 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Voice Dev</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {!rt.connected ? (
            <button onClick={onStartRealtime} style={{ flex: 1, padding: '6px 8px', background: '#0ea5e9', borderRadius: 6, color: 'white', border: 'none' }}>Live</button>
          ) : (
            <button onClick={onStopRealtime} style={{ flex: 1, padding: '6px 8px', background: '#ef4444', borderRadius: 6, color: 'white', border: 'none' }}>Stop</button>
          )}
          {!transcribing ? (
            <button onClick={onStartTranscribe} style={{ flex: 1, padding: '6px 8px', background: '#10b981', borderRadius: 6, color: 'white', border: 'none' }}>Transcribe</button>
          ) : (
            <button onClick={onStopTranscribe} style={{ flex: 1, padding: '6px 8px', background: '#f59e0b', borderRadius: 6, color: 'white', border: 'none' }}>Stop</button>
          )}
        </div>
        <div style={{ height: 6, background: '#1f2937', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ width: `${Math.round(vu * 100)}%`, height: '100%', background: vu > 0.66 ? '#ef4444' : vu > 0.33 ? '#f59e0b' : '#22c55e', transition: 'width 100ms linear' }} />
        </div>
        {rt.error && <div style={{ color: '#fda4af', fontSize: 12 }}>RT error: {rt.error}</div>}
        {transcript && <div style={{ fontSize: 12, color: '#94a3b8' }} title={transcript}>ASR: {transcript.slice(0, 80)}{transcript.length > 80 ? '…' : ''}</div>}
      </div>
    </div>
  );
}

