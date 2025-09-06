// src/features/voice/recorder.js
// Simple MediaRecorder wrapper with basic VU metering.

export function createRecorder({ mimeType } = {}) {
  let mediaStream = null;
  let mediaRecorder = null;
  let chunks = [];
  let audioContext = null;
  let analyser = null;
  let source = null;
  let vuRaf = null;

  const onVu = new Set();

  function startVu() {
    if (!audioContext || !analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    const loop = () => {
      analyser.getByteTimeDomainData(data);
      // Compute RMS
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128; sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const level = Math.max(0, Math.min(1, rms * 2));
      onVu.forEach(fn => { try { fn(level); } catch (_) {} });
      vuRaf = requestAnimationFrame(loop);
    };
    vuRaf = requestAnimationFrame(loop);
  }

  async function start() {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const supported = [
      mimeType,
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ].find(t => !!t && MediaRecorder.isTypeSupported(t));
    mediaRecorder = new MediaRecorder(mediaStream, supported ? { mimeType: supported } : undefined);
    chunks = [];
    mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.start(100); // gather in small chunks

    // VU setup
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source = audioContext.createMediaStreamSource(mediaStream);
    source.connect(analyser);
    startVu();
  }

  async function stop() {
    return new Promise(resolve => {
      if (!mediaRecorder) return resolve(null);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        cleanup();
        resolve(blob);
      };
      mediaRecorder.stop();
      // Stop tracks
      try { mediaStream.getTracks().forEach(t => t.stop()); } catch {}
    });
  }

  function cleanup() {
    if (vuRaf) cancelAnimationFrame(vuRaf);
    vuRaf = null;
    try { if (source) source.disconnect(); } catch {}
    try { if (analyser) analyser.disconnect(); } catch {}
    try { if (audioContext) audioContext.close(); } catch {}
    source = null; analyser = null; audioContext = null;
    mediaRecorder = null; mediaStream = null; chunks = [];
  }

  function onVuMeter(fn) { onVu.add(fn); return () => onVu.delete(fn); }

  return { start, stop, onVuMeter };
}

