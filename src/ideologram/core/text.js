// Simplified text analysis functionality - bundled directly into the project

// Default lexicon for text analysis
export const DEFAULT_LEXICON = {
  economic: ['economy', 'market', 'capitalism', 'socialism', 'money', 'trade', 'business'],
  political: ['government', 'politics', 'democracy', 'authority', 'power', 'election'],
  social: ['society', 'community', 'culture', 'tradition', 'progress', 'change'],
  religious: ['religion', 'god', 'faith', 'spiritual', 'divine', 'sacred'],
  environmental: ['environment', 'nature', 'climate', 'sustainability', 'ecology']
};

// Analyze text for ideological content
export function analyzeTextLexical(text, options = {}) {
  const lexicon = options.lexicon || DEFAULT_LEXICON;
  const results = {};
  
  const textLower = text.toLowerCase();
  
  Object.keys(lexicon).forEach(category => {
    const words = lexicon[category];
    let count = 0;
    
    words.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = textLower.match(regex);
      if (matches) {
        count += matches.length;
      }
    });
    
    results[category] = count;
  });
  
  // Calculate overall politicalness score
  const totalWords = Object.values(results).reduce((sum, count) => sum + count, 0);
  results.politicalness = totalWords > 0 ? Math.min(1, totalWords / 10) : 0;
  
  return {
    metrics: results,
    text: text.substring(0, 200) + '...',
    wordCount: text.split(/\s+/).length
  };
}
