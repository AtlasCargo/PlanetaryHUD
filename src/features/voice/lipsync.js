// src/features/voice/lipsync.js
// Lightweight lip-sync envelope driver: computes simple viseme values from PCM frames.
// Avoids heavy FFT deps; uses RMS (energy) and zero-crossing rate as proxies.

import eventBus from '../../shared/events/eventBus';
import { Events } from '../../shared/events/contracts';

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

export class LipSyncDriver {
  constructor({ emit = true } = {}) {
    this.emit = emit;
    this.lastShapes = { JawOpen: 0, MouthWide: 0, MouthPucker: 0 };
    this.t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }

  onAudioFrame(float32, sampleRate) {
    if (!float32 || !float32.length) return this.lastShapes;
    const n = float32.length;
    // Energy
    let sum = 0; let zc = 0; let prev = float32[0];
    for (let i = 0; i < n; i++) {
      const v = float32[i];
      sum += v * v;
      if ((v >= 0 && prev < 0) || (v < 0 && prev >= 0)) zc++;
      prev = v;
    }
    const rms = Math.sqrt(sum / n);
    const zcr = zc / n; // 0..~0.5 typical
    // Map to visemes
    const JawOpen = clamp01(rms * 3.2); // scale energy
    // Map zcr (~0..0.5) to puckered vs wide
    const pucker = clamp01((zcr - 0.10) / 0.20); // more high-freq → more pucker
    const wide = clamp01(1.0 - pucker);
    // Smooth with simple lerp
    const alpha = 0.35;
    const shapes = {
      JawOpen: this.lastShapes.JawOpen + alpha * (JawOpen - this.lastShapes.JawOpen),
      MouthPucker: this.lastShapes.MouthPucker + alpha * (pucker - this.lastShapes.MouthPucker),
      MouthWide: this.lastShapes.MouthWide + alpha * (wide - this.lastShapes.MouthWide),
    };
    this.lastShapes = shapes;
    if (this.emit) {
      const nowMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const tSec = (nowMs - this.t0) / 1000;
      eventBus.emit(Events.VoiceAvatarViseme, { tSec, shapes });
    }
    return shapes;
  }
}

