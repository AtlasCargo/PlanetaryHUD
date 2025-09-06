import React, { useEffect, useState } from 'react';
import eventBus from '../../shared/events/eventBus';
import { Events } from '../../shared/events/contracts';

export default function TooltipLayer() {
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    const unsubShow = eventBus.on(Events.UiTooltipShow, (payload) => {
      setTooltip(payload);
    });
    const unsubHide = eventBus.on(Events.UiTooltipHide, () => {
      setTooltip(null);
    });
    return () => { unsubShow(); unsubHide(); };
  }, []);

  if (!tooltip) return null;

  const { x = 0, y = 0, content } = tooltip;
  return (
    <div
      style={{
        position: 'fixed',
        left: `${x + 20}px`,
        top: `${y - 20}px`,
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


