import React from 'react';

export default function AsciiMap({
  cols = 160,
  rows = 90,
  showGrid = true,
  gridEveryDeg = 30,
  showBorders = true,
  bordersUrl = '/geo/countries.geojson',
  bordersDecimate = 1,
  borderChar = '#',
  fill = false,
  widthPx = 800,
  heightPx = 450,
  className = ''
}) {
  const preRef = React.useRef(null);
  const wrapperRef = React.useRef(null);
  const [fontSizePx, setFontSizePx] = React.useState(5);
  const [frame, setFrame] = React.useState('');
  const [borders, setBorders] = React.useState(null); // Array<Polyline: [lon,lat][]>

  // Auto-size font to container
  React.useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const resize = () => {
      const rect = el.getBoundingClientRect();
      const fs = Math.max(2, Math.floor(Math.min(rect.width / cols, rect.height / rows)));
      setFontSizePx(fs);
    };
    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(el);
    return () => obs.disconnect();
  }, [cols, rows, fill]);

  // Load borders (no densification needed for flat map; the dataset is already lon-lat)
  React.useEffect(() => {
    let cancelled = false;
    if (!showBorders || !bordersUrl) return;
    fetch(bordersUrl)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (cancelled || !json) return;
        const polys = [];
        const feats = Array.isArray(json?.features) ? json.features : [];
        for (const f of feats) {
          const g = f.geometry || {};
          const type = g?.type; const coords = g?.coordinates;
          if (!type || !coords) continue;
          if (type === 'Polygon') {
            for (const ring of coords) {
              const poly = [];
              for (let i = 0; i < ring.length; i += Math.max(1, bordersDecimate)) poly.push(ring[i]);
              if (poly.length >= 2) polys.push(poly);
            }
          } else if (type === 'MultiPolygon') {
            for (const polyRings of coords) {
              for (const ring of polyRings) {
                const poly = [];
                for (let i = 0; i < ring.length; i += Math.max(1, bordersDecimate)) poly.push(ring[i]);
                if (poly.length >= 2) polys.push(poly);
              }
            }
          }
        }
        setBorders(polys);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [showBorders, bordersUrl, bordersDecimate]);

  // Render static map (no animation)
  React.useEffect(() => {
    const buf = new Array(rows * cols).fill(' ');

    const idx = (r, c) => r * cols + c;

    const drawPoint = (lon, lat, ch) => {
      // Clamp lat to [-90,90]
      const la = Math.max(-90, Math.min(90, lat));
      // Wrap lon to [-180, 180]
      let lo = lon;
      while (lo < -180) lo += 360;
      while (lo > 180) lo -= 360;
      const c = Math.max(0, Math.min(cols - 1, Math.floor(((lo + 180) / 360) * cols)));
      const r = Math.max(0, Math.min(rows - 1, Math.floor(((90 - la) / 180) * rows)));
      buf[idx(r, c)] = ch;
    };

    const drawLine = (c0, r0, c1, r1, ch) => {
      c0 = Math.max(0, Math.min(cols - 1, c0));
      r0 = Math.max(0, Math.min(rows - 1, r0));
      c1 = Math.max(0, Math.min(cols - 1, c1));
      r1 = Math.max(0, Math.min(rows - 1, r1));
      let x0 = c0, y0 = r0, x1 = c1, y1 = r1;
      const dx = Math.abs(x1 - x0);
      const sx = x0 < x1 ? 1 : -1;
      const dy = -Math.abs(y1 - y0);
      const sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      while (true) {
        buf[idx(y0, x0)] = ch;
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    };

    const drawSegment = (lon0, lat0, lon1, lat1, ch) => {
      const col = lon => Math.floor(((lon + 180) / 360) * cols);
      const row = lat => Math.floor(((90 - lat) / 180) * rows);
      drawLine(col(lon0), row(lat0), col(lon1), row(lat1), ch);
    };

    const drawWrappedSegment = (lon0, lat0, lon1, lat1, ch) => {
      // Normalize into [-180,180]
      while (lon0 < -180) lon0 += 360; while (lon0 > 180) lon0 -= 360;
      while (lon1 < -180) lon1 += 360; while (lon1 > 180) lon1 -= 360;
      let d = lon1 - lon0;
      if (d > 180) { lon1 -= 360; d = lon1 - lon0; }
      else if (d < -180) { lon1 += 360; d = lon1 - lon0; }
      if (lon1 > 180) {
        const t = (180 - lon0) / (lon1 - lon0);
        const latX = lat0 + t * (lat1 - lat0);
        drawSegment(lon0, lat0, 180, latX, ch);
        drawSegment(-180, latX, lon1 - 360, lat1, ch);
      } else if (lon1 < -180) {
        const t = (-180 - lon0) / (lon1 - lon0);
        const latX = lat0 + t * (lat1 - lat0);
        drawSegment(lon0, lat0, -180, latX, ch);
        drawSegment(180, latX, lon1 + 360, lat1, ch);
      } else {
        drawSegment(lon0, lat0, lon1, lat1, ch);
      }
    };

    // Grid first
    if (showGrid) {
      for (let lon = -180; lon <= 180; lon += gridEveryDeg) {
        drawWrappedSegment(lon, -90, lon, 90, '|');
      }
      for (let lat = -90; lat <= 90; lat += gridEveryDeg) {
        drawWrappedSegment(-180, lat, 180, lat, '-');
      }
    }

    // Borders
    if (showBorders && Array.isArray(borders)) {
      for (const poly of borders) {
        for (let i = 0; i < poly.length - 1; i++) {
          const [lon0, lat0] = poly[i];
          const [lon1, lat1] = poly[i + 1];
          drawWrappedSegment(lon0, lat0, lon1, lat1, borderChar);
        }
      }
    }

    // Finalise
    const lines = [];
    for (let r = 0; r < rows; r++) {
      lines.push(buf.slice(r * cols, (r + 1) * cols).join(''));
    }
    setFrame(lines.join('\n'));
  }, [rows, cols, showGrid, gridEveryDeg, showBorders, borders, borderChar]);

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        width: fill ? '100%' : `${widthPx}px`,
        height: fill ? '100%' : `${heightPx}px`,
        overflow: 'hidden',
        background: '#000',
        color: '#0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #0a0',
        padding: 0,
        boxSizing: 'border-box',
      }}
    >
      <pre
        ref={preRef}
        style={{
          margin: 0,
          padding: 0,
          lineHeight: '1em',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: `${fontSizePx}px`,
          letterSpacing: '0px',
          whiteSpace: 'pre',
          userSelect: 'text',
          display: 'inline-block',
        }}
      >{frame}</pre>
    </div>
  );
}

