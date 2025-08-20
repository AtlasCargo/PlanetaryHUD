// Simplified Ideologram compute functionality - bundled directly into the project

// Sample anchors for ideology computation
export const SAMPLE_ANCHORS = [
  {
    id: 'communist-manifesto',
    title: 'The Communist Manifesto',
    author: 'Karl Marx',
    ideologyVector: {
      economic_lr: -0.9,
      social_lr: -0.8,
      politicalness: 0.9,
      religiousness: -0.7,
      environmentalism: 0.3
    }
  },
  {
    id: 'atlas-shrugged',
    title: 'Atlas Shrugged',
    author: 'Ayn Rand',
    ideologyVector: {
      economic_lr: 0.9,
      social_lr: 0.7,
      politicalness: 0.8,
      religiousness: -0.3,
      environmentalism: -0.6
    }
  }
];

// Default dimensions
const defaultDimensions = {
  economic_lr: { min: -1, max: 1, neutral: 0 },
  social_lr: { min: -1, max: 1, neutral: 0 },
  politicalness: { min: 0, max: 1, neutral: 0.5 },
  religiousness: { min: -1, max: 1, neutral: 0 },
  environmentalism: { min: -1, max: 1, neutral: 0 }
};

// Clamp function
const clamp = (x, min, max) => Math.max(min, Math.min(max, x));

// Compute ideology vector from books and quiz responses
export function computeIdeologram(input) {
  const { books = [], quizResponses = [] } = input;
  
  // Initialize result vector
  const result = {};
  Object.keys(defaultDimensions).forEach(dim => {
    result[dim] = 0;
  });
  
  // Process books
  books.forEach(book => {
    if (book.ideologyVector) {
      Object.keys(book.ideologyVector).forEach(dim => {
        if (result.hasOwnProperty(dim)) {
          result[dim] += book.ideologyVector[dim] * (book.weight || 1);
        }
      });
    }
  });
  
  // Process quiz responses
  quizResponses.forEach(response => {
    if (response.dimension && response.value !== undefined) {
      const dim = response.dimension;
      if (result.hasOwnProperty(dim)) {
        result[dim] += response.value * (response.weight || 1);
      }
    }
  });
  
  // Normalize and clamp results
  Object.keys(result).forEach(dim => {
    result[dim] = clamp(result[dim], defaultDimensions[dim].min, defaultDimensions[dim].max);
  });
  
  return result;
}
