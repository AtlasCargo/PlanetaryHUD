// Service for fetching company market cap data via Financial Modeling Prep API
// Configurable API base for scraping endpoint
const API_BASE = process.env.REACT_APP_API_URL || '';
// Endpoint for market cap scraping (falls back to relative path in dev)
const SCRAPE_ENDPOINT = API_BASE ? `${API_BASE}/api/scrape/marketcap` : '/api/scrape/marketcap';
// React env: backend proxy port if direct fetch fails
const BACKEND_PORT = process.env.REACT_APP_BACKEND_PORT || 5999;

// Fallback Financial Modeling Prep API config
const BASE_URL = 'https://financialmodelingprep.com/api/v3';
const API_KEY = process.env.REACT_APP_FMP_API_KEY || 'demo';

async function getHistoricalMarketCap(symbol, startYear) {
  // Attempt server scraper
  try {
    const res = await fetch(`${SCRAPE_ENDPOINT}/${symbol}`);
    if (res.ok) {
      const data = await res.json();
      const filtered = data.filter(d => d.year >= startYear);
      return filtered.sort((a, b) => a.year - b.year);
    }
    console.warn(`Scraper returned ${res.status} ${res.statusText}, falling back to FMP`);
  } catch (err) {
    console.warn('Scraper endpoint error, falling back to FMP', err);
  }
  // Fallback to Financial Modeling Prep API
  const url = new URL(`${BASE_URL}/historical-market-capitalization/${symbol}`);
  url.searchParams.set('apikey', API_KEY);
  const res2 = await fetch(url);
  if (!res2.ok) throw new Error(`FMP API error ${res2.status} ${res2.statusText}`);
  const fmpData = await res2.json();
  const series = fmpData
    .map(d => ({ year: +d.date.slice(0,4), value: +d.marketCap }))
    .filter(d => d.year >= startYear)
    .sort((a, b) => a.year - b.year);
  return series;
}

export { getHistoricalMarketCap };
