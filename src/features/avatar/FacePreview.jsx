import React, { useMemo } from 'react';

// Simple SVG face preview driven by faceDriver values
// Props: { faceDriver: { smile, surprise, anger, sadness, fear, disgust, eyeOpenness, eyebrowHeight, mouthOpenness, jawPosition, cheekPuff, lipPucker } }
export default function FacePreview({ faceDriver = {} }) {
  const {
    eyeOpenness = 0.5,
    eyebrowHeight = 0.5,
    mouthOpenness = 0.3,
    jawPosition = 0.5,
    lipPucker = 0.0,
    smile = 0.0,
  } = faceDriver;

  // Derived values
  const { eyeH, browY, mouthW, mouthH, smileCurve } = useMemo(() => {
    const clamp = (v, a=0, b=1) => Math.max(a, Math.min(b, v));
    const eyeH = 10 + eyeOpenness * 10; // 10..20
    const browY = 30 - eyebrowHeight * 8; // raise up
    const pucker = clamp(lipPucker);
    const wideFactor = clamp(1 - pucker);
    // Smile widens slightly; frown narrows
    const smileWidthAdj = (smile || 0) * 8; // -8..+8 px
    const baseMouthW = 60 * (0.6 + wideFactor * 0.6) + smileWidthAdj; // ~36..72 +/-
    const baseMouthH = 6 + mouthOpenness * 18; // 6..24
    // Smile sag (positive → sag down, corners up). Map -1..1 → -10..+10 px
    const smileCurve = Math.max(-10, Math.min(10, (smile || 0) * 10));
    return { eyeH, browY, mouthW: baseMouthW, mouthH: baseMouthH, smileCurve };
  }, [eyeOpenness, eyebrowHeight, lipPucker, mouthOpenness, smile]);

  const cx = 100, cy = 100;

  // Mouth path: simple quadratic curve
  const mouthPath = useMemo(() => {
    const width = mouthW;
    const height = mouthH;
    const x0 = cx - width / 2;
    const x1 = cx + width / 2;
    const y = cy + 30 + (jawPosition - 0.5) * 6;
    // top and bottom lips (for openness)
    const topY = y - height / 2;
    const botY = y + height / 2;
    // Both lips sag together by smileCurve (positive → sag down)
    const cpx = cx; const cpyTop = topY + smileCurve; const cpyBot = botY + smileCurve;
    const dTop = `M ${x0} ${topY} Q ${cpx} ${cpyTop} ${x1} ${topY}`;
    const dBot = `M ${x0} ${botY} Q ${cpx} ${cpyBot} ${x1} ${botY}`;
    return { dTop, dBot };
  }, [mouthW, mouthH, smileCurve, jawPosition]);

  // Optional simple blinking: if eyeOpenness is around neutral, add gentle random blink
  // Keep preview deterministic by not adding timers here; rely on external driver if desired.

  return (
    <svg viewBox="0 0 200 200" width={200} height={200} style={{ display: 'block' }}>
      {/* Face background */}
      <circle cx={cx} cy={cy} r={80} fill="#0f172a" stroke="#334155" />

      {/* Eyebrows */}
      <rect x={cx - 38} y={browY} width={28} height={4} rx={2} fill="#94a3b8" />
      <rect x={cx + 10} y={browY} width={28} height={4} rx={2} fill="#94a3b8" />

      {/* Eyes */}
      <ellipse cx={cx - 25} cy={cy - 5} rx={12} ry={eyeH/2} fill="#e2e8f0" />
      <ellipse cx={cx + 25} cy={cy - 5} rx={12} ry={eyeH/2} fill="#e2e8f0" />
      {/* Pupils */}
      <circle cx={cx - 25} cy={cy - 5} r={3} fill="#0f172a" />
      <circle cx={cx + 25} cy={cy - 5} r={3} fill="#0f172a" />

      {/* Mouth */}
      <path d={mouthPath.dTop} stroke="#e2e8f0" strokeWidth={3} fill="none" />
      <path d={mouthPath.dBot} stroke="#e2e8f0" strokeWidth={3} fill="none" />
    </svg>
  );
}
