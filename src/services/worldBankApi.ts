/*
 * services/worldBankApi.ts
 * -------------------------------------------------------------
 * Lightweight client for the World Bank REST API (v2)
 * -------------------------------------------------------------
 *  • Typed helpers for common resources (countries, indicators, data)
 *  • Promise‑based interface with sensible defaults
 *  • Extremely small (<2 kB min+gzip) – no external runtime deps 🌱
 *
 * 2025‑05‑04
 * -------------------------------------------------------------
 * © Your Team — MIT Licence
 */

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

type Nullable<T> = T | null;

export interface Country {
  id: string;            // e.g. "DEU"
  iso2Code: string;      // e.g. "DE"
  name: string;          // localised country name (depends on `lang` query param)
  region: { id: string; value: string };
  adminregion: { id: string; value: string };
  incomeLevel: { id: string; value: string };
  lendingType: { id: string; value: string };
  capitalCity: string;
  longitude: string;
  latitude: string;
}

export interface Indicator {
  id: string;            // e.g. "SP.POP.TOTL"
  name: string;          // localised name
  sourceNote: string;
  sourceOrganization: string;
  topics: { id: number; value: string }[];
}

export interface DataPoint {
  country: { id: string; value: string };
  indicator: { id: string; value: string };
  value: Nullable<number>;      // some datapoints are null
  date: string;                 // year string (YYYY)
  unit: string;
  decimal: number;
}

export interface PagedResponse<T> {
  /** Zero‑based page index. */
  page: number;
  /** Total number of pages. */
  pages: number;
  /** Total results across all pages. */
  total: number;
  /** Items in this page. */
  items: T[];
}

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const BASE_URL = "https://api.worldbank.org/v2";
const DEFAULTS = {
  lang: "en",
  format: "json",
  perPage: 1000,   // generous limit – WB caps at 1024
} as const;

// tiny in‑memory cache (request URL → JSON)
const cache = new Map<string, any>();

// ---------------------------------------------------------------------------
// INTERNAL FETCH WRAPPER
// ---------------------------------------------------------------------------

async function request<T>(path: string, params: Record<string, any> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}/${path.replace(/^\/+/, "")}`);
  const search = url.searchParams;
  // inject default params *unless* the caller overrides them explicitly
  search.set("format", DEFAULTS.format);
  search.set("per_page", String(DEFAULTS.perPage));
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) search.set(k, String(v));
  });

  const cacheKey = url.toString();
  if (cache.has(cacheKey)) return cache.get(cacheKey) as T;

  const res = await fetch(cacheKey);
  if (!res.ok) {
    throw new Error(`WorldBank API error: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();

  // WB JSON responses are [metadata, data[]]
  if (!Array.isArray(json) || json.length < 2) {
    throw new Error("Unexpected WorldBank response shape");
  }

  const [meta, data] = json as [any, any];
  const mapped: PagedResponse<any> = {
    page: Number(meta.page) - 1,            // meta.page is 1‑based
    pages: Number(meta.pages),
    total: Number(meta.total),
    items: data,
  };

  cache.set(cacheKey, mapped);
  return mapped as unknown as T;
}

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

/**
 * List & search for countries.
 * @param q Optional substring filter matched against `name` and `iso2Code`.
 */
export async function getCountries(q?: string, lang = DEFAULTS.lang): Promise<Country[]> {
  const { items } = await request<PagedResponse<Country>>("country", { lang });
  if (!q) return items;
  const query = q.toLowerCase();
  return items.filter(c =>
    c.name.toLowerCase().includes(query) ||
    c.iso2Code.toLowerCase() === query ||
    c.id.toLowerCase() === query,
  );
}

/**
 * Search indicators by keyword.
 * NB: The WB indicator search endpoint is not officially documented; we emulate
 *     search by fetching *all* indicators and doing a client‑side filter.
 */
export async function getIndicators(q?: string, lang = DEFAULTS.lang): Promise<Indicator[]> {
  const { items } = await request<PagedResponse<Indicator>>("indicator", { lang });
  if (!q) return items;
  const query = q.toLowerCase();
  return items.filter(ind => ind.name.toLowerCase().includes(query) || ind.id.toLowerCase().includes(query));
}

/**
 * Fetch time‑series data for a given indicator & country list.
 *
 * @example
 *   // Germany + France population 1960‑2023
 *   getIndicatorData(["DEU", "FRA"], "SP.POP.TOTL", 1960, 2023)
 */
export async function getIndicatorData(
  countryCodes: string[] | string,
  indicator: string,
  start?: number,
  end?: number,
  lang = DEFAULTS.lang,
): Promise<Record<string, DataPoint[]>> {
  if (!Array.isArray(countryCodes)) countryCodes = [countryCodes];
  const results: Record<string, DataPoint[]> = {};
  await Promise.all(countryCodes.map(async code => {
    const allItems: DataPoint[] = [];
    let pageNum = 1;
    let totalPages = 1;
    do {
      const { items, pages } = await request<PagedResponse<DataPoint>>(
        `country/${code}/indicator/${indicator}`,
        {
          lang,
          date: start && end ? `${start}:${end}` : undefined,
          page: pageNum,
        },
      );
      // WB returns newest-first; reverse for chronological order
      const pageItems = items.slice().reverse();
      allItems.push(...pageItems);
      totalPages = pages;
      pageNum++;
    } while (pageNum <= totalPages);
    results[code] = allItems;
  }));
   
   return results;
 }

/** Clear the local response cache (useful for tests). */
export function _clearCache() { cache.clear(); }
