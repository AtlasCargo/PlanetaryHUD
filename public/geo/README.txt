Place a countries GeoJSON file here for the ASCII globe borders overlay.

Recommended source:
- ne_110m_admin_0_countries.geojson (Natural Earth 1:110m)

Quick prepare (from project root):
- npm run prepare-ascii-borders
  - This script looks for ../ne_110m_admin_0_countries.geojson (repo root)
    and writes a simplified version to public/geo/countries.geojson.

