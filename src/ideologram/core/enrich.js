// Simplified Ideologram enrichment functionality - bundled directly into the project

// Topic to axes mapping
export const TOPIC_TO_AXES = {
  'economics': ['economic_lr'],
  'politics': ['politicalness'],
  'religion': ['religiousness'],
  'environment': ['environmentalism'],
  'social': ['social_lr']
};

// Map topics to ideology axes
export function mapTopicsToAxes(topics) {
  const axes = {};
  topics.forEach(topic => {
    const mappedAxes = TOPIC_TO_AXES[topic.toLowerCase()] || [];
    mappedAxes.forEach(axis => {
      axes[axis] = (axes[axis] || 0) + 1;
    });
  });
  return axes;
}

// Enrich book with metadata
export async function enrichBook(book) {
  try {
    // Simulate Open Library API call
    const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(book.title + ' ' + book.author)}`);
    const data = await response.json();
    
    if (data.docs && data.docs.length > 0) {
      const work = data.docs[0];
      return {
        ...book,
        enriched: true,
        openLibrary: {
          key: work.key,
          title: work.title,
          author: work.author_name?.[0] || book.author,
          subjects: work.subject || [],
          publishYear: work.first_publish_year
        }
      };
    }
    
    return { ...book, enriched: false };
  } catch (error) {
    console.error('Enrichment failed:', error);
    return { ...book, enriched: false };
  }
}
