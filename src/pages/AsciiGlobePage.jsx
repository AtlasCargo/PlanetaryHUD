import React from 'react';
import AsciiGlobe from '../features/ascii/AsciiGlobe';
import AsciiMap from '../features/ascii/AsciiMap';
import AsciiWebGlobe from '../features/ascii/AsciiWebGlobe';

export default function AsciiGlobePage() {
  const [shading, setShading] = React.useState(false);
  const [showGrid, setShowGrid] = React.useState(false);
  const [flatMap, setFlatMap] = React.useState(true);
  const [useWebGL, setUseWebGL] = React.useState(false);
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: '#0a0' }}>ASCII Globe (1 fps, 800x450)</h2>
      <div style={{ marginBottom: 8 }}>
        <button
          onClick={() => setShading(s => !s)}
          style={{
            background: '#0a0', color: '#000', border: 'none', padding: '6px 10px',
            fontFamily: 'monospace', cursor: 'pointer', borderRadius: 4
          }}
        >
          {shading ? 'Disable Shading' : 'Enable Shading'}
        </button>
        <button
          onClick={() => setShowGrid(g => !g)}
          style={{
            background: '#0a0', color: '#000', border: 'none', padding: '6px 10px',
            fontFamily: 'monospace', cursor: 'pointer', borderRadius: 4, marginLeft: 8
          }}
        >
          {showGrid ? 'Hide Grid' : 'Show Grid'}
        </button>
        <button
          onClick={() => setFlatMap(m => !m)}
          style={{
            background: '#0a0', color: '#000', border: 'none', padding: '6px 10px',
            fontFamily: 'monospace', cursor: 'pointer', borderRadius: 4, marginLeft: 8
          }}
        >
          {flatMap ? 'Show Globe' : 'Show Flat Map'}
        </button>
        {!flatMap && (
          <button
            onClick={() => setUseWebGL(w => !w)}
            style={{
              background: '#0a0', color: '#000', border: 'none', padding: '6px 10px',
              fontFamily: 'monospace', cursor: 'pointer', borderRadius: 4, marginLeft: 8
            }}
          >
            {useWebGL ? 'Use Software Renderer' : 'Use WebGL Renderer'}
          </button>
        )}
      </div>
      <div style={{ width: 800, height: 450 }}>
        {flatMap ? (
          <AsciiMap
            cols={160}
            rows={90}
            showBorders={true}
            borderChar={'#'}
            showGrid={showGrid}
            gridEveryDeg={30}
          />
        ) : useWebGL ? (
          <AsciiWebGlobe cols={160} rows={90} fps={1} spinDegPerSec={6} />
        ) : (
          <AsciiGlobe
            cols={160}
            rows={90}
            fps={1}
            spinDegPerSec={6}
            globeScale={1.06}
            useLandMask={true}
            landChar={'#'}
            waterChar={' '}
            showBorders={false}
            shading={shading}
            showGrid={showGrid}
            fillChar={' '}
            flipHorizontal={true}
          />
        )}
      </div>
      <div style={{ marginTop: 12, color: '#888', fontFamily: 'monospace' }}>
        Tip: Place a GeoJSON at <code>public/geo/countries.geojson</code> to draw borders.
      </div>
    </div>
  );
}
