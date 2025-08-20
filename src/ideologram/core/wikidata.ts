import type { BookInput, DimensionKey } from './types.js';
import { mapTopicsToAxes } from './enrich.js';

export type WikidataMetadata = {
  qid: string;
  instanceOf?: string[];
  genres?: string[];
  mainSubjects?: string[];
};

const WD_SPARQL = 'https://query.wikidata.org/sparql';

async function fetchSparql<T = any>(query: string): Promise<T | null> {
  try {
    const res = await fetch(WD_SPARQL + '?query=' + encodeURIComponent(query), {
      headers: {
        'accept': 'application/sparql-results+json',
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function stripIsbn(isbn: string) {
  return isbn.replace(/[^0-9Xx]/g, '');
}

export async function findWikidataByIsbn(isbn: string): Promise<string | null> {
  const clean = stripIsbn(isbn);
  // Try exact P212 (ISBN-13) or P957 (ISBN-10)
  const query = `
SELECT ?item WHERE {
  VALUES ?prop { wdt:P212 wdt:P957 }
  ?item ?prop "${clean}" .
}
LIMIT 1`;
  const json = await fetchSparql<{ results: { bindings: Array<{ item: { value: string } }> } }>(query);
  const uri = json?.results?.bindings?.[0]?.item?.value;
  if (!uri) return null;
  const qid = uri.split('/').pop() || null;
  return qid;
}

export async function findWikidataByTitleAuthor(title: string, author?: string): Promise<string | null> {
  const queryStr = author ? `${title} ${author}` : title;
  const url = new URL('https://www.wikidata.org/w/api.php');
  url.searchParams.set('action', 'wbsearchentities');
  url.searchParams.set('search', queryStr);
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  type WikidataSearchResponse = { search?: Array<{ id?: string }> };
  const data = (await res.json()) as WikidataSearchResponse;
  const qid = data?.search?.[0]?.id || undefined;
  return qid || null;
}

export async function fetchWikidataDetails(qid: string): Promise<WikidataMetadata | null> {
  const query = `
SELECT ?item ?instanceLabel ?genreLabel ?subjectLabel WHERE {
  VALUES ?item { wd:${qid} }
  OPTIONAL { ?item wdt:P31 ?instance . }
  OPTIONAL { ?item wdt:P136 ?genre . }
  OPTIONAL { ?item wdt:P921 ?subject . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;
  const json = await fetchSparql<{ results: { bindings: any[] } }>(query);
  if (!json) return null;
  const instanceOf = new Set<string>();
  const genres = new Set<string>();
  const mainSubjects = new Set<string>();
  for (const b of json.results.bindings) {
    if (b.instanceLabel?.value) instanceOf.add(b.instanceLabel.value);
    if (b.genreLabel?.value) genres.add(b.genreLabel.value);
    if (b.subjectLabel?.value) mainSubjects.add(b.subjectLabel.value);
  }
  return {
    qid,
    instanceOf: Array.from(instanceOf),
    genres: Array.from(genres),
    mainSubjects: Array.from(mainSubjects),
  };
}

export async function enrichBookWikidata(book: BookInput): Promise<{ metadata: WikidataMetadata; inferredAxes?: Partial<Record<DimensionKey, number>> } | null> {
  const title = (book.title || '').trim();
  if (!title) return null;
  const author = (book.author || '').trim() || undefined;

  let qid: string | null = null;
  if (book.isbn) qid = await findWikidataByIsbn(book.isbn);
  if (!qid) qid = await findWikidataByTitleAuthor(title, author);
  if (!qid) return null;

  const meta = await fetchWikidataDetails(qid);
  if (!meta) return null;
  const topics = [
    ...(meta.mainSubjects || []),
    ...(meta.genres || []),
  ];
  const inferredAxes = mapTopicsToAxes(topics);
  return { metadata: meta, inferredAxes };
}


