import type { BookInput, DimensionKey } from './types.js';

type OpenLibraryWork = {
  key?: string;
  subjects?: string[];
  subject_people?: string[];
  subject_places?: string[];
  subject_times?: string[];
  description?: string | { value?: string };
};

type OpenLibraryEdition = {
  key?: string;
  works?: { key: string }[];
  lc_classifications?: string[];
  dewey_decimal_class?: string[];
  subjects?: string[];
};

export type BookMetadata = {
  isFictionInferred?: boolean;
  subjects?: string[];
  genres?: string[];
  classifications?: { lcc?: string; ddc?: string };
  topics?: string[];
  description?: string;
  sources?: {
    openLibrary?: { workKey?: string; editionKey?: string };
  };
};

const normalize = (s: string) => s.trim().toLowerCase();

async function fetchJson<T = any>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { 'accept': 'application/json' } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchOpenLibraryByIsbn(isbn: string): Promise<{ edition: OpenLibraryEdition | null; work: OpenLibraryWork | null }> {
  const edition = await fetchJson<OpenLibraryEdition>(`https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`);
  if (!edition) return { edition: null, work: null };
  const workKey = edition.works && edition.works[0] && edition.works[0].key;
  const work = workKey ? await fetchJson<OpenLibraryWork>(`https://openlibrary.org${workKey}.json`) : null;
  return { edition, work };
}

async function fetchOpenLibraryByTitleAuthor(title: string, author?: string): Promise<{ edition: OpenLibraryEdition | null; work: OpenLibraryWork | null }> {
  const params = new URLSearchParams();
  params.set('title', title);
  if (author) params.set('author', author);
  params.set('limit', '1');
  const search = await fetchJson<{ docs?: Array<{ key?: string; edition_key?: string[] }> }>(`https://openlibrary.org/search.json?${params}`);
  const workKey = search?.docs?.[0]?.key; // e.g. "/works/OLXXXXXW"
  let edition: OpenLibraryEdition | null = null;
  if (search?.docs?.[0]?.edition_key && search.docs[0].edition_key[0]) {
    edition = await fetchJson<OpenLibraryEdition>(`https://openlibrary.org/books/${search.docs[0].edition_key[0]}.json`);
  }
  const work = workKey ? await fetchJson<OpenLibraryWork>(`https://openlibrary.org${workKey}.json`) : null;
  return { edition, work };
}

const NONFICTION_HINTS = new Set<string>([
  'nonfiction', 'non-fiction', 'history', 'biography', 'memoir', 'politics', 'economics', 'philosophy', 'science', 'essay', 'essays', 'law', 'policy', 'sociology', 'psychology'
]);
const FICTION_HINTS = new Set<string>([
  'fiction', 'novel', 'novels', 'short stories', 'fantasy', 'science fiction', 'sci-fi', 'romance', 'mystery', 'poetry', 'graphic novel', 'young adult', 'ya'
]);

function inferIsFictionFromSubjects(subjects: string[]): boolean | undefined {
  const s = subjects.map(normalize);
  if (s.some((x) => NONFICTION_HINTS.has(x))) return false;
  if (s.some((x) => FICTION_HINTS.has(x))) return true;
  // Also treat subjects that end with 'fiction' as fiction (e.g., 'political fiction')
  if (s.some((x) => /\bfiction\b/.test(x))) return true;
  return undefined;
}

