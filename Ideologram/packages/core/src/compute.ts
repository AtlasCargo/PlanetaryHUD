import {
  BookAnchor,
  BookInput,
  ComputeOptions,
  Dimension,
  DimensionKey,
  IdeologyVector,
  QuizItemLoading,
  QuizResponse,
  defaultDimensions,
} from './types.js';

const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));

const normTitle = (s?: string) => (s || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const yearsSince = (dateStr?: string, fallbackYear?: number) => {
  if (!dateStr && !fallbackYear) return undefined;
  const now = new Date();
  let then: Date | undefined;
  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) then = d;
  }
  if (!then && fallbackYear) then = new Date(fallbackYear, 0, 1);
  if (!then) return undefined;
  const diffMs = now.getTime() - then.getTime();
  return diffMs / (1000 * 60 * 60 * 24 * 365.25);
};

function cosine(a: Record<DimensionKey, number>, b: Record<DimensionKey, number>): number {
  let dot = 0, na = 0, nb = 0;
  (Object.keys(a) as DimensionKey[]).forEach(k => {
    const av = a[k] || 0;
    const bv = b[k] || 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  });
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

// --- Fiction handling helpers ---
const FICTION_SHELF_HINTS = new Set<string>([
  'fiction', 'novel', 'novels', 'literature', 'fantasy', 'science-fiction', 'sci-fi',
  'romance', 'ya', 'young-adult', 'poetry', 'short-stories', 'graphic-novel', 'mystery',
]);
const NONFICTION_SHELF_HINTS = new Set<string>(['non-fiction', 'nonfiction', 'history', 'biography', 'politics', 'philosophy', 'economics']);

const DEFAULT_FICTION_WHITELIST = [
  '1984',
  'animal farm',
  'atlas shrugged',
  'brave new world',
  'fahrenheit 451',
  'lord of the flies',
  'the fountainhead',
];

function isWhitelistedTitle(title: string, whitelistNorm: string[]) {
  const t = normTitle(title);
  return whitelistNorm.includes(t);
}

function isFictionBook(b: BookInput, anchor: BookAnchor | undefined, whitelistNorm: string[]) {
  // Manual override from UI/user input takes precedence
  if (typeof b.isFiction === 'boolean') return b.isFiction;
  if (isWhitelistedTitle(b.title, whitelistNorm)) return false;
  const shelves = (b.shelves || []).map((s) => s.toLowerCase());
  // If explicitly non-fictional, treat as non-fiction
  if (shelves.some((s) => NONFICTION_SHELF_HINTS.has(s))) return false;
  // If any shelf strongly hints fiction, treat as fiction
  if (shelves.some((s) => FICTION_SHELF_HINTS.has(s))) return true;
  // Anchor tags may indicate fiction
  if (anchor && Array.isArray(anchor.tags)) {
    const tags = anchor.tags.map((t) => t.toLowerCase());
    if (tags.includes('fiction') || tags.includes('novel')) return true;
  }
  return false;
}

export type ComputeInput = {
  books?: BookInput[];
  anchors?: BookAnchor[];
  quizResponses?: QuizResponse[];
  quizLoadings?: QuizItemLoading[];
  options?: ComputeOptions;
  dimensionsMeta?: Omit<Dimension, 'value'>[];
};

export function computeIdeologram(input: ComputeInput): IdeologyVector {
  const {
    books = [],
    anchors = [],
    quizResponses = [],
    quizLoadings = [],
    options = {},
    dimensionsMeta = defaultDimensions,
  } = input;

  const kBlend = options.kBlend ?? 12;
  const halfLifeYears = options.recencyHalfLifeYears ?? 5;
  const fictionPolicy = options.fictionPolicy ?? 'discount';
  const fictionBaseWeight = clamp(options.fictionBaseWeight ?? 0.2, 0, 1);
  const fictionThresholdCount = Math.max(0, Math.floor(options.fictionThresholdCount ?? 8));
  const whitelistNorm = (options.fictionWhitelistTitles ?? DEFAULT_FICTION_WHITELIST).map(normTitle);
  const includeUnread = options.includeUnreadBooks ?? false;

  // Build anchor index by normalized title
  const anchorByTitle = new Map<string, BookAnchor[]>();
  for (const a of anchors) {
    const key = normTitle(a.title);
    if (!anchorByTitle.has(key)) anchorByTitle.set(key, []);
    anchorByTitle.get(key)!.push(a);
  }

  type Vec = Record<DimensionKey, number>;
  const zeroVec = () => ({
    econ_lr: 0,
    cult_libcon: 0,
    auth_lib: 0,
    global_local: 0,
    tech_prog: 0,
    epistemic_rat: 0,
  } as Vec);

  let vBooks: Vec = zeroVec();
  let wBooksSum = 0;
  let nBooksUsed = 0;
  let nBooksNF = 0;
  let nBooksF = 0;
  let wFictionSumBase = 0;
  const fictionContribs: { vec: Vec; w: number }[] = [];

  for (const b of books) {
    // Filter by read status unless overridden
    const readFlag = b.isRead ?? (b.readingStatus === 'read' || b.dateRead != null);
    if (!includeUnread && !readFlag) continue;
    if (b.rating == null) continue;
    const s = clamp((b.rating - 3) / 2, -1, 1); // [-1,1]
    if (s === 0) continue; // neutral

    const matches = anchorByTitle.get(normTitle(b.title));
    if (!matches || matches.length === 0) continue; // no anchor mapping

    // Use the highest weight match
    const anchor = matches.reduce((p, c) => ( (c.weight ?? 0.6) > (p.weight ?? 0.6) ? c : p ));

    const kappa = clamp(anchor.weight ?? 0.6, 0, 1);
    const rep = clamp(b.representative ?? 1, 0, 1);
    let recency = 1;
    const ys = yearsSince(b.dateRead, b.year);
    if (ys !== undefined && ys > 0) {
      const lambda = Math.log(2) / halfLifeYears;
      recency = Math.exp(-lambda * ys);
    }
    const w = Math.abs(s) * kappa * rep * recency;

    // Build this book's contribution vector
    const vThis: Vec = zeroVec();
    (Object.keys(anchor.axes) as DimensionKey[]).forEach((k) => {
      const bv = clamp(anchor.axes[k] ?? 0, -1, 1);
      vThis[k] += (s * bv) * w;
    });

    const isFic = isFictionBook(b, anchor, whitelistNorm);
    if (isFic) {
      fictionContribs.push({ vec: vThis, w });
      wFictionSumBase += w;
      nBooksF += 1;
    } else {
      (Object.keys(vBooks) as DimensionKey[]).forEach((k) => { vBooks[k] += vThis[k]; });
      wBooksSum += w;
      nBooksNF += 1;
    }
    nBooksUsed += 1; // counts any used book
  }

  // Apply fiction according to policy
  if (fictionContribs.length > 0) {
    let factor = 1;
    if (fictionPolicy === 'ignore') factor = 0;
    else if (fictionPolicy === 'discount') {
      factor = fictionContribs.length >= fictionThresholdCount ? 1 : fictionBaseWeight;
    } else {
      factor = 1; // allow
    }

    if (factor > 0) {
      for (const fc of fictionContribs) {
        (Object.keys(vBooks) as DimensionKey[]).forEach((k) => { vBooks[k] += fc.vec[k] * factor; });
      }
      wBooksSum += wFictionSumBase * factor;
    }
  }

  // Quiz
  const loadingById = new Map<string, QuizItemLoading>();
  for (const l of quizLoadings) loadingById.set(l.id, l);

  let vQuiz: Vec = zeroVec();
  let qSum = 0;
  const nQuizUsed = quizResponses.reduce((acc, r) => {
    const L = loadingById.get(r.id);
    if (!L) return acc;
    let y = clamp((r.answer - 3) / 2, -1, 1);
    if (L.reverse) y = -y;
    const q = clamp(L.quality ?? 0.7, 0, 1);
    (Object.keys(L.axes) as DimensionKey[]).forEach((k) => {
      const a = clamp(L.axes[k] ?? 0, -1, 1);
      vQuiz[k] += (y * a) * q;
    });
    qSum += q;
    return acc + 1;
  }, 0);

  // Blend
  const alpha = nBooksUsed > 0 ? nBooksUsed / (nBooksUsed + kBlend) : 0;
  const vRaw: Vec = zeroVec();
  (Object.keys(vRaw) as DimensionKey[]).forEach((k) => {
    vRaw[k] = alpha * vBooks[k] + (1 - alpha) * vQuiz[k];
  });

  // Normalize to keep each dimension in [-1,1] (soft scaling)
  const maxAbs = Math.max(
    1,
    ...(Object.keys(vRaw) as DimensionKey[]).map((k) => Math.abs(vRaw[k]))
  );
  const dimensions: Dimension[] = dimensionsMeta.map((d) => ({
    key: d.key as DimensionKey,
    label: d.label,
    value: clamp(vRaw[d.key as DimensionKey] / maxAbs, -1, 1),
  }));

  // Magnitudes
  const vecNorm = Math.sqrt((Object.keys(vRaw) as DimensionKey[]).reduce((s, k) => s + vRaw[k] * vRaw[k], 0));
  const booksNorm = Math.sqrt((Object.keys(vBooks) as DimensionKey[]).reduce((s, k) => s + vBooks[k] * vBooks[k], 0));
  const quizNorm = Math.sqrt((Object.keys(vQuiz) as DimensionKey[]).reduce((s, k) => s + vQuiz[k] * vQuiz[k], 0));

  // Strength based on total weight
  const W = wBooksSum + qSum;
  const S = Math.min(1, Math.log1p(W) / Math.log1p(30));

  // Coherence from source agreement (if both present)
  let coherence = 0.8; // default moderate coherence
  if (booksNorm > 0 && quizNorm > 0) {
    const cos = cosine(vBooks, vQuiz);
    coherence = 0.5 + 0.5 * Math.max(0, cos); // [0.5,1]
  }

  // Amplitude considers norm (directional strength), strength and coherence
  const normFactor = Math.min(1, vecNorm); // squash
  const amplitude = clamp(normFactor * S * coherence, 0, 1);

  // Confidence from sample sizes and agreement
  const confBooks = Math.min(1, Math.sqrt(nBooksUsed / 20));
  const confQuiz = Math.min(1, Math.sqrt(nQuizUsed / 36));
  let agreementPenalty = 0.85;
  if (booksNorm > 0 && quizNorm > 0) {
    const cos = cosine(vBooks, vQuiz); // [-1,1]
    agreementPenalty = 1 - 0.5 * (1 - Math.max(-1, Math.min(1, cos))); // [0.5,1]
  }
  const confidence = clamp(Math.max(confBooks, confQuiz) * agreementPenalty, 0, 1);

  return {
    dimensions,
    amplitude,
    confidence,
    sourceWeights: { books: alpha, quiz: 1 - alpha },
  };
}
