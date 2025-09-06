// Prepare a simplified countries GeoJSON for ASCII overlay
// - Input: a source GeoJSON file (Polygon/MultiPolygon) with country borders
// - Output: public/geo/countries.geojson with decimated rings for fast rendering
// Usage: node scripts/prepare-ascii-borders.js [inputPath] [decimate]

const fs = require('fs');
const path = require('path');

const projRoot = path.join(__dirname, '..');
const defaultInputCandidates = [
  path.join(projRoot, 'public', 'geo', 'ne_110m_admin_0_countries.geojson'),
  path.join(projRoot, '..', 'ne_110m_admin_0_countries.geojson'), // repo root candidate
];

const inputArg = process.argv[2];
const decimateArg = Number(process.argv[3] || 6);
const decimate = Math.max(1, Math.floor(decimateArg));

function firstExisting(paths) {
  for (const p of paths) if (fs.existsSync(p)) return p;
  return null;
}

function simplifyFeature(g, step) {
  const out = { type: g.type, coordinates: [] };
  if (g.type === 'Polygon') {
    out.coordinates = g.coordinates.map(ring => ring.filter((_, i) => i % step === 0));
  } else if (g.type === 'MultiPolygon') {
    out.coordinates = g.coordinates.map(poly => poly.map(ring => ring.filter((_, i) => i % step === 0)));
  } else {
    return null;
  }
  return out;
}

function main() {
  let inputPath = inputArg || firstExisting(defaultInputCandidates);
  if (!inputPath) {
    console.error('No input GeoJSON found. Provide a path, e.g.:');
    console.error('  node scripts/prepare-ascii-borders.js ../ne_110m_admin_0_countries.geojson 6');
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const feats = Array.isArray(raw.features) ? raw.features : [];
  const out = { type: 'FeatureCollection', features: [] };
  for (const f of feats) {
    const g = f.geometry;
    const sg = simplifyFeature(g, decimate);
    if (!sg) continue;
    out.features.push({ type: 'Feature', properties: f.properties || {}, geometry: sg });
  }
  const outDir = path.join(projRoot, 'public', 'geo');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'countries.geojson');
  fs.writeFileSync(outPath, JSON.stringify(out));
  console.log('Wrote simplified borders to', outPath, '(decimate =', decimate, ')');
}

main();

