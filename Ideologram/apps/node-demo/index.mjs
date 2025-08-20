// Simple Node demo to compute an ideologram using built core package
// Ensure core is built before running (root dev script takes care of it)
import { computeIdeologram, SAMPLE_ANCHORS, SAMPLE_QUIZ_LOADINGS } from '../../packages/core/dist/index.js';

const books = [
  { title: 'The Road to Serfdom', rating: 5, representative: 1, year: 2020 },
  { title: 'The Communist Manifesto', rating: 1, representative: 1 },
  { title: 'Atlas Shrugged', rating: 4, representative: 0.8 },
];

// Create neutral-ish quiz answers for the sample items
const quizResponses = SAMPLE_QUIZ_LOADINGS.map((q) => ({ id: q.id, answer: 3 }));

const result = computeIdeologram({
  books,
  anchors: SAMPLE_ANCHORS,
  quizResponses,
  quizLoadings: SAMPLE_QUIZ_LOADINGS,
});

console.log('\nIdeologram result:');
console.log(JSON.stringify(result, null, 2));
