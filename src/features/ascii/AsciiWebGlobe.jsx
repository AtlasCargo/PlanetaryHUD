import React from 'react';
import * as THREE from 'three';

// WebGL-powered ASCII globe: renders a textured sphere to an offscreen canvas,
// reads pixels, maps to ASCII, and displays in a <pre>.
export default function AsciiWebGlobe({
  cols = 160,
  rows = 90,
  fps = 1,
  spinDegPerSec = 6,
  asciiRamp = ' .:-=+*#%@',
  bordersUrl = '/geo/countries.geojson', // used to generate mask texture if no image supplied
  textureImg = null, // optional URL for texture; if null, we rasterize GeoJSON into a land mask
  className = '',
}) {
  const preRef = React.useRef(null);
  const [frame, setFrame] = React.useState('');

  React.useEffect(() => {
    let mounted = true;
    const width = cols; const height = rows;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(1, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    const gl = renderer.getContext();
    const pixels = new Uint8Array(width * height * 4);

    function buildMaskTextureFromGeoJSON(json, w = 720, h = 360) {
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      const toXY = (lon, lat) => [((lon + 180) / 360) * w, ((90 - lat) / 180) * h];
      const unwrapRing = (ring) => {
        const out = [ring[0].slice()]; let prev = ring[0][0];
        for (let i = 1; i < ring.length; i++) { let lon = ring[i][0]; let d = lon - prev; while (d > 180) { lon -= 360; d = lon - prev; } while (d < -180) { lon += 360; d = lon - prev; } out.push([lon, ring[i][1]]); prev = lon; }
        return out;
      };
      const drawPoly = (rings) => {
        ctx.beginPath();
        for (const ring of rings) {
          const unr = unwrapRing(ring);
          for (const k of [-1, 0, 1]) {
            for (let i = 0; i < unr.length; i++) { const [x0, y0] = toXY(unr[i][0], unr[i][1]); const x = x0 + k * w; const y = y0; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
          }
        }
        ctx.fill('nonzero');
      };
      const feats = Array.isArray(json?.features) ? json.features : [];
      for (const f of feats) {
        const g = f.geometry || {};
        if (g.type === 'Polygon') drawPoly(g.coordinates);
        else if (g.type === 'MultiPolygon') for (const rings of g.coordinates) drawPoly(rings);
      }
      return new THREE.CanvasTexture(canvas);
    }

    let globe; let animateId; let intervalId; let destroyed = false;

    (async () => {
      let texture;
      try {
        if (textureImg) {
          texture = await new Promise((resolve, reject) => new THREE.TextureLoader().load(textureImg, resolve, undefined, reject));
        } else {
          const resp = await fetch(bordersUrl);
          const json = await resp.json();
          texture = buildMaskTextureFromGeoJSON(json);
        }
      } catch (e) {
        // Fallback: solid color texture
        const cvs = document.createElement('canvas'); cvs.width = 4; cvs.height = 2; const ctx2 = cvs.getContext('2d'); ctx2.fillStyle = '#fff'; ctx2.fillRect(0,0,4,2); texture = new THREE.CanvasTexture(cvs);
      }

      const geometry = new THREE.SphereGeometry(3, 48, 36);
      const material = new THREE.MeshBasicMaterial({ map: texture });
      globe = new THREE.Mesh(geometry, material);
      globe.rotation.z = Math.PI; globe.rotation.y = 1.5;
      scene.add(globe);
      camera.position.z = 12;

      const ascii = asciiRamp;
      const rampLen = ascii.length - 1;

      function drawAscii() {
        if (!mounted) return;
        renderer.render(scene, camera);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        const lines = [];
        for (let y = height - 1; y >= 0; y--) {
          let row = '';
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
            const lum = (r + g + b) / 765; // 0..1
            const idx = Math.max(0, Math.min(rampLen, Math.floor(lum * rampLen)));
            row += ascii[idx];
          }
          lines.push(row);
        }
        setFrame(lines.join('\n'));
      }

      // Spin + ASCII sampling at fps
      const step = () => { globe.rotation.y -= (spinDegPerSec * Math.PI / 180) * (1 / fps); };
      intervalId = setInterval(() => { step(); drawAscii(); }, 1000 / fps);
      drawAscii();
    })();

    return () => {
      mounted = false; destroyed = true;
      try { intervalId && clearInterval(intervalId); } catch {}
      try { renderer.dispose(); } catch {}
      try { if (globe) globe.geometry.dispose(); } catch {}
    };
  }, [cols, rows, fps, spinDegPerSec, asciiRamp, bordersUrl, textureImg]);

  return (
    <div className={className} style={{ width: '800px', height: '450px', background: '#000', color: '#0f0', border: '1px solid #0a0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <pre ref={preRef} style={{ margin: 0, padding: 0, lineHeight: '1em', fontFamily: 'ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: '5px', letterSpacing: '0px' }}>{frame}</pre>
    </div>
  );
}

