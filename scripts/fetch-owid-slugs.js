#!/usr/bin/env node
"use strict";
// scripts/fetch-owid-slugs.js
// Fetch all OWID grapher slugs by scraping the Chart-API docs page and write to src/data/owidSlugs.json
const fs = require('fs');
const path = require('path');
const axios = require('axios');

(async () => {
  try {
    const DOCS_URL = 'https://docs.owid.io/projects/etl/api/chart-api/';
    console.log('Fetching OWID Chart-API docs from', DOCS_URL);
    const resp = await axios.get(DOCS_URL, { timeout: 20000 });
    const html = resp.data;
    const slugRe = /\/grapher\/([\w\-]+)(?:\.csv)?/g;
    const slugs = new Set();
    let m;
    while ((m = slugRe.exec(html)) !== null) slugs.add(m[1]);
    const arr = Array.from(slugs).sort();
    const outDir = path.join(__dirname, '..', 'src', 'data');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'owidSlugs.json');
    fs.writeFileSync(outPath, JSON.stringify(arr, null, 2), 'utf8');
    console.log(`Wrote ${arr.length} OWID slugs to ${outPath}`);
  } catch (err) {
    console.error('Error fetching OWID slugs:', err);
    process.exit(1);
  }
})();