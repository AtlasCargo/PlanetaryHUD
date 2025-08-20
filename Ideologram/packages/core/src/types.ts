export type DimensionKey =
  | 'econ_lr' // Economic: state/planned (-1) ↔ market/capital (+1)
  | 'cult_libcon' // Cultural: progressive/open (-1) ↔ traditional/conserving (+1)
  | 'auth_lib' // Authority: authoritarian (-1) ↔ libertarian (+1)
  | 'global_local' // Scope: cosmopolitan/universal (-1) ↔ national/particular (+1)
  | 'tech_prog' // Tech/Progress: precaution/conserve (-1) ↔ techno-optimist/growth (+1)
  | 'epistemic_rat'; // Epistemic: intuition/tradition (-1) ↔ rationalist/evidential (+1)

export type Dimension = {
  key: DimensionKey;
  label: string;
  value: number; // [-1, 1]
};

export type IdeologyVector = {
  dimensions: Dimension[];
  amplitude: number; // [0,1]
  confidence: number; // [0,1]
  sourceWeights: { books: number; quiz: number };
};

export type BookInput = {
  title: string;
  author?: string;
  rating?: number; // 1..5
  isbn?: string;
  year?: number; // 4-digit
  representative?: number; // [0,1]
  dateRead?: string; // ISO date
  shelves?: string[]; // lowercased shelf names from Goodreads
  source?: 'goodreads' | 'manual' | string;
  // Reading status normalization
  readingStatus?: 'read' | 'to-read' | 'currently-reading' | string;
  isRead?: boolean; // derived: true if readingStatus == 'read' or dateRead present
  // Optional explicit fiction override from user/UI
  isFiction?: boolean;
};

export type BookAnchor = {
  id?: string; // e.g., OLID
  title: string;
  author?: string;
  isbn?: string;
  axes: Record<DimensionKey, number>; // [-1,1]
  weight?: number; // κ_i in [0,1]
  tags?: string[];
};

export type QuizItemLoading = {
  id: string; // item id
  axes: Partial<Record<DimensionKey, number>>; // [-1,1]
  quality?: number; // [0,1]
  reverse?: boolean;
};

export type QuizResponse = {
  id: string; // item id
  answer: 1 | 2 | 3 | 4 | 5; // Likert
};

export type ComputeOptions = {
  kBlend?: number; // k in α = n_books / (n_books + k)
  recencyHalfLifeYears?: number; // for decay
  // Fiction handling
  fictionPolicy?: 'discount' | 'ignore' | 'allow';
  fictionBaseWeight?: number; // base discount applied to fiction (0..1), default 0.2
  fictionThresholdCount?: number; // count threshold to lift discount, default 8
  fictionWhitelistTitles?: string[]; // special works allowed at full weight
  // Book selection
  includeUnreadBooks?: boolean; // default false; when true, includes books without isRead/dateRead
};

export const defaultDimensions: Omit<Dimension, 'value'>[] = [
  { key: 'econ_lr', label: 'Economic: Market vs State' },
  { key: 'cult_libcon', label: 'Cultural: Progressive vs Traditional' },
  { key: 'auth_lib', label: 'Authority: Libertarian vs Authoritarian' },
  { key: 'global_local', label: 'Scope: Cosmopolitan vs Particular' },
  { key: 'tech_prog', label: 'Tech: Progress vs Precaution' },
  { key: 'epistemic_rat', label: 'Epistemic: Rationalist vs Traditional' },
];
