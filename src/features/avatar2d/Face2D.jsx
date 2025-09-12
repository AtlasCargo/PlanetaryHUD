import React, { useEffect, useRef, useState } from 'react';
import bellaPng from '../../img/bella.png';
import eventBus from '../../shared/events/eventBus';
import { Events } from '../../shared/events/contracts';
import { getCalibration, defaultCalibration } from './calibration';

export default function Face2D({ width = 240, height = 240, imgSrc = bellaPng, liveBlend = 1.0, calibKey = 'bella.png' }) {
  const canvasRef = useRef(null);
  const [img, setImg] = useState(null);
  const visemeRef = useRef({ JawOpen: 0, MouthPucker: 0, MouthWide: 0.5 });
  const calibRef = useRef(null);

  useEffect(() => {
    const i = new Image();
    i.onload = () => setImg(i);
    i.src = imgSrc;
  }, [imgSrc]);

  useEffect(() => {
    if (!img) return;
    const c = getCalibration(calibKey) || defaultCalibration(img.width, img.height);
    calibRef.current = c;
  }, [img, calibKey]);

  useEffect(() => {
    const off = eventBus.on(Events.VoiceAvatarViseme, (p) => {
      if (!p || !p.shapes) return;
      const { JawOpen = 0, MouthPucker = 0, MouthWide = 0.5 } = p.shapes;
      visemeRef.current = { JawOpen, MouthPucker, MouthWide };
    });
    return () => off();
  }, []);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = width, h = height;
      ctx.clearRect(0, 0, w, h);
      if (!img) return;

      // Draw base image
      ctx.drawImage(img, 0, 0, w, h);

      // Mouth overlay (anchored by calibration)
      const { JawOpen, MouthPucker, MouthWide } = visemeRef.current;
      const jaw = clamp01(JawOpen) * liveBlend;
      const pucker = clamp01(MouthPucker) * liveBlend;
      const wide = clamp01(MouthWide);
      const c = calibRef.current || defaultCalibration(w, h);
      const cx = (c.leftCorner.x + c.rightCorner.x) / 2;
      const cy = (c.topLip.y + c.bottomLip.y) / 2;
      const baseW = (c.rightCorner.x - c.leftCorner.x);
      const baseH = Math.max(6, (c.bottomLip.y - c.topLip.y));
      const mouthW = baseW * (1 + (wide - 0.5) * 0.6 - pucker * 0.3);
      const mouthH = baseH * (1 + jaw * 1.4);
      const mouthX = cx - mouthW / 2;
      const mouthY = cy - mouthH / 2 + jaw * (h * 0.015);

      ctx.save();
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = '#0b1220';
      roundRect(ctx, mouthX, mouthY, mouthW, mouthH, Math.max(4, mouthH * 0.3));
      ctx.fill();

      if (jaw > 0.05) {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#e5e7eb';
        const teethH = mouthH * 0.18;
        ctx.fillRect(mouthX + mouthW * 0.10, mouthY + mouthH * 0.20, mouthW * 0.80, teethH);
      }

      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 2;
      roundRect(ctx, mouthX, mouthY, mouthW, mouthH, Math.max(4, mouthH * 0.3));
      ctx.stroke();
      ctx.restore();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [img, width, height, liveBlend]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
}

function clamp01(v){ return Math.max(0, Math.min(1, v)); }

function roundRect(ctx, x, y, w, h, r) {
  const br = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + br, y);
  ctx.arcTo(x + w, y, x + w, y + h, br);
  ctx.arcTo(x + w, y + h, x, y + h, br);
  ctx.arcTo(x, y + h, x, y, br);
  ctx.arcTo(x, y, x + w, y, br);
  ctx.closePath();
}
