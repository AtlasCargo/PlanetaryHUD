import type { DimensionKey } from './types.js';

export type LexicalMetrics = {
  politicalness: number;
  ideologicalness: number;
  educatedness: number;
  religiousness: number;
  romanticalness: number;
  positivity: number; // naive sentiment in [-1,1]
};

export type Lexicon = {
  axes: Record<string, Partial<Record<DimensionKey, number>>>; // term -> axis loadings
  metrics: Record<string, Partial<LexicalMetrics>>; // term -> metric loadings
  positive?: Set<string>;
  negative?: Set<string>;
  indicative?: Set<string>; // for co-occurrence boost
};

const DEFAULT_STOPWORDS = new Set<string>([
  'the','a','an','and','or','but','if','then','else','to','of','in','on','for','with','as','by','at','from','that','this','it','is','are','was','were','be','been','being','i','you','he','she','they','we','them','us','our','your','their','my','mine','yours','theirs','his','her','its','not','no','yes','do','did','does','doing','done','can','could','may','might','must','should','would','will','shall','about','into','over','under','after','before','between','among','than','such','one','two','three','also','more','most','some','any'
]);

const AXIS_LEXICON: Record<string, Partial<Record<DimensionKey, number>>> = {
  // Econ
  'capitalism': { econ_lr: 0.7 },
  'free market': { econ_lr: 0.6 },
  'libertarianism': { econ_lr: 0.4, auth_lib: 0.6 },
  'privatization': { econ_lr: 0.5 },
  'socialism': { econ_lr: -0.7 },
  'communism': { econ_lr: -0.8, auth_lib: -0.2 },
  'planned economy': { econ_lr: -0.6 },
  'taxation': { econ_lr: -0.2 },
  // Authority
  'anarchism': { auth_lib: 0.8 },
  'surveillance': { auth_lib: -0.4 },
  'law and order': { auth_lib: -0.3, cult_libcon: 0.2 },
  // Cultural
  'conservatism': { cult_libcon: 0.6 },
  'traditionalism': { cult_libcon: 0.5 },
  'progressivism': { cult_libcon: -0.6 },
  'feminism': { cult_libcon: -0.5 },
  'woke': { cult_libcon: -0.5 },
  // Scope
  'nationalism': { global_local: 0.7 },
  'patriotism': { global_local: 0.4 },
  'globalization': { global_local: -0.5 },
  'cosmopolitanism': { global_local: -0.6 },
  // Tech
  'environmentalism': { tech_prog: -0.5 },
  'degrowth': { tech_prog: -0.6 },
  'transhumanism': { tech_prog: 0.6 },
  'innovation': { tech_prog: 0.3 },
  // Epistemic
  'rationalism': { epistemic_rat: 0.7 },
  'empiricism': { epistemic_rat: 0.6 },
  'scientific method': { epistemic_rat: 0.6 },
  'scripture': { epistemic_rat: -0.3 },
};

const METRIC_LEXICON: Record<string, Partial<LexicalMetrics>> = {
  // Politicalness
  'government': { politicalness: 1 },
  'policy': { politicalness: 0.9 },
  'state': { politicalness: 0.7 },
  'election': { politicalness: 1 },
  'constitution': { politicalness: 0.9 },
  'parliament': { politicalness: 0.9 },
  'law': { politicalness: 0.7 },
  'rights': { politicalness: 0.7 },
  'party': { politicalness: 0.6 },
  // Ideologicalness
  'ideology': { ideologicalness: 1 },
  'liberalism': { ideologicalness: 1 },
  'conservatism': { ideologicalness: 1 },
  'socialism': { ideologicalness: 1 },
  'libertarianism': { ideologicalness: 1 },
  'nationalism': { ideologicalness: 0.9 },
  // Educatedness
  'theorem': { educatedness: 0.9 },
  'empirical': { educatedness: 0.8 },
  'hypothesis': { educatedness: 0.8 },
  'epistemology': { educatedness: 1 },
  'methodology': { educatedness: 0.8 },
  'citation': { educatedness: 0.7 },
  'bibliography': { educatedness: 0.7 },
  // Religiousness
  'god': { religiousness: 1 },
  'faith': { religiousness: 0.9 },
  'religion': { religiousness: 0.9 },
  'church': { religiousness: 0.8 },
  'bible': { religiousness: 0.9 },
  'quran': { religiousness: 0.9 },
  'prayer': { religiousness: 0.8 },
  // Romanticalness
  'love': { romanticalness: 1 },
  'romance': { romanticalness: 1 },
  'kiss': { romanticalness: 0.8 },
  'beloved': { romanticalness: 0.8 },
  'lover': { romanticalness: 0.8 },
  'passion': { romanticalness: 0.7 },
};

const POSITIVE = new Set<string>(['good','great','excellent','positive','success','benefit','improve','progress','love','freedom']);
const NEGATIVE = new Set<string>(['bad','poor','terrible','negative','failure','harm','decline','crisis','hate','oppression']);

const INDICATIVE = new Set<string>([
  'government','policy','election','ideology','liberalism','conservatism','socialism','libertarianism','nationalism','empirical','epistemology','god','faith','romance','love'
]);

