import React, { useEffect, useRef, useState } from 'react';
import bellaPng from '../../img/bella.png';
import { getCalibration, saveCalibration, defaultCalibration } from './calibration';

const HANDLE_R = 6;

export default function CalibrationOverlay({ width = 360, height = 360, imgSrc = bellaPng, calibKey = 'bella.png', onClose }) {
  const canvasRef = useRef(null);
  const [img, setImg] = useState(null);
  const [anchors, setAnchors] = useState(null);
  const [drag, setDrag] = useState(null);

  useEffect(() => {
    const i = new Image();
    i.onload = () => setImg(i);
    i.src = imgSrc;
  }, [imgSrc]);

  useEffect(() => {
    if (!img) return;
    const c = getCalibration(calibKey) || defaultCalibration(img.width, img.height);
    setAnchors(c);
  }, [img, calibKey]);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const canvas = canvasRef.current; if (!canvas) return;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      const w = width, h = height;
      ctx.clearRect(0, 0, w, h);
      if (!img || !anchors) return;

      // Fit image into canvas
      ctx.drawImage(img, 0, 0, w, h);

      // Draw anchors
      ctx.fillStyle = '#22c55e';
      for (const key of ['leftCorner','rightCorner','topLip','bottomLip']) {
        const p = toCanvas(anchors[key], img, w, h);
        ctx.beginPath(); ctx.arc(p.x, p.y, HANDLE_R, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#94a3b8'; ctx.fillText(key, p.x + 8, p.y - 8);
        ctx.fillStyle = '#22c55e';
      }
      // Helper lines
      ctx.strokeStyle = 'rgba(148,163,184,0.6)'; ctx.lineWidth = 1;
      const lc = toCanvas(anchors.leftCorner, img, w, h);
      const rc = toCanvas(anchors.rightCorner, img, w, h);
      const tl = toCanvas(anchors.topLip, img, w, h);
      const bl = toCanvas(anchors.bottomLip, img, w, h);
      ctx.beginPath(); ctx.moveTo(lc.x, lc.y); ctx.lineTo(rc.x, rc.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tl.x, tl.y); ctx.lineTo(bl.x, bl.y); ctx.stroke();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [img, anchors, width, height]);

  const onPointerDown = (e) => {
    if (!img || !anchors) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left; const py = e.clientY - rect.top;
    const hit = hitTest(px, py, anchors, img, width, height);
    if (hit) setDrag({ key: hit, dx: 0, dy: 0 });
  };
  const onPointerMove = (e) => {
    if (!drag || !img || !anchors) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left; const py = e.clientY - rect.top;
    const inv = toImage({ x: px, y: py }, img, width, height);
    setAnchors(prev => ({ ...prev, [drag.key]: { x: inv.x, y: inv.y } }));
  };
  const onPointerUp = () => setDrag(null);

  const onSave = () => { if (anchors) saveCalibration(calibKey, anchors); onClose && onClose(); };
  const onReset = () => { if (img) setAnchors(defaultCalibration(img.width, img.height)); };

  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-300">Calibrate Mouth Anchors</div>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600" onClick={onReset}>Reset</button>
          <button className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500" onClick={onSave}>Save</button>
          <button className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600" onClick={onClose}>Close</button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ display: 'block', touchAction: 'none', cursor: drag ? 'grabbing' : 'grab' }}
      />
    </div>
  );
}

function toCanvas(pt, img, w, h) {
  // Assume img is fit to canvas; map image coords proportionally
  return { x: (pt.x / img.width) * w, y: (pt.y / img.height) * h };
}
function toImage(pt, img, w, h) {
  return { x: (pt.x / w) * img.width, y: (pt.y / h) * img.height };
}
function hitTest(px, py, anchors, img, w, h) {
  for (const key of ['leftCorner','rightCorner','topLip','bottomLip']) {
    const p = toCanvas(anchors[key], img, w, h);
    const dx = px - p.x, dy = py - p.y;
    if (dx*dx + dy*dy <= HANDLE_R*HANDLE_R + 4) return key;
  }
  return null;
}

