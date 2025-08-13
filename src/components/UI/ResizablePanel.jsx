import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * ResizablePanel
 * - Vertical resizing via bottom edge handle.
 * - Height is specified in viewport height units (vh) for consistency across layouts.
 * - Persists size in localStorage when `persistKey` is provided.
 *
 * Props:
 *  - initial: { h: number }  // initial height in vh
 *  - min: { h: number }      // min height in vh
 *  - max: { h: number }      // max height in vh
 *  - className: string       // container classes
 *  - persistKey: string      // localStorage key to persist height
 *  - children: ReactNode
 */
export default function ResizablePanel({
  initial = { h: 60 },
  min = { h: 30 },
  max = { h: 90 },
  className = '',
  persistKey,
  children
}) {
  const readPersist = useCallback(() => {
    if (!persistKey) return null;
    try {
      const v = localStorage.getItem(`resizable:${persistKey}`);
      if (!v) return null;
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  }, [persistKey]);

  const persisted = useMemo(() => readPersist(), [readPersist]);
  const [heightVh, setHeightVh] = useState(() => persisted ?? initial.h);
  const drag = useRef({ active: false, startY: 0, startH: heightVh });

  useEffect(() => {
    if (!persistKey) return;
    try { localStorage.setItem(`resizable:${persistKey}`, String(heightVh)); } catch {}
  }, [heightVh, persistKey]);

  const onDown = useCallback((e) => {
    e.preventDefault();
    drag.current = { active: true, startY: e.clientY, startH: heightVh };
    document.body.style.cursor = 'ns-resize';
  }, [heightVh]);

  useEffect(() => {
    const onMove = (e) => {
      if (!drag.current.active) return;
      const dy = e.clientY - drag.current.startY;
      const dvh = (dy / window.innerHeight) * 100;
      const next = Math.max(min.h, Math.min(max.h, drag.current.startH + dvh));
      setHeightVh(next);
    };
    const onUp = () => {
      if (!drag.current.active) return;
      drag.current.active = false;
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [min.h, max.h]);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ height: `${heightVh}vh` }}
    >
      <div className="absolute inset-0 overflow-auto">
        {children}
      </div>
      <div
        onMouseDown={onDown}
        className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize z-10"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.25))'
        }}
      >
        <div className="mx-auto mt-0.5 h-1.5 w-16 rounded-full" style={{ background: 'rgba(92,200,255,0.6)' }} />
      </div>
    </div>
  );
}
