export function computeWeightedAverage(history) {
  if (!history || history.length === 0) return null;
  const dimensions = ['economic_literacy', 'philosophical_sophistication', 'scientific_literacy', 'psychological_insight', 'historical_perspective'];
  const weightedScores = {};
  dimensions.forEach((dimension) => {
    let weightedSum = 0;
    let totalWeight = 0;
    history.forEach((assessment, index) => {
      const weight = Math.pow(0.8, index);
      if (assessment.scores[dimension]) {
        weightedSum += assessment.scores[dimension].score * weight;
        totalWeight += weight;
      }
    });
    if (totalWeight > 0) {
      weightedScores[dimension] = {
        score: weightedSum / totalWeight,
        confidence: history[0]?.scores[dimension]?.overallConfidence || 0,
        lastAssessment: history[0]?.timestamp,
        assessmentCount: history.length,
      };
    }
  });
  return weightedScores;
}

export function computeWorldviewScore(books, quizResponses, credentials, selfAssessment, chatHistory = []) {
  const dimensions = {
    economic_literacy: { score: 0, confidence: 0, sources: [] },
    philosophical_sophistication: { score: 0, confidence: 0, sources: [] },
    scientific_literacy: { score: 0, confidence: 0, sources: [] },
    psychological_insight: { score: 0, confidence: 0, sources: [] },
    historical_perspective: { score: 0, confidence: 0, sources: [] },
  };
  if (books && books.length > 0) {
    books.forEach((book) => {
      const enriched = book.enriched;
      if (enriched && enriched.topics) {
        enriched.topics.forEach((topic) => {
          const lowerTopic = topic.toLowerCase();
          if (lowerTopic.includes('economics') || lowerTopic.includes('capitalism') || lowerTopic.includes('socialism')) {
            dimensions.economic_literacy.score += 0.3;
            dimensions.economic_literacy.confidence += 0.2;
            dimensions.economic_literacy.sources.push(`Book: ${book.title}`);
          }
          if (lowerTopic.includes('philosophy') || lowerTopic.includes('ethics') || lowerTopic.includes('epistemology')) {
            dimensions.philosophical_sophistication.score += 0.4;
            dimensions.philosophical_sophistication.confidence += 0.3;
            dimensions.philosophical_sophistication.sources.push(`Book: ${book.title}`);
          }
          if (lowerTopic.includes('physics') || lowerTopic.includes('science') || lowerTopic.includes('biology')) {
            dimensions.scientific_literacy.score += 0.3;
            dimensions.scientific_literacy.confidence += 0.2;
            dimensions.scientific_literacy.sources.push(`Book: ${book.title}`);
          }
          if (lowerTopic.includes('psychology') || lowerTopic.includes('behavior') || lowerTopic.includes('motivation')) {
            dimensions.psychological_insight.score += 0.3;
            dimensions.psychological_insight.confidence += 0.2;
            dimensions.psychological_insight.sources.push(`Book: ${book.title}`);
          }
          if (lowerTopic.includes('history') || lowerTopic.includes('civilization') || lowerTopic.includes('war')) {
            dimensions.historical_perspective.score += 0.3;
            dimensions.historical_perspective.confidence += 0.2;
            dimensions.historical_perspective.sources.push(`Book: ${book.title}`);
          }
        });
      }
    });
  }
  if (quizResponses && quizResponses.length > 0) {
    quizResponses.forEach((qr) => {
      const normalize = (v) => Math.max(-1, Math.min(1, (Number(qr.answer) - 3) / 2));
      dimensions.economic_literacy.score += normalize(qr.answer) * 0.1;
      dimensions.economic_literacy.confidence += 0.05;
      dimensions.philosophical_sophistication.score += normalize(qr.answer) * 0.1;
      dimensions.philosophical_sophistication.confidence += 0.05;
      dimensions.scientific_literacy.score += normalize(qr.answer) * 0.1;
      dimensions.scientific_literacy.confidence += 0.05;
      dimensions.psychological_insight.score += normalize(qr.answer) * 0.1;
      dimensions.psychological_insight.confidence += 0.05;
      dimensions.historical_perspective.score += normalize(qr.answer) * 0.1;
      dimensions.historical_perspective.confidence += 0.05;
    });
  }
  if (credentials) {
    if (credentials.educationLevel) {
      const eduFactor = Math.min(1, credentials.educationLevel / 5);
      dimensions.philosophical_sophistication.score += eduFactor * 0.2;
      dimensions.scientific_literacy.score += eduFactor * 0.2;
      dimensions.historical_perspective.score += eduFactor * 0.2;
    }
    if (credentials.publications) {
      const pubFactor = Math.min(1, credentials.publications / 10);
      dimensions.philosophical_sophistication.score += pubFactor * 0.1;
      dimensions.scientific_literacy.score += pubFactor * 0.1;
    }
  }
  if (selfAssessment) {
    const fields = ['economic_literacy', 'philosophical_sophistication', 'scientific_literacy', 'psychological_insight', 'historical_perspective'];
    fields.forEach((f) => {
      if (typeof selfAssessment[f] === 'number') {
        const v = Math.max(-1, Math.min(1, selfAssessment[f]));
        dimensions[f].score = dimensions[f].score * 0.7 + v * 0.3;
        dimensions[f].confidence = Math.min(1, dimensions[f].confidence + 0.1);
        dimensions[f].sources.push('Self-assessment');
      }
    });
  }
  if (chatHistory && chatHistory.length > 0) {
    const content = chatHistory.map((m) => m.content.toLowerCase()).join(' ');
    const contains = (k) => content.includes(k);
    if (contains('economy') || contains('inflation') || contains('market')) dimensions.economic_literacy.score += 0.1;
    if (contains('ethics') || contains('metaphysics') || contains('logic')) dimensions.philosophical_sophistication.score += 0.1;
    if (contains('experiment') || contains('hypothesis') || contains('quantum')) dimensions.scientific_literacy.score += 0.1;
    if (contains('cognitive') || contains('emotion') || contains('therapy')) dimensions.psychological_insight.score += 0.1;
    if (contains('empire') || contains('revolution') || contains('ancient')) dimensions.historical_perspective.score += 0.1;
  }
  Object.keys(dimensions).forEach((dimension) => {
    dimensions[dimension].score = Math.max(-1, Math.min(1, dimensions[dimension].score));
    dimensions[dimension].confidence = Math.min(1, dimensions[dimension].confidence);
    const dataPoints = dimensions[dimension].sources.length;
    dimensions[dimension].overallConfidence = Math.min(1, dimensions[dimension].confidence * (1 + dataPoints * 0.1));
  });
  return dimensions;
}