export const DEFAULT_LEXICON: Lexicon = {
  axes: AXIS_LEXICON,
  metrics: METRIC_LEXICON,
  positive: POSITIVE,
  negative: NEGATIVE,
  indicative: INDICATIVE,
};

export type AnalyzeTextOptions = {
  lexicon?: Lexicon;
  stopwords?: Set<string>;
  coocWindow?: number; // token window for co-occurrence
};

export type AnalyzeTextResult = {
  axes: Partial<Record<DimensionKey, number>>;
  metrics: LexicalMetrics;
  tokenCount: number;
  termHits: Record<string, number>;
  axisTermContribs: Record<string, Partial<Record<DimensionKey, number>>>;
  metricTermContribs: Record<string, Partial<LexicalMetrics>>;
};

function tokenize(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z\s\-']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return tokens;
}

function ngram(tokens: string[], i: number, n: number): string {
  return tokens.slice(i, i + n).join(' ').trim();
}

export function analyzeTextLexical(text: string, opts?: AnalyzeTextOptions): AnalyzeTextResult {
  const lex = opts?.lexicon ?? DEFAULT_LEXICON;
  const stop = opts?.stopwords ?? DEFAULT_STOPWORDS;
  const coocWindow = Math.max(2, Math.min(50, opts?.coocWindow ?? 12));

  const axes: Partial<Record<DimensionKey, number>> = {};
  const metrics: LexicalMetrics = {
    politicalness: 0,
    ideologicalness: 0,
    educatedness: 0,
    religiousness: 0,
    romanticalness: 0,
    positivity: 0,
  };
  const termHits: Record<string, number> = {};
  const axisTermContribs: Record<string, Partial<Record<DimensionKey, number>>> = {};
  const metricTermContribs: Record<string, Partial<LexicalMetrics>> = {};

  const tokens = tokenize(text);
  const filtered = tokens.filter((t) => !stop.has(t));
  const N = filtered.length || 1;

  // Sentiment baseline
  let pos = 0, neg = 0;

  // Match unigrams and bigrams against lexicons
  for (let i = 0; i < filtered.length; i++) {
    const w1 = filtered[i];
    const w2 = ngram(filtered, i, 2);
    const w3 = ngram(filtered, i, 3);
    const candidates = [w3, w2, w1];

    // Sentiment
    if (lex.positive?.has(w1)) pos += 1;
    if (lex.negative?.has(w1)) neg += 1;

    // Metrics
    for (const cand of candidates) {
      const m = lex.metrics[cand];
      if (m) {
        termHits[cand] = (termHits[cand] ?? 0) + 1;
        for (const k of Object.keys(m) as (keyof LexicalMetrics)[]) {
          metrics[k] += (m[k] || 0);
          (metricTermContribs[cand] ||= {} as Partial<LexicalMetrics>)[k] = ((metricTermContribs[cand]?.[k] as number | undefined) || 0) + (m[k] || 0);
        }
        break; // prefer longest match
      }
    }

    // Axes
    for (const cand of candidates) {
      const a = lex.axes[cand];
      if (a) {
        termHits[cand] = (termHits[cand] ?? 0) + 1;
        for (const k of Object.keys(a) as DimensionKey[]) {
          axes[k] = (axes[k] ?? 0) + (a[k] || 0);
          (axisTermContribs[cand] ||= {} as Partial<Record<DimensionKey, number>>)[k] = ((axisTermContribs[cand]?.[k] as number | undefined) || 0) + (a[k] || 0);
        }
        break;
      }
    }
  }

  // Co-occurrence boost for indicative terms
  const indicIdx: number[] = [];
  for (let i = 0; i < filtered.length; i++) {
    if (lex.indicative?.has(filtered[i])) indicIdx.push(i);
  }
  if (indicIdx.length >= 2) {
    let coocCount = 0;
    for (let i = 0; i < indicIdx.length - 1; i++) {
      if (indicIdx[i + 1] - indicIdx[i] <= coocWindow) coocCount++;
    }
    const boost = Math.min(1, coocCount / Math.max(1, indicIdx.length)) * 0.2; // up to +0.2
    for (const k of Object.keys(metrics) as (keyof LexicalMetrics)[]) {
      metrics[k] *= (1 + boost);
    }
  }

  // Normalize metrics by token count and clamp
  for (const k of Object.keys(metrics) as (keyof LexicalMetrics)[]) {
    metrics[k] = Math.max(0, Math.min(1, metrics[k] / Math.sqrt(N))); // sublinear scaling
  }

  // Sentiment in [-1,1]
  metrics.positivity = Math.max(-1, Math.min(1, (pos - neg) / Math.max(1, pos + neg)));

  // Soft clamp axes to [-1,1]
  for (const k of Object.keys(axes) as DimensionKey[]) {
    const v = axes[k] || 0;
    axes[k] = Math.max(-1, Math.min(1, v / Math.sqrt(N)));
  }

  return { axes, metrics, tokenCount: N, termHits, axisTermContribs, metricTermContribs };
}


