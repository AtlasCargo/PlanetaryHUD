// src/features/voice/realtimeClient.js
// Placeholder client for OpenAI Realtime. Browser-friendly path is WebRTC; WS
// fallback requires a server proxy to attach Authorization headers.
// This module exposes a minimal interface and emits events; actual transport
// will be implemented once the proxy or WebRTC flow is wired.

import eventBus from '../../shared/events/eventBus';
import { Events } from '../../shared/events/contracts';
import { LipSyncDriver } from './lipsync';

export class RealtimeClient {
  constructor(session) {
    this.session = session; // { token, model, ... }
    this.connected = false;
    this.ws = null;
    this.audioContext = null;
    this.processor = null;
    this.stream = null;
    this.source = null;
    this.sampleTarget = 16000;
    this._pendingSamples = [];
    this._vuRaf = null;
    // Simple VAD config/state
    this.vad = {
      enabled: true,
      threshold: 0.035, // RMS threshold (tweak per mic)
      hangoverMs: 450,  // pause duration to trigger commit
      minTurnMs: 900,   // minimum captured audio before committing
      lastSpeechTs: 0,
      lastCommitTs: 0,
      capturedMs: 0,
    };
    // Playback pipeline
    this.playContext = null;
    this.playProcessor = null;
    this.playQueue = [];
    this.playSampleRate = 24000; // assumed remote sample rate
    this.lipsync = new LipSyncDriver();
  }

  async connect() {
    const token = this.session?.token;
    const model = this.session?.model || 'gpt-4o-realtime-preview';
    const httpBase = (process.env.REACT_APP_API_URL || 'http://127.0.0.1:5999');
    const base = httpBase.replace(/^http/, 'ws');
    const url = `${base}/api/realtime/ws?token=${encodeURIComponent(token || '')}&model=${encodeURIComponent(model)}`;
    this.ws = new WebSocket(url);
    this.ws.binaryType = 'arraybuffer';
    this.ws.onopen = () => {
      this.connected = true;
      eventBus.emit(Events.VoiceRealtimeConnected, { session: this.session });
    };
    this.ws.onclose = () => { this.connected = false; };
    this.ws.onerror = () => { eventBus.emit(Events.VoiceRealtimeError, { error: 'ws error' }); };
    this.ws.onmessage = (evt) => {
      const data = evt.data;
      if (typeof data === 'string') {
        try {
          const msg = JSON.parse(data);
          // Map OpenAI Realtime events to our bus when possible
          if (msg.type === 'response.output_text.delta' && msg.delta) {
            eventBus.emit(Events.VoiceRealtimeTextDelta, { text: msg.delta, isFinal: false });
          } else if (msg.type === 'response.output_text.done' && (msg.text || msg.output_text)) {
            const text = msg.text || msg.output_text;
            eventBus.emit(Events.VoiceRealtimeTextDelta, { text, isFinal: true });
          }
          if (msg.type === 'response.audio.delta' && (msg.delta || msg.audio)) {
            const b64 = msg.delta || msg.audio;
            this._queuePlaybackBase64PCM16(b64);
            // Also feed to lipsync
            try {
              const int16 = this._fromBase64ToInt16(b64);
              const float32 = new Float32Array(int16.length);
              for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
              this.lipsync.onAudioFrame(float32, this.playSampleRate);
            } catch {}
          }
        } catch {}
      } else if (data instanceof ArrayBuffer) {
        eventBus.emit(Events.VoiceRealtimeAudioDelta, { data });
      }
    };
  }

  async close() {
    try { if (this.ws) this.ws.close(); } catch {}
    this.connected = false;
    await this.stopMic();
  }