export const TOPIC_TO_AXES: Record<string, Partial<Record<DimensionKey, number>>> = {
  // Economic axis
  'capitalism': { econ_lr: 0.7 },
  'free market': { econ_lr: 0.6 },
  'libertarianism': { econ_lr: 0.4, auth_lib: 0.7 },
  'socialism': { econ_lr: -0.7 },
  'communism': { econ_lr: -0.8, auth_lib: -0.3 },
  'planned economy': { econ_lr: -0.6 },
  // Authority axis
  'anarchism': { auth_lib: 0.8, econ_lr: -0.3 },
  'authoritarianism': { auth_lib: -0.7 },
  // Cultural axis
  'conservatism': { cult_libcon: 0.6 },
  'traditionalism': { cult_libcon: 0.5 },
  'progressivism': { cult_libcon: -0.6 },
  'feminism': { cult_libcon: -0.5 },
  // Scope axis
  'nationalism': { global_local: 0.7 },
  'patriotism': { global_local: 0.4 },
  'globalization': { global_local: -0.5 },
  'cosmopolitanism': { global_local: -0.6 },
  // Tech/Progress axis
  'environmentalism': { tech_prog: -0.5 },
  'degrowth': { tech_prog: -0.6 },
  'transhumanism': { tech_prog: 0.6 },
  'techno-optimism': { tech_prog: 0.6 },
  // Epistemic axis
  'rationalism': { epistemic_rat: 0.7 },
  'empiricism': { epistemic_rat: 0.6 },
  'scientific method': { epistemic_rat: 0.6 },
  'religion': { epistemic_rat: -0.3, cult_libcon: 0.4 },
  'atheism': { epistemic_rat: 0.4, cult_libcon: -0.2 },
};

function normalizeTopic(t: string): string {
  return normalize(t).replace(/\s+/g, ' ').trim();
}

export function mapTopicsToAxes(topics: string[]): Partial<Record<DimensionKey, number>> {
  const acc: Partial<Record<DimensionKey, number>> = {};
  const seen = new Set<string>();
  for (const raw of topics) {
    const t = normalizeTopic(raw);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    const loadings = TOPIC_TO_AXES[t];
    if (!loadings) continue;
    for (const k in loadings) {
      const key = k as DimensionKey;
      const val = loadings[key]!;
      acc[key] = (acc[key] ?? 0) + val;
    }
  }
  // Soft clamp to [-1,1]
  for (const k of Object.keys(acc) as DimensionKey[]) {
    const v = acc[k]!;
    acc[k] = Math.max(-1, Math.min(1, v));
  }
  return acc;
}

export async function enrichBook(book: BookInput): Promise<{ metadata: BookMetadata; inferredAxes?: Partial<Record<DimensionKey, number>> } | null> {
  const title = (book.title || '').trim();
  if (!title) return null;
  const author = (book.author || '').trim() || undefined;

  let edition: OpenLibraryEdition | null = null;
  let work: OpenLibraryWork | null = null;

  if (book.isbn) {
    const r = await fetchOpenLibraryByIsbn(book.isbn);
    edition = r.edition; work = r.work;
  }
  if (!work) {
    const r2 = await fetchOpenLibraryByTitleAuthor(title, author);
    edition = edition || r2.edition; work = work || r2.work;
  }

  if (!edition && !work) {
    return { metadata: { topics: [], subjects: [], sources: {} }, inferredAxes: {} };
  }

  const subjects: string[] = [];
  const workSubjects = [
    ...(work?.subjects || []),
    ...(work?.subject_people || []),
    ...(work?.subject_places || []),
    ...(work?.subject_times || []),
  ];
  for (const s of workSubjects) if (typeof s === 'string') subjects.push(s);
  if (edition?.subjects) subjects.push(...edition.subjects);

  const classifications = {
    lcc: edition?.lc_classifications?.[0],
    ddc: edition?.dewey_decimal_class?.[0],
  };

  const desc = typeof work?.description === 'string' ? work?.description : work?.description?.value;

  const topics = Array.from(new Set(subjects.map(normalize)));
  const isFictionInferred = inferIsFictionFromSubjects(topics);
  const inferredAxes = mapTopicsToAxes(topics);

  const metadata: BookMetadata = {
    isFictionInferred,
    subjects: topics,
    genres: undefined,
    classifications,
    description: desc,
    topics,
    sources: {
      openLibrary: {
        workKey: work?.key,
        editionKey: edition?.key,
      }
    }
  };

  return { metadata, inferredAxes };
}


