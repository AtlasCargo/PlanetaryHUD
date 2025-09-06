import React from 'react';

// ASCII ramp from dark to bright (water/land-agnostic for MVP)
const DEFAULT_RAMP = ' .:-=+*#%@';

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function degWrap(d) {
  let x = d % 360;
  if (x < 0) x += 360;
  return x;
}

/**
 * AsciiGlobe
 * - Orthographic projection onto a circle (true sphere appearance), shaded with Lambert lighting.
 * - Gridlines drawn in spherical space (after rotation), mapped to screen.
 */
export default function AsciiGlobe({
  cols = 160,
  rows = 90,
  fps = 1,
  spinDegPerSec = 10,
  lightDir = { x: 0.5, y: 0.7, z: 1.0 },
  ramp = DEFAULT_RAMP,
  showGrid = true,
  gridEveryDeg = 30,
  className = '',
  charAspect: charAspectProp = 0.55, // approximate character width/height ratio (will auto-measure)
  // Sizing
  fill = false,           // if true, component fills its container
  widthPx = 800,          // used when fill=false
  heightPx = 450,         // used when fill=false
  // Borders overlay
  showBorders = false,
  bordersUrl = '/geo/countries.geojson', // optional; if not present the overlay is skipped
  bordersDecimate = 6,    // sample every N-th vertex to keep perf reasonable
  borderChar = '*',
  globeScale = 1.0,
}) {
  const preRef = React.useRef(null);
  const wrapperRef = React.useRef(null);
  const [frame, setFrame] = React.useState('');
  const [charAspect, setCharAspect] = React.useState(charAspectProp);
  const [fontSizePx, setFontSizePx] = React.useState(5);
  const [borders, setBorders] = React.useState(null); // Array of polylines: number[][][] where each polyline is [[lon,lat], ...]
  
  // Normalize light direction (world space)
  const normLight = React.useMemo(() => {
    const L = Math.hypot(lightDir.x, lightDir.y, lightDir.z) || 1;
    return { x: lightDir.x / L, y: lightDir.y / L, z: lightDir.z / L };
  }, [lightDir.x, lightDir.y, lightDir.z]);

  // Render a single frame with orthographic projection
  const renderFrame = React.useCallback((rotDeg) => {
    const rot = (rotDeg * Math.PI) / 180;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);

    const rampLen = ramp.length - 1;
    const gridTol = 1.0; // degrees tolerance for grid lines
    const g = Math.max(0.5, Math.min(2.0, globeScale));
    const radius = 1.0; // unit circle; scale handled by g

    // --- Helpers for borders overlay ---
    const toXYZ = (lonDeg, latDeg) => {
      const lon = (lonDeg * Math.PI) / 180;
      const lat = (latDeg * Math.PI) / 180;
      const cl = Math.cos(lat);
      return { x: cl * Math.cos(lon), y: Math.sin(lat), z: cl * Math.sin(lon) };
    };
    const rotY = (p) => ({ x: p.x * cosR + p.z * sinR, y: p.y, z: -p.x * sinR + p.z * cosR });
    const toGrid = (p) => {
      if (p.z <= 0) return null; // backface
      const sx = p.x * g; // scale screen mapping identically
      const sy = p.y * g;
      const rr2 = sx * sx + sy * sy;
      if (rr2 > 1) return null;
      const colF = ((sx + 1) * 0.5) * cols;
      const rNorm = (-sy * charAspect + 1) * 0.5;
      const rowF = rNorm * rows;
      const c = Math.max(0, Math.min(cols - 1, Math.floor(colF)));
      const r = Math.max(0, Math.min(rows - 1, Math.floor(rowF)));
      return { c, r };
    };
    const drawLine = (mask, a, b) => {
      if (!a || !b) return;
      let x0 = a.c, y0 = a.r, x1 = b.c, y1 = b.r;
      const dx = Math.abs(x1 - x0);
      const sx = x0 < x1 ? 1 : -1;
      const dy = -Math.abs(y1 - y0);
      const sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      while (true) {
        mask[y0 * cols + x0] = 1;
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    };

    // Build borders mask at current rotation (if data available)
    let borderMask = null;
    if (showBorders && Array.isArray(borders) && borders.length) {
      borderMask = new Uint8Array(rows * cols);
      for (const poly of borders) {
        for (let i = 0; i < poly.length - 1; i++) {
          const [lon0, lat0] = poly[i];
          const [lon1, lat1] = poly[i + 1];
          const pa = rotY(toXYZ(lon0, lat0));
          const pb = rotY(toXYZ(lon1, lat1));
          if (pa.z <= 0 && pb.z <= 0) continue;
          const ga = toGrid(pa);
          const gb = toGrid(pb);
          if (ga && gb) drawLine(borderMask, ga, gb);
        }
      }
    }

    const lines = new Array(rows);
    // Precompute vertical mapping (correcting for char aspect so the circle looks round)
    for (let r = 0; r < rows; r++) {
      let line = '';
      // Normalized screen coords in [-1, 1], sample at cell centers for symmetry
      const v = ((r + 0.5) / rows) * 2 - 1; // -1..1 top->bottom
      const y = (-v / charAspect) / g; // invert Y so positive is up; apply aspect & scale
      for (let c = 0; c < cols; c++) {
        const u = ((c + 0.5) / cols) * 2 - 1; // -1..1 left->right
        const x = u / g; // scale to enlarge globe on screen
        const rr = x * x + y * y;
        if (rr > radius * radius) { line += ' '; continue; }

        // Orthographic sphere: z from unit sphere
        const z = Math.sqrt(Math.max(0, 1 - rr)); // front hemisphere

        // View-space normal
        const nx = x;
        const ny = y;
        const nz = z;

        // Rotate globe around Y by rot (world rotation)
        const rx = nx * cosR + nz * sinR;
        const ry = ny;
        const rz = -nx * sinR + nz * cosR;

        // Lambert shading in world space
        const ndotl = clamp(rx * normLight.x + ry * normLight.y + rz * normLight.z, 0, 1);
        const shadeIdx = Math.floor(ndotl * rampLen);
        let ch = ramp[shadeIdx];
        if (borderMask && borderMask[r * cols + c]) ch = borderChar;

        if (showGrid) {
          // Convert to spherical (after rotation)
          const latDeg = (Math.asin(clamp(ry, -1, 1)) * 180) / Math.PI; // -90..90
          const lonRad = Math.atan2(rz, rx); // -pi..pi
          const lonDeg = (lonRad * 180) / Math.PI; // -180..180
          const lonW = degWrap(lonDeg + 180); // 0..360 for modulo calc
          const latW = degWrap(latDeg + 180); // shift to 0..360 space

          const nearMeridian = (lonW % gridEveryDeg) < gridTol || (gridEveryDeg - (lonW % gridEveryDeg)) < gridTol;
          const nearParallel = (latW % gridEveryDeg) < gridTol || (gridEveryDeg - (latW % gridEveryDeg)) < gridTol;
          if (nearMeridian && nearParallel) ch = '+';
          else if (nearMeridian) ch = '|';
          else if (nearParallel) ch = '-';
        }

        line += ch;
      }
      lines[r] = line;
    }
    return lines.join('\n');
  }, [rows, cols, ramp, normLight, showGrid, gridEveryDeg, charAspect, showBorders, borders, borderChar, globeScale]);

  // Auto-measure character aspect ratio to keep the globe circular and centered.
  React.useLayoutEffect(() => {
    if (!preRef.current) return;
    try {
      const baseStyle = window.getComputedStyle(preRef.current);
      const family = baseStyle.fontFamily;
      const size = baseStyle.fontSize;
      const test = document.createElement('pre');
      test.style.position = 'absolute';
      test.style.visibility = 'hidden';
      test.style.whiteSpace = 'pre';
      test.style.fontFamily = family;
      test.style.fontSize = size;
      test.style.lineHeight = baseStyle.lineHeight || '1em';
      test.style.letterSpacing = '0px';
      test.textContent = 'X'.repeat(100);
      document.body.appendChild(test);
      const width = test.getBoundingClientRect().width;

      const test2 = document.createElement('pre');
      test2.style.position = 'absolute';
      test2.style.visibility = 'hidden';
      test2.style.whiteSpace = 'pre';
      test2.style.fontFamily = family;
      test2.style.fontSize = size;
      test2.style.lineHeight = baseStyle.lineHeight || '1em';
      test2.style.letterSpacing = '0px';
      test2.textContent = 'X\nX';
      document.body.appendChild(test2);
      const heightTwo = test2.getBoundingClientRect().height;

      document.body.removeChild(test);
      document.body.removeChild(test2);

      const cw = width / 100;
      const ch = heightTwo / 2;
      if (cw > 0 && ch > 0) setCharAspect(cw / ch);
    } catch {}
  }, [cols, rows]);

  // Animation loop @ fps
  React.useEffect(() => {
    let mounted = true;
    let angle = 0;
    const tick = () => {
      if (!mounted) return;
      setFrame(renderFrame(angle));
      angle = (angle + spinDegPerSec * (1 / fps)) % 360;
    };
    tick();
    const id = setInterval(tick, 1000 / fps);
    return () => { mounted = false; clearInterval(id); };
  }, [fps, spinDegPerSec, renderFrame]);

  // Measure actual char aspect from the rendered <pre> box to reduce squashing.
  React.useLayoutEffect(() => {
    const pre = preRef.current;
    if (!pre) return;
    try {
      const rect = pre.getBoundingClientRect();
      const cw = rect.width / cols;
      const ch = rect.height / rows;
      if (cw > 0 && ch > 0) {
        const calc = cw / ch;
        if (Math.abs(calc - charAspect) > 0.02) setCharAspect(calc);
      }
    } catch {}
  }, [frame, cols, rows, charAspect]);

  // Compute font size to fill available wrapper area
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

  // Optional: load country borders from GeoJSON (Polygon/MultiPolygon)
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
          if (!g) continue;
          const type = g.type;
          const coords = g.coordinates;
          if (type === 'Polygon') {
            for (const ring of coords) {
              const poly = [];
              for (let i = 0; i < ring.length; i += bordersDecimate) poly.push(ring[i]);
              if (poly.length >= 2) polys.push(poly);
            }
          } else if (type === 'MultiPolygon') {
            for (const polyRings of coords) {
              for (const ring of polyRings) {
                const poly = [];
                for (let i = 0; i < ring.length; i += bordersDecimate) poly.push(ring[i]);
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
          // Ensure the pre box hugs content so centering is accurate
          display: 'inline-block',
        }}
      >{frame}</pre>
    </div>
  );
}
