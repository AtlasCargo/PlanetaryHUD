import React, { useEffect, useRef, useState } from 'react';
import eventBus from '../../shared/events/eventBus';
import { Events } from '../../shared/events/contracts';

export default function TooltipLayer() {
  const [tooltip, setTooltip] = useState(null);
  const lastMouse = useRef({ x: null, y: null });
  const anchorRef = useRef(null);

  // Track last mouse position for fallbacks when events omit coordinates
  useEffect(() => {
    const onMove = (e) => { lastMouse.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    const unsubShow = eventBus.on(Events.UiTooltipShow, (payload) => {
      // Require valid coordinates; otherwise ignore (prevents 0,0 flash)
      const hasX = payload && typeof payload.x === 'number';
      const hasY = payload && typeof payload.y === 'number';
      if (!hasX || !hasY) return; // drop
      let { x, y } = payload;
      // Debounce rapid streams from RAF: clamp to last known mouse position if far off-screen
      const vpW = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const vpH = typeof window !== 'undefined' ? window.innerHeight : 1080;
      if (x < 0 || y < 0 || x > vpW || y > vpH) {
        if (lastMouse.current.x != null && lastMouse.current.y != null) {
          x = lastMouse.current.x;
          y = lastMouse.current.y;
        } else {
          return; // drop if invalid and no fallback
        }
      }
      setTooltip({ ...payload, x, y });
    });
    const unsubHide = eventBus.on(Events.UiTooltipHide, () => {
      setTooltip(null);
    });
    return () => { unsubShow(); unsubHide(); };
  }, []);

  // Hide tooltip when user leaves the window/tab or switches apps
  useEffect(() => {
    const handleHide = () => { setTooltip(null); try { eventBus.emit(Events.UiTooltipHide); } catch {} };
    const onVisibility = () => { if (document.hidden) handleHide(); };
    const onWindowMouseOut = (e) => { if (!e.relatedTarget && !e.toElement) handleHide(); };
    window.addEventListener('blur', handleHide);
    window.addEventListener('pagehide', handleHide);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('mouseout', onWindowMouseOut);
    return () => {
      window.removeEventListener('blur', handleHide);
      window.removeEventListener('pagehide', handleHide);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('mouseout', onWindowMouseOut);
    };
  }, []);

  if (!tooltip) return null;

  const { x, y, content } = tooltip;
  // Clamp within viewport and center-pane bounds, and apply slight offset
  const offsetX = 20;
  const offsetY = -20;
  const estWidth = 260; // conservative estimate to avoid off-screen
  const estHeight = 120;
  const vpW = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const vpH = typeof window !== 'undefined' ? window.innerHeight : 1080;
  let left = Math.max(0, Math.min((x ?? 0) + offsetX, vpW - estWidth));
  let top = Math.max(0, Math.min((y ?? 0) + offsetY, vpH - estHeight));

  // Further clamp to the central pane bounds if available
  try {
    const center = document.querySelector('[data-test="center-pane"]');
    const topHud = document.querySelector('[data-test="top-hud"]');
    if (center) {
      const r = center.getBoundingClientRect();
      const minLeft = Math.max(0, r.left + 8);
      const maxLeft = Math.min(vpW - estWidth, r.right - estWidth - 8);
      let minTop = Math.max(0, r.top + 8);
      // Always clamp below the top HUD bottom if present
      if (topHud) {
        const tr = topHud.getBoundingClientRect();
        minTop = Math.max(minTop, tr.bottom + 8);
      }
      const maxTop = Math.min(vpH - estHeight, r.bottom - estHeight - 8);
      left = Math.max(minLeft, Math.min(left, maxLeft));
      top = Math.max(minTop, Math.min(top, maxTop));
    }
  } catch {}

  // If coords are (0,0) or missing, anchor to globe container center (fallback)
  if ((x === 0 && y === 0) || x == null || y == null) {
    try {
      const el = document.querySelector('[data-test="globe-container"]') || document.querySelector('canvas');
      if (el) {
        const r = el.getBoundingClientRect();
        left = Math.round(r.left + r.width / 2 - estWidth / 2);
        top = Math.round(r.top + r.height + 8); // below globe
      }
    } catch {}
  }
  return (
    <div
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '8px',
        zIndex: 9999,
        borderLeft: '3px solid rgba(57,255,20,0.8)',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'none',
        minWidth: '200px'
      }}
    >
      {content}
    </div>
  );
}