  async startMic() {
    if (!this.connected) throw new Error('Realtime not connected');
    if (this.stream) return;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    const bufferSize = 2048; // ~42ms @48kHz
    const processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    this.processor = processor;
    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const resampled = this._downsample(input, this.audioContext.sampleRate, this.sampleTarget);
      if (resampled && resampled.length) {
        // VU meter
        let sum = 0; for (let i = 0; i < resampled.length; i++) { const v = resampled[i]; sum += v*v; }
        const rms = Math.sqrt(sum / resampled.length); const level = Math.max(0, Math.min(1, rms*2));
        eventBus.emit(Events.VoiceRealtimeVu, { level });
        // Feed lipsync from mic audio as well (drives 2D/3D avatar when speaking)
        try { this.lipsync.onAudioFrame(resampled, this.sampleTarget); } catch {}
        // Encode and send
        const pcm16 = this._floatToPCM16(resampled);
        const b64 = this._toBase64(pcm16.buffer);
        this._sendJson({ type: 'input_audio_buffer.append', audio: b64 });

        // VAD turn detection
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const chunkMs = (resampled.length / this.sampleTarget) * 1000;
        this.vad.capturedMs += chunkMs;
        if (level >= this.vad.threshold) {
          this.vad.lastSpeechTs = now;
        } else {
          const silenceMs = now - this.vad.lastSpeechTs;
          const sinceCommitMs = now - this.vad.lastCommitTs;
          if (this.vad.enabled && this.vad.capturedMs >= this.vad.minTurnMs && silenceMs >= this.vad.hangoverMs && sinceCommitMs >= 600) {
            this.commitAndRequest('Transcribe the user utterance and reply succinctly.');
            this.vad.lastCommitTs = now;
            this.vad.capturedMs = 0;
          }
        }
      }
    };
    this.source.connect(processor);
    processor.connect(this.audioContext.destination);
  }

  async stopMic() {
    try { if (this.processor) this.processor.disconnect(); } catch {}
    try { if (this.source) this.source.disconnect(); } catch {}
    try { if (this.audioContext) await this.audioContext.close(); } catch {}
    if (this.stream) {
      try { this.stream.getTracks().forEach(t => t.stop()); } catch {}
    }
    this.processor = null; this.source = null; this.audioContext = null; this.stream = null;
  }

  commitAndRequest(prompt = 'Transcribe the user and respond briefly.') {
    if (!this.connected || !this.ws) return;
    this._sendJson({ type: 'input_audio_buffer.commit' });
    this._sendJson({ type: 'response.create', response: { instructions: prompt } });
  }

  _sendJson(obj) {
    try { if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj)); } catch {}
  }

  _downsample(buffer, inRate, outRate) {
    if (outRate === inRate) return buffer;
    const ratio = inRate / outRate;
    const newLen = Math.floor(buffer.length / ratio);
    if (newLen <= 0) return null;
    const result = new Float32Array(newLen);
    let pos = 0;
    for (let i = 0; i < newLen; i++) {
      const nextPos = Math.round((i+1) * ratio);
      let sum = 0; let count = 0;
      for (; pos < nextPos && pos < buffer.length; pos++) { sum += buffer[pos]; count++; }
      result[i] = count ? (sum / count) : 0;
    }
    return result;
  }

  _floatToPCM16(float32) {
    const out = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      let s = Math.max(-1, Math.min(1, float32[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }

  _toBase64(arrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      const slice = bytes.subarray(i, i + chunk);
      binary += String.fromCharCode.apply(null, slice);
    }
    return btoa(binary);
  }

  _fromBase64ToInt16(b64) {
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return new Int16Array(bytes.buffer);
  }

  _queuePlaybackBase64PCM16(b64) {
    try {
      const int16 = this._fromBase64ToInt16(b64);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
      this._enqueuePlayback(float32, this.playSampleRate);
    } catch {}
  }

  _enqueuePlayback(float32, srcRate) {
    if (!this.playContext) {
      this.playContext = new (window.AudioContext || window.webkitAudioContext)();
      const proc = this.playContext.createScriptProcessor(1024, 1, 1);
      this.playProcessor = proc;
      proc.onaudioprocess = (e) => {
        const out = e.outputBuffer.getChannelData(0);
        let written = 0;
        while (written < out.length && this.playQueue.length) {
          const chunk = this.playQueue[0];
          const remaining = out.length - written;
          const take = Math.min(remaining, chunk.length);
          out.set(chunk.subarray(0, take), written);
          written += take;
          if (take < chunk.length) {
            this.playQueue[0] = chunk.subarray(take);
          } else {
            this.playQueue.shift();
          }
        }
        // Fill rest with zeros
        for (let i = written; i < out.length; i++) out[i] = 0;
      };
      proc.connect(this.playContext.destination);
    }
    const dstRate = this.playContext.sampleRate;
    const resampled = (srcRate === dstRate) ? float32 : this._resampleFloat32(float32, srcRate, dstRate);
    this.playQueue.push(resampled);
  }

  _resampleFloat32(buffer, inRate, outRate) {
    if (inRate === outRate) return buffer;
    const ratio = inRate / outRate;
    const newLen = Math.max(1, Math.floor(buffer.length / ratio));
    const result = new Float32Array(newLen);
    let pos = 0;
    for (let i = 0; i < newLen; i++) {
      const nextPos = Math.round((i+1) * ratio);
      let sum = 0; let count = 0;
      for (; pos < nextPos && pos < buffer.length; pos++) { sum += buffer[pos]; count++; }
      result[i] = count ? (sum / count) : 0;
    }
    return result;
  }
}
