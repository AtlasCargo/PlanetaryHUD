// src/features/voice/index.js
// Public, UI-neutral voice helpers that emit events and call server stubs.

import eventBus from '../../shared/events/eventBus';
import { Events } from '../../shared/events/contracts';
import { requestRealtimeSession, uploadTranscribe, correctTranscript } from './api';
import { extractLowConfidence } from './transcribe';
import { createRecorder } from './recorder';
import { RealtimeClient } from './realtimeClient';

let realtimeActive = false;
let recorder = null;
let rtClient = null;

export async function startRealtime(options = {}) {
  if (realtimeActive) return;
  realtimeActive = true;
  eventBus.emit(Events.VoiceRealtimeConnecting, {});
  try {
    // Allow VAD tuning via options.vad
    const session = await requestRealtimeSession(options);
    rtClient = new RealtimeClient(session);
    if (options.vad) {
      Object.assign(rtClient.vad, options.vad);
    }
    await rtClient.connect();
    // Start mic streaming; VAD will auto-commit on pause
    try { await rtClient.startMic(); } catch (e) { console.warn('Realtime mic start failed', e); }
    return session;
  } catch (err) {
    eventBus.emit(Events.VoiceRealtimeError, { error: err?.message || String(err) });
    realtimeActive = false;
    throw err;
  }
}

export function stopRealtime() {
  if (!realtimeActive) return;
  // Close peer/socket in a later phase
  realtimeActive = false;
  try { if (rtClient) rtClient.close(); } catch {}
  rtClient = null;
}

export async function startTranscribeRecording(recorderOpts = {}) {
  if (recorder) return recorder;
  recorder = createRecorder(recorderOpts);
  const unsub = recorder.onVuMeter(level => eventBus.emit(Events.VoiceRealtimeVu, { level }));
  try {
    await recorder.start();
    eventBus.emit(Events.VoiceTranscribeStart, {});
    recorder._unsub = unsub;
    return recorder;
  } catch (err) {
    unsub();
    recorder = null;
    throw err;
  }
}

export async function stopTranscribeAndUpload({ filename = 'audio.webm', language, hints } = {}) {
  if (!recorder) return null;
  try {
    const blob = await recorder.stop();
    if (recorder._unsub) { try { recorder._unsub(); } catch {} }
    recorder = null;
    const result = await uploadTranscribe(blob, { filename, language, hints });
    const finalPayload = { segments: result.segments || [], rawText: result.rawText || '' };
    eventBus.emit(Events.VoiceTranscribeFinal, finalPayload);
    // Attempt low-confidence correction
    try {
      const low = extractLowConfidence(result, 0.6);
      if (low) {
        const corrected = await correctTranscript({ segment: low, context: { left: '', right: '', domain: language || 'en' }, language });
        eventBus.emit(Events.VoiceTranscribeCorrected, { segments: result.segments || [], corrections: corrected });
      }
    } catch {}
    return result;
  } catch (err) {
    recorder = null;
    throw err;
  }
}

export async function runCorrection(segment, context = {}, language) {
  const payload = { segment, context, language };
  const result = await correctTranscript(payload);
  eventBus.emit(Events.VoiceTranscribeCorrected, { segments: segment?.segments || [], corrections: result });
  return result;
}

// Utility controls for realtime client
export function clearRealtimeAudio() {
  try { if (rtClient) rtClient.clearPlayback(); } catch {}
}

export function setRealtimePlaybackGain(gain) {
  try { if (rtClient) rtClient.setPlaybackGain(gain); } catch {}
}

export function cancelRealtimeResponse() {
  try { if (rtClient) rtClient.cancelResponse(); } catch {}
}

export function setRealtimeVAD(opts) {
  try { if (rtClient) rtClient.updateVAD(opts); } catch {}
}
