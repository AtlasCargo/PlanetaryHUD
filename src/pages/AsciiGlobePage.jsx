import React from 'react';
import AsciiGlobe from '../features/ascii/AsciiGlobe';

export default function AsciiGlobePage() {
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: '#0a0' }}>ASCII Globe (1 fps, 800x450)</h2>
      <div style={{ width: 800, height: 450 }}>
        <AsciiGlobe cols={160} rows={90} fps={1} spinDegPerSec={6} globeScale={1.08} showBorders={true} />
      </div>
      <div style={{ marginTop: 12, color: '#888', fontFamily: 'monospace' }}>
        Tip: Place a GeoJSON at <code>public/geo/countries.geojson</code> to draw borders.
      </div>
    </div>
  );
}
