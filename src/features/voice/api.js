// src/features/voice/api.js
// Thin API client for voice endpoints using the existing axios instance.

import API from '../../utils/api';

export async function requestRealtimeSession(opts = {}) {
  const { voice = 'verse', inputAudioFormat = 'pcm16', outputAudioFormat = 'pcm16' } = opts;
  const res = await API.post('/api/realtime-session', { voice, inputAudioFormat, outputAudioFormat });
  return res.data;
}

export async function uploadTranscribe(blob, { filename = 'audio.webm', language, hints } = {}) {
  const fd = new FormData();
  if (blob) fd.append('file', blob, filename);
  if (language) fd.append('language', language);
  if (Array.isArray(hints)) fd.append('hints', JSON.stringify(hints));
  const res = await API.post('/api/transcribe', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data;
}

export async function correctTranscript(payload) {
  const res = await API.post('/api/transcribe/correct', payload);
  return res.data;
}

