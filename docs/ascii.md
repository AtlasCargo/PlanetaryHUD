# ASCII Mode

Low‑power, text‑only rendering for PlanetaryHUD. Useful for mobile/energy‑sensitive users, terminals, and copy‑paste into LLMs.

## Overview
- Route: `/ascii`
- Modes:
  - Flat Map: equirectangular ASCII map rendered from GeoJSON (coherent borders, good for verification).
  - Globe (Software): orthographic sphere sampled from a raster land mask built from GeoJSON; optional shading/grid.
  - Globe (WebGL, experimental): Three.js sphere rendered offscreen, converted to ASCII.
- Target: 160×90 characters (~800×450 px) at 1 fps by default.

## How To Run
- Start app: `npm run dev`
- Open: `http://localhost:3000/ascii`
- Buttons on the page:
  - Enable/Disable Shading (software globe only)
  - Show/Hide Grid
  - Show Flat Map / Show Globe
  - Use WebGL Renderer / Use Software Renderer (only when Globe is active)

## Data
- Borders / land mask source: `public/geo/countries.geojson`
- Prepare from Natural Earth 110m:
  - Place `ne_110m_admin_0_countries.geojson` at repo root.
  - Run: `npm run prepare-ascii-borders`
  - Output: `public/geo/countries.geojson` (decimated for performance)

## Key Files
- `src/features/ascii/AsciiMap.jsx` — flat equirectangular ASCII map.
- `src/features/ascii/AsciiGlobe.jsx` — software globe (orthographic + raster land mask).
- `src/features/ascii/AsciiWebGlobe.jsx` — experimental WebGL→ASCII globe.
- `src/pages/AsciiGlobePage.jsx` — demo page and controls.
- `scripts/prepare-ascii-borders.js` — simplifies source GeoJSON for runtime.

## Configuration (AsciiGlobe props)
- `cols`, `rows`: ASCII grid resolution (default 160×90).
- `fps`: frames per second (default 1).
- `spinDegPerSec`: rotation speed.
- `globeScale`: scale globe inside the frame (avoid clipping; ~1.04–1.08).
- `shading`: boolean; Lambert ramp shading on/off.
- `showGrid`, `gridEveryDeg`: reference meridians/parallels.
- `useLandMask`: render land/water from raster (recommended for coherence).
- `landChar`, `waterChar`: characters for land/water.
- `flipHorizontal`: flips each ASCII line; corrects E/W mirroring.

## Troubleshooting
- No borders: ensure `public/geo/countries.geojson` exists (see prepare script).
- Distorted globe borders: use land‑mask mode (`useLandMask={true}`) rather than vector polylines.
- Squashed/offset circle: the component auto‑measures character aspect; if needed, pass `charAspect` to override.

## Roadmap (Advanced Capabilities)
1) Land/Coast Fidelity
- Thicken coastlines (1–2px dilation in land mask).
- Optional country borders overlay on top of mask.
- Labels: tiny 1–2 char labels for major countries/cities (abbreviations).

2) Layers & Interaction
- Markers/paths/heatmaps: plot points and arcs (great‑circle sampling), occupancy heatmaps.
- Hit‑testing: invert projection for click → lon/lat; select country/point.
- Tooltips: ASCII tooltips with minimal framing; keyboard navigation.

3) Full‑Page ASCII Theme
- ASCII UI kit: panels, buttons, lists, sliders rendered as text.
- Chat view: text‑only chat with mic/recording state in ASCII.
- HUD widgets: minimal sparklines, bar charts, numeric KPIs using braille/ASCII blocks.
- Global style: green‑on‑black, optional 16‑color or 256‑color palette via spans or ANSI (terminal mode).

4) Performance & Outputs
- Adaptive FPS: 0.5–5 fps depending on activity and CPU.
- Headless server render: produce frames on server for LLM ingestion or logging.
- Terminal renderer: ANSI escape sequences streamed over WS/STDOUT.
- Export: copy‑to‑clipboard, save current frame to `.txt`, record N frames to `.ansi`/GIF.

5) Quality & Testing
- Snapshot tests: deterministic seed + fixed ramp → stable ASCII output.
- Visual diffs: serialize ASCII frames per PR for quick review.
- Config schema: JSON config for ASCII themes and ramps.

6) Integrations
- MCP overlay: show agent task status/locks as a corner widget in ASCII.
- Feature flags: `REACT_APP_ASCII_*` envs to enable/disable modes.

## Notes
- Software globe defaults to mask‑based land rendering for coherence.
- WebGL globe is optional; keep disabled on low‑power devices.

