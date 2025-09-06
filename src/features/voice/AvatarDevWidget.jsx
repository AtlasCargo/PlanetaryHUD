import React, { useEffect, useState } from 'react';
import eventBus from '../../shared/events/eventBus';
import { Events } from '../../shared/events/contracts';

export default function AvatarDevWidget() {
  const [shapes, setShapes] = useState({ JawOpen: 0, MouthWide: 0, MouthPucker: 0 });
  useEffect(() => {
    const off = eventBus.on(Events.VoiceAvatarViseme, (p) => {
      if (p && p.shapes) setShapes(p.shapes);
    });
    return () => off();
  }, []);

  const Bar = ({ label, value, color }) => (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{label} {Math.round(value * 100)}%</div>
      <div style={{ height: 6, background: '#1f2937', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(value * 100)}%`, height: '100%', background: color, transition: 'width 80ms linear' }} />
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', bottom: 180, right: 16, zIndex: 9999 }}>
      <div style={{ background: '#0b1220cc', border: '1px solid #334155', padding: 12, borderRadius: 8, color: '#e2e8f0', width: 260 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Avatar Dev</div>
        <Bar label="JawOpen" value={shapes.JawOpen || 0} color="#22c55e" />
        <Bar label="MouthWide" value={shapes.MouthWide || 0} color="#0ea5e9" />
        <Bar label="MouthPucker" value={shapes.MouthPucker || 0} color="#f59e0b" />
      </div>
    </div>
  );
}

